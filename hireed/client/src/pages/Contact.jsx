import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { SITE } from "../lib/siteMeta.js";
import "../styles/Contact.css";

export default function Contact() {
  const title = `Contact | ${SITE.name}`;
  const description = `Contact ${SITE.name}. Questions about pathways, partnerships, or support? Reach out.`;
  const url = `${SITE.baseUrl}/contact`;

  const [status, setStatus] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
     
      setTimeout(() => setStatus("sent"), 600);
    } catch {
      setStatus("error");
    }
  };

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@example.com",
        areaServed: "CA",
        availableLanguage: ["en"],
      },
    ],
  };

  return (
    <main className="page contact" role="main">
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
          {JSON.stringify(contactJsonLd)}
        </script>
      </Helmet>

      <header className="container">
        <h1>Contact</h1>
        <p className="sub">
          We actually read these. Send feedback, bugs, or partnership inquiries.
        </p>
      </header>

      <section className="container" aria-labelledby="contact-form-heading">
        <h2 id="contact-form-heading">Send a message</h2>

        <form className="card" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              className="input"
              autoComplete="name"
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="topic">
              Topic
            </label>
            <select
              id="topic"
              name="topic"
              className="select"
              defaultValue="support"
            >
              <option value="support">Support</option>
              <option value="partnership">Partnership</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              className="textarea"
              rows={5}
              required
            />
          </div>

          <button
            className="button"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send"}
          </button>

          {status === "sent" && (
            <div className="success" role="status" aria-live="polite">
              Message sent. We’ll reply by email.
            </div>
          )}
          {status === "error" && (
            <div className="error" role="alert">
              Something broke. Try again.
            </div>
          )}
        </form>
      </section>

      <section className="container">
        <h2>Other ways to reach us</h2>
        <ul className="ul">
          <li className="li">
            Email: <a href="mailto:support@example.com">support@example.com</a>
          </li>
          <li className="li">
            X/Twitter:{" "}
            <a
              href={`https://twitter.com/${
                SITE.twitterHandle?.replace("@", "") || ""
              }`}
              rel="noopener noreferrer"
            >
              {SITE.twitterHandle || "@yourhandle"}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
