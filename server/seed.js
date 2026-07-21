// server/seed.js
import dotenv from "dotenv";
import { pool, ensureTables } from "./src/db.js";

dotenv.config();

// 1) Add roles here
const roles = [
  {
    key: "data-analyst",
    name: "Data Analyst",
    coreSkills: ["Python", "SQL", "Tableau", "Excel", "Data Visualization"],
    projects: [
      "Exploratory data analysis in Python with pandas",
      "SQL join-heavy analysis on public dataset",
      "Tableau dashboard with filters and calculated fields"
    ]
  },
  {
    key: "cybersecurity-analyst",
    name: "Cybersecurity Analyst",
    coreSkills: ["Networking", "Linux", "SIEM", "Threat Detection", "Python"],
    projects: [
      "Set up a home lab with a SIEM and ingest logs",
      "Write detection rules for common attack patterns",
      "Incident report from a simulated breach"
    ]
  },
  {
    key: "ai-ops",
    name: "AI Ops",
    coreSkills: ["Python", "LLM Basics", "APIs", "Vector DB", "Prompt Engineering"],
    projects: [
      "Build a retrieval-augmented QA bot on your notes",
      "Evaluate prompt variants for accuracy and latency",
      "Pipeline to monitor and log model outputs"
    ]
  },
  {
    key: "full-stack-developer",
    name: "Full-Stack Developer",
    coreSkills: ["JavaScript", "React", "Node.js", "REST", "SQL"],
    projects: [
      "CRUD app with auth and role-based access",
      "Responsive UI with routing and form validation",
      "Deploy to Render/Vercel with CI"
    ]
  },
  {
    key: "cloud-engineer",
    name: "Cloud Engineer",
    coreSkills: ["Linux", "AWS", "IaC", "Containers", "Networking"],
    projects: [
      "Terraform + AWS VPC + EC2 + RDS",
      "Dockerize a service and push to ECR",
      "Set up monitoring and alerts"
    ]
  }
];

// 2) Courses mapped to one or more role keys
const courses = [
  // Data Analyst
  {
    title: "Google Data Analytics",
    provider: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-data-analytics",
    roleKeys: ["data-analyst"],
    coversSkills: ["Excel", "Data Visualization"],
    mode: "self-paced",
    hours: 120,
    cost: 0
  },
  {
    title: "Intro to SQL",
    provider: "edX",
    url: "https://www.edx.org/learn/sql",
    roleKeys: ["data-analyst", "full-stack-developer"],
    coversSkills: ["SQL"],
    mode: "self-paced",
    hours: 20,
    cost: 0
  },
  {
    title: "Python for Data Analysis",
    provider: "BCIT",
    url: "https://www.bcit.ca/",
    roleKeys: ["data-analyst", "ai-ops"],
    coversSkills: ["Python"],
    mode: "self-paced",
    hours: 40,
    cost: 350
  },
  {
    title: "Tableau Fundamentals",
    provider: "Udemy",
    url: "https://www.udemy.com/",
    roleKeys: ["data-analyst"],
    coversSkills: ["Tableau", "Data Visualization"],
    mode: "self-paced",
    hours: 12,
    cost: 19
  },

  // Cybersecurity
  {
    title: "Introduction to Cybersecurity",
    provider: "Cisco",
    url: "https://www.netacad.com/courses/cybersecurity",
    roleKeys: ["cybersecurity-analyst"],
    coversSkills: ["Networking", "Threat Detection"],
    mode: "self-paced",
    hours: 30,
    cost: 0
  },
  {
    title: "SIEM Fundamentals",
    provider: "TryHackMe",
    url: "https://tryhackme.com/",
    roleKeys: ["cybersecurity-analyst"],
    coversSkills: ["SIEM", "Linux"],
    mode: "self-paced",
    hours: 12,
    cost: 0
  },

  // AI Ops
  {
    title: "Building Systems with the ChatGPT API",
    provider: "DeepLearning.AI",
    url: "https://www.deeplearning.ai/",
    roleKeys: ["ai-ops"],
    coversSkills: ["APIs", "LLM Basics"],
    mode: "self-paced",
    hours: 12,
    cost: 0
  },
  {
    title: "Vector Databases 101",
    provider: "Pinecone",
    url: "https://www.pinecone.io/",
    roleKeys: ["ai-ops"],
    coversSkills: ["Vector DB"],
    mode: "self-paced",
    hours: 6,
    cost: 0
  },

  // Full-stack
  {
    title: "Full-Stack Open",
    provider: "University of Helsinki",
    url: "https://fullstackopen.com/",
    roleKeys: ["full-stack-developer"],
    coversSkills: ["React", "Node.js", "REST", "JavaScript"],
    mode: "self-paced",
    hours: 120,
    cost: 0
  },

  // Cloud
  {
    title: "AWS Certified Cloud Practitioner",
    provider: "AWS",
    url: "https://aws.amazon.com/training/",
    roleKeys: ["cloud-engineer"],
    coversSkills: ["AWS", "Cloud Basics"],
    mode: "self-paced",
    hours: 25,
    cost: 0
  },
  {
    title: "Terraform for Beginners",
    provider: "HashiCorp",
    url: "https://developer.hashicorp.com/terraform",
    roleKeys: ["cloud-engineer"],
    coversSkills: ["IaC"],
    mode: "self-paced",
    hours: 10,
    cost: 0
  }
];

async function run() {
  try {
    console.log("Connecting to Postgres...");
    await ensureTables();
    console.log("Postgres connected");

    // 1) Upsert each role
    for (const r of roles) {
      await pool.query(
        `INSERT INTO role_template (key, name, core_skills, projects)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (key) DO UPDATE SET
           name = EXCLUDED.name,
           core_skills = EXCLUDED.core_skills,
           projects = EXCLUDED.projects`,
        [r.key, r.name, r.coreSkills, r.projects]
      );
      console.log(`RoleTemplate upserted: ${r.key}`);
    }

    // 2) Replace courses for the roles we manage here
    const roleKeys = roles.map(r => r.key);
    await pool.query("DELETE FROM course WHERE role_keys && $1::text[]", [roleKeys]);

    for (const c of courses) {
      await pool.query(
        `INSERT INTO course (title, provider, url, role_keys, covers_skills, mode, hours, cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [c.title, c.provider, c.url, c.roleKeys, c.coversSkills, c.mode, c.hours, c.cost]
      );
    }
    console.log(`Courses inserted: ${courses.length}`);

    // Sanity check
    const sample = await pool.query(
      "SELECT title FROM course WHERE $1 = ANY(role_keys) LIMIT 1",
      ["data-analyst"]
    );
    console.log("Sample course:", sample.rows[0]?.title);

    console.log("Seeding complete.");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
    console.log("Postgres disconnected");
  }
}

run();
