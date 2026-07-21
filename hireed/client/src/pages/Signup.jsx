import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SITE } from "../lib/siteMeta.js";
import { toast } from "react-toastify";
import "../styles/Signup.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("email"); // email | code
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next") || "/planner";
  const intent = params.get("intent") || "";

  const title = `Sign up | ${SITE.name}`;
  const description = "Create your free account to save and resume your plan.";

  async function requestCode() {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error("Enter a valid email.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        setStage("code");
        toast.success("We emailed you a 6-digit code.");
      } else {
        toast.error("Could not send code. Try again.");
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!code.trim()) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (r.ok) {
        toast.success("Signed in!");
        const url = new URL(next, window.location.origin);
        if (intent === "save-plan") url.searchParams.set("postSignup", "1");
        navigate(url.pathname + url.search, { replace: true });
      } else {
        const j = await r.json().catch(() => ({}));
        toast.error(j?.message || "Invalid or expired code.");
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const url = `${SITE.baseUrl}/signup`;

  return (
    <main className="authPage" role="main">
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
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={SITE.ogImage} />
      </Helmet>

      <section className="container narrow">
        <h1 className="h1">Create your free account</h1>
        <p className="sub">Save your pathway and access it anywhere.</p>

        <div className="card">
          {stage === "email" && (
            <>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <button className="button mt2" onClick={requestCode} disabled={busy}>
                {busy ? "Sending…" : "Email me a code"}
              </button>
            </>
          )}

          {stage === "code" && (
            <>
              <label className="label" htmlFor="code">6-digit code</label>
              <input
                id="code"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <button className="button mt2" onClick={verify} disabled={busy}>
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
