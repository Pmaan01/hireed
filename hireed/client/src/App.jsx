import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Planner from "./pages/Planner.jsx";

export default function App() {
  return (
    <div>
      <nav style={{ padding: 12 }}>
        <Link to="/" style={{ marginRight: 8 }}>Home</Link>
        <Link to="/planner">Planner</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Planner />} />
      </Routes>
    </div>
  );
}
