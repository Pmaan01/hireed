/*
  seedUniversities.cjs — seeds BC institutions + programs, tagged with canonical
  skills from skill_list.json, so /universities can match them against missing skills.
  Run with: node seedUniversities.cjs (from this folder, so it picks up job-market/.env)
*/
const { Client } = require("pg");
require("dotenv").config();

const pg = new Client({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "jobdb"
});

const universities = [
  { key: "ubc", name: "University of British Columbia", city: "Vancouver", region: "BC", url: "https://www.ubc.ca/" },
  { key: "sfu", name: "Simon Fraser University", city: "Burnaby", region: "BC", url: "https://www.sfu.ca/" },
  { key: "bcit", name: "British Columbia Institute of Technology", city: "Burnaby", region: "BC", url: "https://www.bcit.ca/" },
  { key: "langara", name: "Langara College", city: "Vancouver", region: "BC", url: "https://langara.ca/" },
  { key: "vcc", name: "Vancouver Community College", city: "Vancouver", region: "BC", url: "https://www.vcc.ca/" },
  { key: "kpu", name: "Kwantlen Polytechnic University", city: "Surrey", region: "BC", url: "https://www.kpu.ca/" },
  { key: "douglas", name: "Douglas College", city: "New Westminster", region: "BC", url: "https://www.douglascollege.ca/" }
];

const programs = [
  { uni: "ubc", name: "Master of Data Science", degreeType: "masters", durationMonths: 10, cost: 40000,
    skillsTaught: ["python", "sql", "etl", "data_visualization"], url: "https://masterdatascience.ubc.ca/" },
  { uni: "ubc", name: "Bachelor of Computer Science", degreeType: "bachelor", durationMonths: 48, cost: 100000,
    skillsTaught: ["javascript", "react", "node_js", "rest", "python"], url: "https://www.cs.ubc.ca/" },

  { uni: "sfu", name: "Professional Master's Program in Computer Science (Big Data)", degreeType: "masters", durationMonths: 20, cost: 35000,
    skillsTaught: ["python", "sql", "etl", "data_visualization"], url: "https://www.sfu.ca/computing/pmp.html" },
  { uni: "sfu", name: "Cybersecurity Micro-Certificate", degreeType: "certificate", durationMonths: 4, cost: 2500,
    skillsTaught: ["networking", "linux", "siem", "threat_detection"], url: "https://www.sfu.ca/continuing-studies.html" },

  { uni: "bcit", name: "Data Analytics, Big Data, and Predictive Analytics Certificate", degreeType: "certificate", durationMonths: 8, cost: 6000,
    skillsTaught: ["sql", "python", "tableau", "power_bi", "data_visualization"], url: "https://www.bcit.ca/programs/" },
  { uni: "bcit", name: "Cybersecurity and Networking Diploma", degreeType: "diploma", durationMonths: 24, cost: 15000,
    skillsTaught: ["networking", "linux", "siem", "threat_detection"], url: "https://www.bcit.ca/programs/" },
  { uni: "bcit", name: "Cloud Computing Diploma", degreeType: "diploma", durationMonths: 24, cost: 15000,
    skillsTaught: ["aws", "azure", "iac", "containers", "linux", "networking"], url: "https://www.bcit.ca/programs/" },
  { uni: "bcit", name: "Full-Stack Web Development Certificate", degreeType: "certificate", durationMonths: 6, cost: 5000,
    skillsTaught: ["javascript", "react", "node_js", "rest"], url: "https://www.bcit.ca/programs/" },
  { uni: "bcit", name: "Applied AI and Machine Learning Diploma", degreeType: "diploma", durationMonths: 12, cost: 12000,
    skillsTaught: ["python", "apis", "llm_basics", "vector_db", "prompt_engineering"], url: "https://www.bcit.ca/programs/" },

  { uni: "langara", name: "Computer Science Diploma", degreeType: "diploma", durationMonths: 24, cost: 9000,
    skillsTaught: ["python", "sql", "javascript"], url: "https://langara.ca/programs-and-courses/" },
  { uni: "langara", name: "Data Analytics Certificate", degreeType: "certificate", durationMonths: 6, cost: 4500,
    skillsTaught: ["excel", "sql", "tableau", "data_visualization"], url: "https://langara.ca/programs-and-courses/" },

  { uni: "vcc", name: "Web and Mobile App Development Diploma", degreeType: "diploma", durationMonths: 18, cost: 9500,
    skillsTaught: ["javascript", "react", "node_js", "rest"], url: "https://www.vcc.ca/programs/" },
  { uni: "vcc", name: "Network Administration and Security Diploma", degreeType: "diploma", durationMonths: 18, cost: 9500,
    skillsTaught: ["networking", "linux", "siem"], url: "https://www.vcc.ca/programs/" },

  { uni: "kpu", name: "Bachelor of Technology in Information Technology", degreeType: "bachelor", durationMonths: 48, cost: 60000,
    skillsTaught: ["python", "sql", "javascript", "aws"], url: "https://www.kpu.ca/computing" },
  { uni: "kpu", name: "Applied Data Analytics Certificate", degreeType: "certificate", durationMonths: 6, cost: 4000,
    skillsTaught: ["excel", "tableau", "power_bi", "sql"], url: "https://www.kpu.ca/continuing" },

  { uni: "douglas", name: "Computing Science Diploma", degreeType: "diploma", durationMonths: 24, cost: 8500,
    skillsTaught: ["python", "sql", "javascript"], url: "https://www.douglascollege.ca/program" },
  { uni: "douglas", name: "Cybersecurity Post-Degree Diploma", degreeType: "diploma", durationMonths: 12, cost: 11000,
    skillsTaught: ["networking", "siem", "threat_detection", "linux"], url: "https://www.douglascollege.ca/program" }
];

async function ensureTables() {
  await pg.query(`
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

async function run() {
  try {
    await pg.connect();
    await ensureTables();

    // full replace: this table is reference/seed data, not user data
    await pg.query("TRUNCATE program, university RESTART IDENTITY CASCADE;");

    const idByKey = {};
    for (const u of universities) {
      const r = await pg.query(
        "INSERT INTO university (name, city, region, url) VALUES ($1,$2,$3,$4) RETURNING id",
        [u.name, u.city, u.region, u.url]
      );
      idByKey[u.key] = r.rows[0].id;
      console.log(`University inserted: ${u.name}`);
    }

    for (const p of programs) {
      const universityId = idByKey[p.uni];
      if (!universityId) {
        console.warn(`Skipping program "${p.name}" — unknown university key "${p.uni}"`);
        continue;
      }
      await pg.query(
        `INSERT INTO program (university_id, name, degree_type, duration_months, cost, skills_taught, url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [universityId, p.name, p.degreeType, p.durationMonths, p.cost, p.skillsTaught, p.url]
      );
      console.log(`Program inserted: ${p.name}`);
    }

    console.log(`Seeding complete: ${universities.length} universities, ${programs.length} programs.`);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

run();
