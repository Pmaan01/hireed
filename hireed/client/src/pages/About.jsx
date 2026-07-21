import React from "react";
import { Helmet } from "react-helmet-async";
import { SITE } from "../lib/siteMeta.js";
import "../styles/About.css";

export default function About() {
  const title = `About | ${SITE.name}`;
  const description = `${SITE.tagline}. Learn who we are, why we exist, and how we build career pathways that actually map to real jobs.`;
  const url = `${SITE.baseUrl}/about`;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE.name,
    url,
    description,
    sameAs: [SITE.baseUrl].filter(Boolean),
  };

  return (
    <main className="page about" role="main">
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
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
      </Helmet>

      <header className="container">
        <h1>About {SITE.name}</h1>
        <p className="sub">
          We build skill-first pathways that connect what you’ve learned to the
          jobs hiring right now.
        </p>
      </header>

      <section className="container">
        <h2>What we do</h2>
        <p>
          We map job postings to the exact skills employers ask for, compare
          that against your credits and current skills, then generate the
          shortest, cheapest pathway to get you job-ready.
        </p>
      </section>

      <section className="container">
        <h2>Why it matters</h2>
        <ul className="ul">
          <li className="li">
            Students get clarity and stop wasting time on courses that don’t
            move the needle.
          </li>
          <li className="li">
            Employers get proof of skills, not just degree buzzwords.
          </li>
          <li className="li">
            Schools see real demand so they can modernize curriculum faster.
          </li>
        </ul>
      </section>

      <section className="container" aria-labelledby="faq-heading">
        <h2 id="faq-heading">FAQs</h2>
        <div className="card">
          <h3 className="h3">
            How is this different from a typical course catalog?
          </h3>
          <p>
            We start from jobs and work backward to courses and projects, not
            the other way around.
          </p>

          <h3 className="h3">Do you support credit transfer?</h3>
          <p>
            Yes. The MVP focuses on one role cluster first; transfer mapping is
            added next.
          </p>

          <h3 className="h3">Do employers accept a skills transcript?</h3>
          <p>
            That export is designed for hiring managers: concise, verifiable,
            and aligned to postings.
          </p>
        </div>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How is this different from a typical course catalog?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "We start from jobs and work backward to courses and projects, not the other way around.",
                },
              },
              {
                "@type": "Question",
                name: "Do you support credit transfer?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The MVP focuses on one role cluster first; transfer mapping is added next.",
                },
              },
              {
                "@type": "Question",
                name: "Do employers accept a skills transcript?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "That export is designed for hiring managers: concise, verifiable, and aligned to postings.",
                },
              },
            ],
          })}
        </script>
      </section>
    </main>
  );
}
