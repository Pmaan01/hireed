import { useState } from "react";

export default function AuthModal({ open, onClose, onAuthed }) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("email");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  if (!open) return null;

  const requestCode = async () => {
    setMsg("");
    const r = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (r.ok) setStage("code");
    else setMsg("Couldn't send code");
  };

  const verify = async () => {
    setMsg("");
    const r = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include" // get httpOnly cookie
    });
    if (r.ok) {
      onAuthed?.();
      onClose();
    } else setMsg("Invalid code");
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Create your free account</h2>
        {stage === "email" && (
          <>
            <input className="border p-2 w-full mb-2" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn" onClick={requestCode}>Email me a code</button>
          </>
        )}
        {stage === "code" && (
          <>
            <input className="border p-2 w-full mb-2" placeholder="6-digit code"
              value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn" onClick={verify}>Verify</button>
          </>
        )}
        {msg && <p className="text-red-600 mt-2">{msg}</p>}
        <button className="mt-3 text-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
