import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

export async function ensureTables() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS auth_code (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      code text NOT NULL,
      used boolean DEFAULT false,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS auth_code_email_idx ON auth_code(email);

    CREATE TABLE IF NOT EXISTS role_template (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text UNIQUE NOT NULL,
      name text,
      core_skills text[],
      projects text[]
    );

    CREATE TABLE IF NOT EXISTS course (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text,
      provider text,
      url text,
      role_keys text[],
      covers_skills text[],
      mode text DEFAULT 'self-paced' CHECK (mode IN ('transfer','bootcamp','self-paced','hybrid')),
      hours int,
      cost numeric
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      credits text[],
      skills text[],
      city text,
      role text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS plan (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id),
      role text,
      inputs jsonb,
      snapshot jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS plan_user_id_idx ON plan(user_id);
  `);
}
