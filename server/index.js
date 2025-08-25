import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import RoleTemplate from "./src/models/RoleTemplate.js";
import Course from "./src/models/Course.js";
import UserProfile from "./src/models/UserProfile.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);

// --- DB connect with non-blocking startup ---
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI missing → starting without DB");
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("Mongo connected");
  } catch (err) {
    console.warn("Mongo failed:", err.message, "→ continuing without DB");
  }
}

// --- Routes ---

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// List roles from DB
app.get("/api/roles", async (_req, res) => {
  try {
    const roles = await RoleTemplate.find({}, { _id: 0, key: 1, name: 1 }).lean();
    return res.json(roles.map(r => r.key));
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

    const template = await RoleTemplate.findOne({ key: role }).lean();
    if (!template) return res.status(400).json({ message: "Unknown role" });

    const userSkills = String(skills)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const lower = new Set(userSkills.map(s => s.toLowerCase()));
    const gaps = template.coreSkills.filter(s => !lower.has(s.toLowerCase()));

    // pull candidate courses
    const allCourses = await Course.find({ roleKeys: role }).lean();

    // naive planner: for each missing skill, pick cheapest matching course
    const courseBySkill = {};
    for (const g of gaps) {
      const options = allCourses
        .filter(c =>
          c.coversSkills.map(x => x.toLowerCase()).includes(g.toLowerCase())
        )
        .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
      if (options[0]) courseBySkill[g] = options[0];
    }

    const transferPath = {
      id: "transfer",
      title: "Transfer-heavy path",
      durationMonths: 6,
      estCost: Object.values(courseBySkill).reduce(
        (sum, c) => sum + (c.cost ?? 0),
        0
      ),
      steps: [
        "Map existing credits to stats/econ equivalents",
        ...Object.entries(courseBySkill).map(
          ([skill, c]) => `Take ${c.title} for ${skill}`
        ),
        "Capstone: SQL + Tableau dashboard"
      ]
    };

    const bootcamp = allCourses.find(c => c.mode === "bootcamp");
    const bootcampPath = {
      id: "bootcamp",
      title: "Bootcamp path",
      durationMonths: 3,
      estCost: bootcamp?.cost ?? 3500,
      steps: ["Join Data Analyst bootcamp", "Portfolio sprints", "Mock interviews"]
    };

    const hybridPath = {
      id: "hybrid",
      title: "Hybrid path",
      durationMonths: 4,
      estCost: Math.round(
        ((transferPath.estCost ?? 0) + (bootcamp?.cost ?? 3500)) / 2
      ),
      steps: ["Self-paced Python/SQL", "Public-data capstone", "Tableau Public profile"]
    };

    // Save snapshot for analytics if DB is live
    try {
      if (mongoose.connection.readyState === 1) {
        await UserProfile.create({
          credits: String(credits)
            .split(",")
            .map(s => s.trim())
            .filter(Boolean),
          skills: userSkills,
          city,
          role
        });
      }
    } catch {
      // ignore write errors in MVP
    }

    return res.json({
      role,
      requiredSkills: template.coreSkills,
      missingSkills: gaps,
      recommendedProjects: template.projects,
      pathways: [transferPath, bootcampPath, hybridPath],
      jobsPreview: { city, count: 0, note: "Wire real job feed later" }
    });
  } catch (err) {
    return res.status(500).json({ message: "Pathway generation failed", error: err.message });
  }
});

// --- Boot ---
const port = process.env.PORT || 4000;
await connectDB();
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
