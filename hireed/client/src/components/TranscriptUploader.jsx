// TranscriptUploader.jsx
import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const MAX_MB = 10;
const ACCEPT = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default function TranscriptUploader({ apiBase, onExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [previewName, setPreviewName] = useState("");
  const inputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPT.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF or image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large. Max ${MAX_MB} MB.`);
      e.target.value = "";
      return;
    }

    setPreviewName(file.name);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file, file.name); // key must be "file"

      // DO NOT set Content-Type yourself. Axios will set proper multipart boundary.
      const res = await axios.post(`${apiBase}/api/transcripts/extract`, form, {
        withCredentials: true,
      });

      const data = res.data;
      if (!Array.isArray(data?.extracted) || data.extracted.length === 0) {
        toast.warn("No courses detected. Try a clearer scan or edit manually.");
        return;
      }
      toast.success("Transcript parsed. Review and apply.");
      onExtracted(data.extracted);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="uploader">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label="Upload transcript file"
      />
      <button
        type="button"
        className="button ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Extracting…" : "Upload transcript (PDF/PNG/JPG)"}
      </button>
      {previewName ? (
        <small className="hint" aria-live="polite">Selected: {previewName}</small>
      ) : null}
    </div>
  );
}
