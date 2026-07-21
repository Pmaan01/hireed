import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { pool, ensureTables } from "./src/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.js";
import planRoutes from "./src/routes/plans.js";
import transcriptsRouter from "./src/routes/transcripts.js"; // note the .js extension
import jobMarketProxy from "./src/routes/jobMarketProxy.js";


dotenv.config();

const JOB_MARKET_BASE = process.env.JOB_MARKET_BASE || "http://localhost:5001";
const JOB_MARKET_INTERNAL_KEY = process.env.JOB_MARKET_INTERNAL_KEY || "localdevkey";

// canonical-skill comparisons: RoleTemplate.coreSkills is Title-Case ("Data Visualization"),
// job-market skill keys are snake_case ("data_visualization") — normalize both sides through this
function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function callJobMarket(pathAndQuery, options = {}) {
  const r = await fetch(`${JOB_MARKET_BASE}${pathAndQuery}`, {
    ...options,
    headers: { "Authorization": `Bearer ${JOB_MARKET_INTERNAL_KEY}`, ...(options.headers || {}) }
  });
  if (!r.ok) throw new Error(`job-market ${pathAndQuery} -> ${r.status}`);
  return r.json();
}

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);
app.use(cookieParser(process.env.JWT_SECRET)); // before routes
app.use("/api/transcripts", transcriptsRouter);

app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/job-market", jobMarketProxy); // endpoints become /api/job-market/market/skills etc.

// --- DB connect with non-blocking startup ---
async function connectDB() {
  try {
    await ensureTables();
    console.log("Postgres connected");
  } catch (err) {
    console.warn("Postgres failed:", err.message, "→ continuing without DB");
  }
}

// --- Routes ---

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// List roles from DB
app.get("/api/roles", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT key FROM role_template ORDER BY name");
    return res.json(rows.map(r => r.key));
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch roles", error: err.message });
  }
});

