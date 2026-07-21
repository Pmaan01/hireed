/*
  fetcher.cjs — CommonJS Adzuna -> Postgres fetcher
  Run with: node fetcher.cjs
  Put this file in: D:\NewProjectEducation\hireed\services\job-market\fetcher.cjs
*/
const axios = require("axios");
const fs = require("fs");
const { Client } = require("pg");
const stringSimilarity = require("string-similarity");
require("dotenv").config();

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const COUNTRY = process.env.ADZUNA_COUNTRY || "ca";
const RESULTS_PER_PAGE = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || "50", 10);
const MAX_PAGES = parseInt(process.env.ADZUNA_MAX_PAGES || "4", 10);
const ADZUNA_ROOT = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search`;

const SKILL_MAP_PATH = "./skill_list.json";
let SKILL_MAP = {};
try {
  SKILL_MAP = JSON.parse(fs.readFileSync(SKILL_MAP_PATH, "utf8"));
} catch (e) {
  console.error("Cannot read skill_list.json. Create one next to fetcher.cjs. Error:", e.message);
  process.exit(1);
}

const pg = new Client({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "jobdb"
});

function normalizeText(t){
  if(!t) return "";
  return String(t).toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g,"'").replace(/[^a-z0-9\s\+\#\.\-]/g," ");
}

function extractSkills(text){
  const norm = normalizeText(text);
  const found = {};
  for(const canonical of Object.keys(SKILL_MAP)){
    const aliases = SKILL_MAP[canonical] || [];
    let score = 0;
    // exact token match
    for(const a of aliases){
      const safe = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${safe}\\b`, "i");
      if(re.test(norm)){
        score = 100;
        break;
      }
    }
    // fuzzy fallback
    if(score === 0){
      for(const a of aliases){
        const res = stringSimilarity.findBestMatch(a, [norm]);
        const rating = (res && res.bestMatch && res.bestMatch.rating) ? res.bestMatch.rating : 0;
        const scaled = Math.round(rating * 100);
        if(scaled > score) score = scaled;
      }
    }
    if(score > 0) found[canonical] = score;
  }
  return found;
}

async function ensureTable(){
  await pg.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS job_posting (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source text,
      title text,
      company text,
      location text,
      salary_min int,
      salary_max int,
      raw_text text,
      posted_date date,
      parsed_skills jsonb,
      role_cluster text,
      url text,
      UNIQUE (source, url)
    );
  `);
}

async function upsertJob(job, parsedSkills){
  const q = `
    INSERT INTO job_posting (source,title,company,location,salary_min,salary_max,raw_text,posted_date,parsed_skills,role_cluster,url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (source,url) DO UPDATE SET
      title = EXCLUDED.title,
      company = EXCLUDED.company,
      location = EXCLUDED.location,
      salary_min = EXCLUDED.salary_min,
      salary_max = EXCLUDED.salary_max,
      raw_text = EXCLUDED.raw_text,
      posted_date = EXCLUDED.posted_date,
      parsed_skills = EXCLUDED.parsed_skills,
      role_cluster = EXCLUDED.role_cluster
    RETURNING id;
  `;
  const vals = [
    job.source || "adzuna",
    job.title || null,
    job.company || null,
    job.location || null,
    job.salary_min || null,
    job.salary_max || null,
    job.raw_text || null,
    job.posted_date || null,
    parsedSkills || {},
    job.role_cluster || null,
    job.url || null
  ];
  try {
    await pg.query(q, vals);
  } catch (e) {
    console.error("Upsert error:", e.message);
  }
}

async function fetchPage(page){
  const url = `${ADZUNA_ROOT}/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${RESULTS_PER_PAGE}&content-type=application/json`;
  return axios.get(url, { timeout: 30000 }).then(r=>r.data);
}

async function run(){
  try{
    await pg.connect();
    await ensureTable();
    for(let p = 1; p <= MAX_PAGES; p++){
      console.log(`Fetching page ${p}`);
      let data;
      try {
        data = await fetchPage(p);
      } catch (err) {
        console.error("Fetch error:", err.response?.status || err.code || err.message);
        break;
      }
      if(!data || !data.results || data.results.length === 0){
        console.log("No more results.");
        break;
      }
      for(const r of data.results){
        if(/senior|lead|manager|director|principal/i.test(r.title || "")) continue;
        const textPieces = [
          r.title,
          r.description,
          r.company?.display_name,
          r.location?.display_name,
          r.category?.label
        ].filter(Boolean).join(" ");
        const parsed = extractSkills(textPieces);
        const jobObj = {
          source: "adzuna",
          title: r.title,
          company: r.company?.display_name || null,
          location: r.location?.display_name || null,
          salary_min: r.salary_min || null,
          salary_max: r.salary_max || null,
          raw_text: textPieces,
          posted_date: r.created ? r.created.split("T")[0] : null,
          role_cluster: null,
          url: r.redirect_url || r.location?.url || null
        };
        await upsertJob(jobObj, parsed);
        console.log(`Saved: ${r.title} — skills: ${Object.keys(parsed).join(", ") || "(none)"}`);
      }
      await new Promise(res => setTimeout(res, 700));
    }
    console.log("Done.");
  } catch (err) {
    console.error("Fatal:", err.message || err);
  } finally {
    try { await pg.end(); } catch(_) {}
  }
}

run();
