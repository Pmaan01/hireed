// server/routes/jobMarketProxy.js
import express from "express";

const router = express.Router();

const JOB_MARKET_BASE = process.env.JOB_MARKET_BASE || "http://localhost:5001"; // set to your job-market API if you run one
const INTERNAL_KEY = process.env.JOB_MARKET_INTERNAL_KEY || "localdevkey";

// simple passthrough - server should add auth middleware around this route in production
router.get("/market/skills", async (req, res) => {
  try {
    const q = new URL(`${JOB_MARKET_BASE}/market/skills`);
    if (req.query.limit) q.searchParams.set("limit", req.query.limit);
    const fetchRes = await fetch(q.toString(), { headers: { "Authorization": `Bearer ${INTERNAL_KEY}` }});
    const json = await fetchRes.json();
    res.status(fetchRes.status).json(json);
  } catch (err) {
    console.error("proxy /market/skills error", err);
    res.status(500).json({ error: "proxy error" });
  }
});

router.get("/universities", async (req, res) => {
  try {
    const q = new URL(`${JOB_MARKET_BASE}/universities`);
    if (req.query.skills) q.searchParams.set("skills", req.query.skills);
    if (req.query.city) q.searchParams.set("city", req.query.city);
    const fetchRes = await fetch(q.toString(), { headers: { "Authorization": `Bearer ${INTERNAL_KEY}` }});
    const json = await fetchRes.json();
    res.status(fetchRes.status).json(json);
  } catch (err) {
    console.error("proxy /universities error", err);
    res.status(500).json({ error: "proxy error" });
  }
});

router.post("/skills/extract", async (req, res) => {
  try {
    const fetchRes = await fetch(`${JOB_MARKET_BASE}/skills/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    const json = await fetchRes.json();
    res.status(fetchRes.status).json(json);
  } catch (err) {
    console.error("proxy /skills/extract error", err);
    res.status(500).json({ error: "proxy error" });
  }
});

export default router;
