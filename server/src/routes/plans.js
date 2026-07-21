import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

// tiny auth middleware for this route file
router.use((req, res, next) => {
  try {
    const raw = req.signedCookies?.token;
    if (!raw) return res.status(401).json({ message: "Unauthenticated" });
    req.user = jwt.verify(raw, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Unauthenticated" });
  }
});

router.post("/", async (req, res) => {
  const { role, inputs, snapshot } = req.body || {};
  if (!role || !snapshot) return res.status(400).json({ message: "role and snapshot required" });

  const { rows } = await pool.query(
    "INSERT INTO plan (user_id, role, inputs, snapshot) VALUES ($1,$2,$3,$4::jsonb) RETURNING *",
    [req.user.uid, role, JSON.stringify(inputs || {}), JSON.stringify(snapshot)]
  );
  return res.json({ ok: true, plan: rows[0] });
});

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM plan WHERE user_id=$1 ORDER BY updated_at DESC",
    [req.user.uid]
  );
  return res.json({ plans: rows });
});

export default router;
