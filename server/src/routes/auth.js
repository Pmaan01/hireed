import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();
const requestLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

router.post("/request", requestLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
    return res.status(400).json({ message: "Valid email required" });

  const normalizedEmail = email.toLowerCase();
  const code = ("" + Math.floor(100000 + Math.random() * 900000)).slice(-6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    // Postgres has no TTL index like Mongo did — best-effort sweep of this email's stale codes
    await pool.query(
      "DELETE FROM auth_code WHERE email=$1 AND (used=true OR expires_at < now())",
      [normalizedEmail]
    );
  } catch {
    // non-critical cleanup, ignore
  }

  await pool.query(
    "INSERT INTO auth_code (email, code, expires_at) VALUES ($1,$2,$3)",
    [normalizedEmail, code, expiresAt]
  );

  // dev-friendly: log the code so you can use it without email
  console.log(`[auth] code for ${email}: ${code}`);
  return res.json({ ok: true });
});

router.post("/verify", async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ message: "Email and code required" });

  const normalizedEmail = email.toLowerCase();
  const { rows } = await pool.query(
    "SELECT * FROM auth_code WHERE email=$1 AND code=$2 AND used=false ORDER BY created_at DESC LIMIT 1",
    [normalizedEmail, code]
  );
  const row = rows[0];
  if (!row || row.expires_at < new Date())
    return res.status(400).json({ message: "Invalid or expired code" });

  await pool.query("UPDATE auth_code SET used=true WHERE id=$1", [row.id]);

  const { rows: userRows } = await pool.query(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [normalizedEmail]
  );
  const user = userRows[0];

  const token = jwt.sign({ uid: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true, sameSite: "lax",
    secure: false, // true in prod with HTTPS
    signed: true, maxAge: 30 * 24 * 60 * 60 * 1000
  });
  return res.json({ ok: true, user: { id: user.id, email: user.email } });
});

// cheap "me" endpoint: just verifies cookie and returns payload
router.get("/me", (req, res) => {
  try {
    const raw = req.signedCookies?.token;
    if (!raw) return res.json({ user: null });
    const payload = jwt.verify(raw, process.env.JWT_SECRET);
    return res.json({ user: { id: payload.uid, email: payload.email } });
  } catch {
    return res.json({ user: null });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token"); return res.json({ ok: true });
});

export default router;
