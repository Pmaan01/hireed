import express from "express";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import stringSimilarity from "string-similarity";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({ host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE });

const SKILL_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "skill_list.json"), "utf8"));

function normalizeText(t) {
  if (!t) return "";
  return String(t).toLowerCase().replace(/[‘’“”]/g, "'").replace(/[^a-z0-9\s\+\#\.\-]/g, " ");
}

// short inputs (a course title, a typed skills box) get exact-alias matching only —
// the fuzzy fallback was tuned against long job-posting text and throws false positives on short strings
function extractSkills(text, { fuzzy = true } = {}) {
  const norm = normalizeText(text);
  const found = {};
  for (const canonical of Object.keys(SKILL_MAP)) {
    const aliases = SKILL_MAP[canonical] || [];
    let score = 0;
    for (const a of aliases) {
      const safe = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${safe}\\b`, "i");
      if (re.test(norm)) {
        score = 100;
        break;
      }
    }
    if (score === 0 && fuzzy) {
      for (const a of aliases) {
        const res = stringSimilarity.findBestMatch(a, [norm]);
        const rating = (res && res.bestMatch && res.bestMatch.rating) ? res.bestMatch.rating : 0;
        const scaled = Math.round(rating * 100);
        if (scaled > score) score = scaled;
      }
    }
    if (score > 0) found[canonical] = score;
  }
  return found;
}

async function ensureTables() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS university (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      city text,
      region text,
      url text
    );
    CREATE TABLE IF NOT EXISTS program (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      university_id uuid REFERENCES university(id),
      name text NOT NULL,
      degree_type text,
      duration_months int,
      cost int,
      skills_taught text[],
      url text
    );
  `);
}

const app = express();
app.use(express.json());

app.get("/market/skills", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const city = req.query.city ? String(req.query.city) : null;
    const q = city
      ? `SELECT key as skill, COUNT(*) as occurrences, AVG((value)::int) as avg_score
         FROM job_posting, jsonb_each_text(parsed_skills)
         WHERE location ILIKE '%' || $2 || '%'
         GROUP BY key ORDER BY occurrences DESC LIMIT $1`
      : `SELECT key as skill, COUNT(*) as occurrences, AVG((value)::int) as avg_score
         FROM job_posting, jsonb_each_text(parsed_skills)
         GROUP BY key ORDER BY occurrences DESC LIMIT $1`;
    const r = await pool.query(q, city ? [limit, city] : [limit]);
    res.json({ top: r.rows });
  } catch (err) {
    console.error("GET /market/skills error", err);
    res.status(500).json({ error: "market/skills failed" });
  }
});

app.post("/skills/extract", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "text required" });
    const found = extractSkills(text, { fuzzy: false });
    res.json({ skills: Object.keys(found) });
  } catch (err) {
    console.error("POST /skills/extract error", err);
    res.status(500).json({ error: "skills/extract failed" });
  }
});

app.get("/universities", async (req, res) => {
  try {
    const skillsParam = req.query.skills ? String(req.query.skills) : "";
    const skills = skillsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (!skills.length) return res.json({ universities: [] });
    const city = req.query.city ? String(req.query.city) : null;

    const q = `
      SELECT u.id as university_id, u.name as university_name, u.city, u.region, u.url as university_url,
             p.id as program_id, p.name as program_name, p.degree_type, p.duration_months, p.cost,
             p.skills_taught, p.url as program_url
      FROM program p
      JOIN university u ON u.id = p.university_id
      WHERE p.skills_taught && $1::text[]
      ORDER BY (CASE WHEN $2::text IS NOT NULL AND u.city ILIKE '%' || $2 || '%' THEN 0 ELSE 1 END), u.name
    `;
    const r = await pool.query(q, [skills, city]);

    const byUniversity = new Map();
    for (const row of r.rows) {
      if (!byUniversity.has(row.university_id)) {
        byUniversity.set(row.university_id, {
          id: row.university_id,
          name: row.university_name,
          city: row.city,
          region: row.region,
          url: row.university_url,
          programs: []
        });
      }
      byUniversity.get(row.university_id).programs.push({
        id: row.program_id,
        name: row.program_name,
        degreeType: row.degree_type,
        durationMonths: row.duration_months,
        cost: row.cost,
        skillsTaught: row.skills_taught,
        url: row.program_url
      });
    }
    res.json({ universities: Array.from(byUniversity.values()) });
  } catch (err) {
    console.error("GET /universities error", err);
    res.status(500).json({ error: "universities failed" });
  }
});

const port = process.env.PORT || 5001;
ensureTables()
  .catch(err => console.warn("ensureTables failed (continuing):", err.message))
  .finally(() => {
    app.listen(port, () => console.log("job-market api listening on port " + port));
  });
