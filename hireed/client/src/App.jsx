import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Planner from "./pages/Planner.jsx";
import Signup from "./pages/Signup.jsx";
import Navbar from "./components/Navbar.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";

/** Detect system/theme changes for toast theme */
function useToastTheme() {
  const getTheme = () =>
    document.documentElement.classList.contains("dark")
      ? "dark"
      : window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(getTheme());
    mq?.addEventListener?.("change", onChange);

    const obs = new MutationObserver(onChange);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      mq?.removeEventListener?.("change", onChange);
      obs.disconnect();
    };
  }, []);

  return theme;
}

export default function App() {
  const toastTheme = useToastTheme();

  return (
    <>
      {/* Global nav at the very top */}
      <Navbar />

      {/* Main content area for routed pages */}
      <main role="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* One toast container for the whole app */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        theme={toastTheme}
      />
    </>
  );
}
