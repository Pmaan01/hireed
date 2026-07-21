import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SITE } from "../lib/siteMeta.js";
import "../styles/Home.css";
export default function Home() {
  const title = `${SITE.name} | Skills-Gap Career Planner`;
  const description = SITE.tagline;
  const url = `${SITE.baseUrl}/`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={url} />
        <meta name="description" content={description} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={SITE.ogImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        {SITE.twitterHandle && (
          <meta name="twitter:site" content={SITE.twitterHandle} />
        )}
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={SITE.ogImage} />

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: SITE.name,
            url: SITE.baseUrl,
            description: SITE.tagline,
          })}
        </script>
      </Helmet>

      {/* Main Content */}
      <main className="home">
        <section className="container hero">
          <h1 className="hero-title">Skills-Gap Career Planner</h1>
          <p className="hero-sub">{SITE.tagline}</p>
          <Link to="/planner" className="cta-btn">
            Start Planning
          </Link>
        </section>

        <section className="container features">
          <div className="feature">
            <h3>🎓 For Students</h3>
            <p>
              See what you already have, what you're missing, and how to bridge
              the gap without wasting time or money.
            </p>
          </div>
          <div className="feature">
            <h3>💼 For Job Seekers</h3>
            <p>
              Employers want proof. Get clear pathways and projects they
              actually care about.
            </p>
          </div>
          <div className="feature">
            <h3>⚡ For Everyone</h3>
            <p>
              Compare bootcamps, transfer, or hybrid paths side-by-side. No
              fluff, just useful routes.
            </p>
          </div>
        </section>

        <section className="container features" style={{ marginTop: 24 }}>
          <div className="feature">
            <h3>FAQ: Does this replace a degree?</h3>
            <p>
              No. It shows the shortest skills path employers accept today,
              including transfer options if a degree is best for your goals.
            </p>
          </div>
          <div className="feature">
            <h3>FAQ: How accurate are the skills?</h3>
            <p>
              Role templates map to current job postings and update regularly.
              You'll also see gaps versus your own credits and skills.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
