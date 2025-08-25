import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../styles/Planner.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function Planner() {
  // form state
  const [credits, setCredits] = useState("");
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [role, setRole] = useState("data-analyst");
  const [roles, setRoles] = useState(["data-analyst"]);

  // result state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // theme
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  // fetch roles on mount
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/api/roles`)
      .then(r => r.json())
      .then(list => {
        if (!isMounted) return;
        if (Array.isArray(list) && list.length) {
          setRoles(list);
          if (!list.includes(role)) setRole(list[0]);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  async function generate() {
    setLoading(true);
    setErrMsg("");
    setResult(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/pathways/generate`, {
        credits, skills, city, role
      });
      setResult(data);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const missingSkills = useMemo(() => result?.missingSkills || [], [result]);
  const pathways = useMemo(() => result?.pathways || [], [result]);

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1 className="h1">Your Plan</h1>
          <p className="sub">Paste your courses and skills. Pick a role. Get a plan. Minimal drama.</p>
        </div>
        <button className="themeBtn" onClick={toggleTheme}>
          {theme === "dark" ? "Switch to light" : "Switch to dark"}
        </button>
      </div>

      <section className="grid">
        <div className="card">
          <div className="field">
            <label className="label">Role</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="label">Your credits/courses</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="CPSC 1160, STAT 200, ENGL 110…"
              value={credits}
              onChange={e => setCredits(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Your current skills</label>
            <input
              className="input"
              placeholder="Python, SQL, Excel"
              value={skills}
              onChange={e => setSkills(e.target.value)}
            />
            <small className="hint">Comma‑separated works best.</small>
          </div>

          <div className="field">
            <label className="label">City for jobs</label>
            <input className="input" value={city} onChange={e => setCity(e.target.value)} />
          </div>

          <button className="button" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate pathways"}
          </button>

          {errMsg ? <div className="error">{errMsg}</div> : null}
        </div>

        <div className="resultsCol">
          {!result && !loading ? (
            <EmptyState />
          ) : (
            <>
              {result && (
                <div className="metaWrap">
                  <MetaRow label="Role" value={result.role} />
                  <MetaRow label="City" value={result.jobsPreview?.city || city} />
                </div>
              )}

              {!!missingSkills.length && (
                <div className="card">
                  <h3 className="h3">Missing skills</h3>
                  <ul className="list">
                    {missingSkills.map(s => <li key={s} className="badge">{s}</li>)}
                  </ul>
                </div>
              )}

              {result?.recommendedProjects?.length ? (
                <div className="card">
                  <h3 className="h3">Recommended projects</h3>
                  <ul className="ul">
                    {result.recommendedProjects.map(p => (
                      <li key={p.id} className="li">{p.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {pathways.length ? (
                <div className="card">
                  <h3 className="h3">Pathways</h3>
                  <div className="pathGrid">
                    {pathways.map(p => (
                      <div key={p.id} className="pathCard">
                        <div className="pathHeader">
                          <div className="pathTitle">{p.title}</div>
                          <div className="pathMeta">
                            <span>{p.durationMonths} mo</span>
                            <span>•</span>
                            <span>${Number(p.estCost || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <ol className="steps">
                          {(p.steps || []).map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {result && (
                <div className="card">
                  <h3 className="h3">Raw response</h3>
                  <pre className="pre">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="metaRow">
      <span className="metaLabel">{label}</span>
      <span className="metaValue">{String(value || "—")}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card">
      <h3 className="h3">No plan yet</h3>
      <p className="sub">Fill in your courses and skills, then click Generate.</p>
      <ul className="ul">
        <li className="li">We’ll detect missing skills for the selected role</li>
        <li className="li">We’ll suggest 2–3 pathways with time and cost</li>
        <li className="li">You’ll see portfolio project suggestions</li>
      </ul>
    </div>
  );
}