// Generate pathways using DB data
app.post("/api/pathways/generate", async (req, res) => {
  try {
    const {
      credits = "",
      skills = "",
      city = "Vancouver",
      role = "data-analyst"
    } = req.body || {};

    const template = (await pool.query("SELECT * FROM role_template WHERE key=$1", [role])).rows[0];
    if (!template) return res.status(400).json({ message: "Unknown role" });

    const userSkills = String(skills)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const userSkillKeys = new Set(userSkills.map(slugify));

    // canonicalize the uploaded/pasted course credits + typed skills text through the
    // job-market service's shared skill vocabulary, and pull real market demand — both
    // independent reads, each falls back to empty on failure so pathway generation still works
    // if the job-market service is down
    let marketTopSkills = [];
    let marketMissingSkills = [];

    const [extractResult, marketResult] = await Promise.allSettled([
      callJobMarket("/skills/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${credits} ${skills}` })
      }),
      callJobMarket(`/market/skills?limit=15&city=${encodeURIComponent(city)}`)
    ]);

    if (extractResult.status === "fulfilled") {
      for (const key of extractResult.value?.skills || []) userSkillKeys.add(key);
    } else {
      console.warn("skills/extract unavailable:", extractResult.reason?.message);
    }

    if (marketResult.status === "fulfilled") {
      marketTopSkills = (marketResult.value?.top || []).map(r => r.skill);
      marketMissingSkills = marketTopSkills.filter(k => !userSkillKeys.has(k));
    } else {
      console.warn("market/skills unavailable:", marketResult.reason?.message);
    }

    const gaps = template.core_skills.filter(s => !userSkillKeys.has(slugify(s)));

    // pull candidate courses — node-pg returns `numeric` columns as strings (arbitrary
    // precision), so cost needs an explicit Number() or every += below silently string-concats
    const allCourses = (await pool.query("SELECT * FROM course WHERE $1 = ANY(role_keys)", [role]))
      .rows.map(c => ({ ...c, cost: Number(c.cost) }));

    // naive planner: for each missing skill, pick cheapest matching course
    const courseBySkill = {};
    for (const g of gaps) {
      const options = allCourses
        .filter(c =>
          c.covers_skills.map(x => x.toLowerCase()).includes(g.toLowerCase())
        )
        .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
      if (options[0]) courseBySkill[g] = options[0];
    }

    // duration/step text scale with the actual role and how many skills are missing,
    // instead of fixed data-analyst-flavored strings that showed up for every role
    const gapCount = gaps.length;
    const projects = template.projects || [];

    const transferDuration = Math.min(12, 4 + gapCount);
    const transferPath = {
      id: "transfer",
      title: "Transfer-heavy path",
      durationMonths: transferDuration,
      estCost: Object.values(courseBySkill).reduce(
        (sum, c) => sum + (c.cost ?? 0),
        0
      ),
      steps: [
        "Map existing credits to stats/econ equivalents",
        ...Object.entries(courseBySkill).map(
          ([skill, c]) => `Take ${c.title} for ${skill}`
        ),
        `Capstone: ${projects[projects.length - 1] || `${template.name} capstone project`}`
      ]
    };

    const bootcamp = allCourses.find(c => c.mode === "bootcamp");
    const bootcampDuration = Math.max(2, Math.min(6, Math.ceil(gapCount / 2) + 1));
    const bootcampPath = {
      id: "bootcamp",
      title: "Bootcamp path",
      durationMonths: bootcampDuration,
      estCost: bootcamp?.cost ?? 3500,
      steps: [
        `Join a ${template.name} bootcamp`,
        `Portfolio project: ${projects[0] || `${template.name} project`}`,
        "Mock interviews"
      ]
    };

    const hybridPath = {
      id: "hybrid",
      title: "Hybrid path",
      durationMonths: Math.round((transferDuration + bootcampDuration) / 2),
      estCost: Math.round(
        ((transferPath.estCost ?? 0) + (bootcamp?.cost ?? 3500)) / 2
      ),
      steps: [
        `Self-paced study: ${gaps.slice(0, 3).join(", ") || "core skills"}`,
        `Capstone: ${projects[1] || projects[0] || `${template.name} project`}`,
        "Build a public portfolio profile"
      ]
    };

    // find university programs covering whichever skills are actually missing (curated
    // role gaps + real market demand gaps) — depends on the gaps/marketMissingSkills
    // computed above, so this runs after they're settled, not in the earlier allSettled batch
    let recommendedPrograms = [];
    try {
      const combinedSkillKeys = Array.from(
        new Set([...gaps.map(slugify), ...marketMissingSkills])
      );
      if (combinedSkillKeys.length) {
        const uniResult = await callJobMarket(
          `/universities?skills=${encodeURIComponent(combinedSkillKeys.join(","))}&city=${encodeURIComponent(city)}`
        );
        recommendedPrograms = uniResult?.universities || [];
      }
    } catch (err) {
      console.warn("universities unavailable:", err.message);
    }

    // Save snapshot for analytics if DB is live
    try {
      await pool.query(
        "INSERT INTO user_profile (credits, skills, city, role) VALUES ($1,$2,$3,$4)",
        [
          String(credits).split(",").map(s => s.trim()).filter(Boolean),
          userSkills,
          city,
          role
        ]
      );
    } catch {
      // ignore write errors in MVP
    }

    return res.json({
      role,
      requiredSkills: template.core_skills,
      missingSkills: gaps,
      recommendedProjects: template.projects,
      pathways: [transferPath, bootcampPath, hybridPath],
      jobsPreview: { city, count: 0, note: "Wire real job feed later" },
      marketTopSkills,
      marketMissingSkills,
      recommendedPrograms
    });
  } catch (err) {
    return res.status(500).json({ message: "Pathway generation failed", error: err.message });
  }
});

// --- Boot ---
const port = process.env.PORT || 4000;
await connectDB();
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
