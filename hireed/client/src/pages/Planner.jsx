import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { SITE } from "../lib/siteMeta.js";
import "../styles/Planner.css";
import { toast } from "react-toastify";
// FIX PATH: use the real folder name. If your folder is actually "componets", change it back.
import TranscriptUploader from "../components/TranscriptUploader.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function Planner() {
  // form state
  const [credits, setCredits] = useState(localStorage.getItem("credits") || "");
  const [skills, setSkills] = useState(localStorage.getItem("skills") || "");
  const [city, setCity] = useState(localStorage.getItem("city") || "Vancouver");
  const [extracted, setExtracted] = useState([]);

  const fallbackRoles = [
    "data-analyst",
    "cybersecurity-analyst",
    "ai-ops",
    "full-stack-developer",
    "cloud-engineer",
  ];

  // DEFAULT ROLE: don’t let it be null on first render
  const [role, setRole] = useState(
    localStorage.getItem("role") || fallbackRoles[0]
  );
  const [roles, setRoles] = useState(fallbackRoles);

  // helper: stringify extracted rows into your textarea format
  function applyExtractedToCredits() {
    if (!extracted.length) return;
    const lines = extracted
      .filter((r) => r?.code)
      .map((r) => {
        const parts = [r.code];
        if (r.title) parts.push(r.title);
        if (r.credits != null) parts.push(`${r.credits} cr`);
        if (r.grade) parts.push(`grade ${r.grade}`);
        return parts.join(" — ");
      });
    const merged = [credits.trim(), lines.join("\n")]
      .filter(Boolean)
      .join("\n");
    setCredits(merged);
    setExtracted([]);
    toast.success("Added extracted courses to your list.");
  }

  // fetch roles (ONCE). If backend returns a list, align current role.
  useEffect(() => {
    let on = true;
    fetch(`${API_BASE}/api/roles`)
      .then((r) => r.json())
      .then((list) => {
        if (!on) return;
        if (Array.isArray(list) && list.length) {
          setRoles(list);
          setRole((prev) => (list.includes(prev) ? prev : list[0]));
        }
      })
      .catch(() => {}); // keep fallback if API dies
    return () => {
      on = false;
    };
  }, []);

  // result state
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lastSnapshot") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // auth status (cheap check)
  const [isAuthed, setIsAuthed] = useState(false);

  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // persist fields
  useEffect(() => {
    localStorage.setItem("credits", credits);
  }, [credits]);
  useEffect(() => {
    localStorage.setItem("skills", skills);
  }, [skills]);
  useEffect(() => {
    localStorage.setItem("city", city);
  }, [city]);
  useEffect(() => {
    localStorage.setItem("role", role);
  }, [role]);

  // check auth once
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setIsAuthed(Boolean(d?.user)))
      .catch(() => {});
  }, []);

  // if we just came back from signup with intent to save, try save
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("postSignup") === "1" && result) {
      savePlan().finally(() => {
        // clean up query so we don't loop
        const clean = new URL(window.location.href);
        clean.searchParams.delete("postSignup");
        window.history.replaceState({}, "", clean.toString());
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function generate(e) {
    e?.preventDefault();
    if (!skills.trim()) {
      setErrMsg("Please enter at least one current skill.");
      return;
    }
    setLoading(true);
    setErrMsg("");
    try {
      const { data } = await axios.post(`${API_BASE}/api/pathways/generate`, {
        credits,
        skills,
        city,
        role,
      });
      setResult(data);
      localStorage.setItem("lastSnapshot", JSON.stringify(data));
      setTimeout(() => resultsRef.current?.focus(), 0);
    } catch (err) {
      setErrMsg(
        err?.response?.data?.message || err.message || "Request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  function edit(idx, key, val) {
    setExtracted((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function savePlan() {
    if (!result) {
      toast.error("Generate a plan before saving.");
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role,
          inputs: { credits, skills, city },
          snapshot: result,
        }),
      });
      if (r.ok) {
        toast.success("Plan saved to your profile.");
      } else {
        const j = await r.json().catch(() => ({}));
        toast.error(j?.message || "Could not save plan.");
      }
    } catch (e) {
      toast.error("Failed to save plan: " + e.message);
    }
  }

  function goToSignupForSave() {
    if (!result) {
      setErrMsg("Generate a plan before saving.");
      return;
    }
    // make sure snapshot is in localStorage so we can recover after redirect
    localStorage.setItem("lastSnapshot", JSON.stringify(result));
    const next = encodeURIComponent("/planner?postSignup=1");
    navigate(`/signup?next=${next}&intent=save-plan`);
  }

  const missingSkills = useMemo(() => result?.missingSkills || [], [result]);
  // removed unused "pathways" memo — use result?.pathways directly

  // SEO meta
  const title = `Planner | ${SITE.name}`;
  const description =
    "Paste your courses and skills, upload a transcript, pick a role, and get a job-ready pathway with time and cost.";
  const url = `${SITE.baseUrl}/planner`;

  return (
    <main className="planner" role="main">
      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={url} />
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={SITE.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        {SITE.twitterHandle && (
          <meta name="twitter:site" content={SITE.twitterHandle} />
        )}
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={SITE.ogImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: `${SITE.name} Planner`,
            url,
            applicationCategory: "EducationApplication",
            operatingSystem: "Any",
            description,
          })}
        </script>
      </Helmet>

      <section className="container">
        <header className="planner-header">
          <h1 className="h1">Your Plan</h1>
          <p className="sub">Paste courses or upload a transcript. Pick a role. Get a plan.</p>
        </header>

        <section className="grid" aria-live="polite">
          <form className="card" onSubmit={generate} noValidate>
            <div className="field">
              <label className="label" htmlFor="role">Role</label>
              <select
                id="role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-describedby="role-help"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <small id="role-help" className="hint">
                Pick the role template to match against.
              </small>
            </div>

            <div className="field">
              <label className="label" htmlFor="credits">Your credits/courses</label>

              {/* entry mode: type/paste + uploader */}
              <div className="tabRow" role="tablist" aria-label="Course entry mode">
                <button type="button" className="tag active" role="tab" aria-selected="true">
                  Type/Paste
                </button>
                <span className="divider" aria-hidden>·</span>
                <div role="tab" aria-selected="false" aria-controls="uploader">
                  <TranscriptUploader
                    apiBase={API_BASE}
                    onExtracted={setExtracted}
                  />
                </div>
              </div>

              <textarea
                id="credits"
                className="textarea"
                rows={6}
                placeholder="CPSC 1160 — Intro to Programming — 3 cr — grade B+"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />

              {/* extracted review table */}
              {extracted.length ? (
                <div className="card" id="uploader" aria-live="polite">
                  <h3 className="h4">Review extracted courses</h3>
                  <div className="tableWrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Title</th>
                          <th>Credits</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extracted.map((r, i) => (
                          <tr key={i}>
                            <td>
                              <input
                                className="input"
                                value={r.code || ""}
                                onChange={(e) => edit(i, "code", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                value={r.title || ""}
                                onChange={(e) => edit(i, "title", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                value={r.credits ?? ""}
                                onChange={(e) => edit(i, "credits", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                value={r.grade || ""}
                                onChange={(e) => edit(i, "grade", e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="btnRow">
                    <button type="button" className="button" onClick={applyExtractedToCredits}>
                      Apply to credits
                    </button>
                    <button type="button" className="button ghost" onClick={() => setExtracted([])}>
                      Discard
                    </button>
                  </div>
                  <small className="hint">
                    Tidy these if needed. We’ll merge them into your course list above.
                  </small>
                </div>
              ) : null}

              <small className="hint">
                Paste works fine. Or upload a transcript and we’ll extract course codes automatically.
              </small>
            </div>

            <div className="field">
              <label className="label" htmlFor="skills">Your current skills</label>
              <input
                id="skills"
                className="input"
                placeholder="Python, SQL, Excel"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                required
              />
              <small className="hint">Comma-separated works best.</small>
            </div>

            <div className="field">
              <label className="label" htmlFor="city">City for jobs</label>
              <input
                id="city"
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="btnRow">
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Generating…" : "Generate pathways"}
              </button>

              {isAuthed ? (
                <button type="button" className="button ghost" onClick={savePlan}>
                  Save to Profile
                </button>
              ) : (
                <button type="button" className="button ghost" onClick={goToSignupForSave}>
                  Save my plan
                </button>
              )}
            </div>

            {errMsg ? (
              <div className="error" role="alert">{errMsg}</div>
            ) : null}
          </form>

          <div className="resultsCol">
            {!result && !loading ? (
              <EmptyState />
            ) : (
              <>
                {result && (
                  <div
                    className="metaWrap"
                    tabIndex={-1}
                    ref={resultsRef}
                    aria-label="Plan metadata"
                  >
                    <MetaRow label="Role" value={result.role} />
                    <MetaRow label="City" value={result.jobsPreview?.city || city} />
                  </div>
                )}

                {!!missingSkills.length && (
                  <div className="card">
                    <h2 className="h3">Missing skills</h2>
                    <ul className="list">
                      {missingSkills.map((s) => (
                        <li key={s} className="badge">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!result?.marketMissingSkills?.length && (
                  <div className="card">
                    <h2 className="h3">In-demand skills (real job market)</h2>
                    <p className="sub" style={{ margin: "0 0 12px" }}>
                      Skills most requested in real {city} job postings that you haven't listed yet.
                    </p>
                    <ul className="list">
                      {result.marketMissingSkills.map((s) => (
                        <li key={s} className="badge">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result?.recommendedProjects?.length ? (
                  <div className="card">
                    <h2 className="h3">Recommended projects</h2>
                    <ul className="ul">
                      {result.recommendedProjects.map((p) => (
                        <li key={p.id || p.title || String(p)} className="li">
                          {p.title || String(p)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result?.pathways?.length ? (
                  <div className="card">
                    <h2 className="h3">Pathways</h2>
                    <div className="pathGrid">
                      {result.pathways.map((p) => (
                        <article key={p.id} className="pathCard">
                          <header className="pathHeader">
                            <div className="pathTitle">{p.title}</div>
                            <div className="pathMeta">
                              <span>{p.durationMonths} mo</span>
                              <span aria-hidden>•</span>
                              <span>${Number(p.estCost || 0).toLocaleString()}</span>
                            </div>
                          </header>
                          <ol className="steps">
                            {(p.steps || []).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!!result?.recommendedPrograms?.length && (
                  <div className="card">
                    <h2 className="h3">Programs near you</h2>
                    <div className="pathGrid">
                      {result.recommendedPrograms.map((uni) => (
                        <article key={uni.id} className="pathCard">
                          <header className="pathHeader">
                            <div className="pathTitle">
                              {uni.url ? (
                                <a href={uni.url} target="_blank" rel="noreferrer">{uni.name}</a>
                              ) : (
                                uni.name
                              )}
                            </div>
                            <div className="pathMeta">
                              <span>{uni.city}</span>
                            </div>
                          </header>
                          <ul className="ul">
                            {(uni.programs || []).map((p) => (
                              <li key={p.id} className="li">
                                {p.url ? (
                                  <a href={p.url} target="_blank" rel="noreferrer">{p.name}</a>
                                ) : (
                                  p.name
                                )}
                                {" — "}
                                {p.degreeType}
                                {p.durationMonths ? `, ${p.durationMonths} mo` : ""}
                                {p.cost != null ? `, $${Number(p.cost).toLocaleString()}` : ""}
                                {p.skillsTaught?.length ? ` (covers: ${p.skillsTaught.join(", ")})` : ""}
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {result && (
                  <div className="card">
                    <h2 className="h3">Raw response</h2>
                    <pre className="pre" aria-label="API response JSON">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
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
      <h2 className="h3">No plan yet</h2>
      <p className="sub">Fill in your courses and skills, then click Generate.</p>
      <ul className="ul">
        <li className="li">We’ll detect missing skills for the selected role</li>
        <li className="li">We’ll suggest 2–3 pathways with time and cost</li>
        <li className="li">You’ll see portfolio project suggestions</li>
      </ul>
    </div>
  );
}
