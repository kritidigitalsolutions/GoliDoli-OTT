import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../App";
import { Save, Loader, Film, ArrowLeft } from "lucide-react";
import { createAIReel } from "../features/services/aiReel.service";

import "./AddContent.css"; // Reuse Form styling

export default function AddAIReels() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form Fields
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: "",
    priority: 0,
    isPublished: true,
    videoUrl: "",
    thumbnailUrl: "",
  });

  // Upload Files State
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // Input Refs
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setUploadProgress(0);

    try {
      if (!videoFile && !form.videoUrl) {
        alert("Please upload a video file or provide a videoUrl");
        setFormLoading(false);
        return;
      }
      if (!thumbnailFile && !form.thumbnailUrl) {
        alert("Please upload a thumbnail file or provide a thumbnailUrl");
        setFormLoading(false);
        return;
      }

      await createAIReel({
        form,
        videoFile,
        thumbnailFile,
        onProgress: (percent) => setUploadProgress(percent),
      });
      showToast("AI Reel created successfully! 🚀", "success");
      navigate("/dashboard/ai-reels");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error saving AI Reel");
    } finally {
      setFormLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="page-section">
      <div className="pg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button 
            className="btn btn-ghost" 
            onClick={() => navigate("/dashboard/ai-reels")}
            style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to Library
          </button>
          <h1 className="pg-title">
            <Film style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} size={32} />
            Add New AI Reel
          </h1>
          <p className="pg-sub">Upload a vertical short reel</p>
        </div>
      </div>

      <div className="content-box" style={{ marginTop: "24px", maxWidth: "800px" }}>
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label">Reel Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              required
              placeholder="e.g. A world where time slows down"
              disabled={formLoading}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Tell your viewers about this reel..."
              disabled={formLoading}
              rows={3}
              className="form-input"
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
              <label className="form-label">Duration (e.g. 0:15)</label>
              <input
                type="text"
                name="duration"
                value={form.duration}
                onChange={handleInputChange}
                placeholder="0:15"
                disabled={formLoading}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
              <label className="form-label">Priority</label>
              <input
                type="number"
                name="priority"
                value={form.priority}
                onChange={handleInputChange}
                placeholder="0"
                disabled={formLoading}
                className="form-input"
              />
            </div>
          </div>

          {/* Video Asset Picker */}
          <div className="form-group" style={{ marginBottom: "20px", border: "1px dashed var(--border)", padding: "16px", borderRadius: "8px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Reel Video File *</label>
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              accept="video/*"
              disabled={formLoading}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => videoInputRef.current.click()}
                disabled={formLoading}
                style={{ border: "1px solid var(--border)", borderRadius: "6px" }}
              >
                Select Local Video
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                {videoFile ? videoFile.name : (form.videoUrl ? "URL Mode Override active" : "No file selected")}
              </span>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Or paste direct video CDN URL:</label>
              <input
                type="text"
                name="videoUrl"
                value={form.videoUrl}
                onChange={handleInputChange}
                placeholder="https://cdn.example.com/video.mp4"
                disabled={formLoading}
                className="form-input"
                style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              />
            </div>
          </div>

          {/* Thumbnail Image Picker */}
          <div className="form-group" style={{ marginBottom: "20px", border: "1px dashed var(--border)", padding: "16px", borderRadius: "8px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Thumbnail Poster Image *</label>
            <input
              type="file"
              ref={thumbnailInputRef}
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              accept="image/*"
              disabled={formLoading}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => thumbnailInputRef.current.click()}
                disabled={formLoading}
                style={{ border: "1px solid var(--border)", borderRadius: "6px" }}
              >
                Select Local Image
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                {thumbnailFile ? thumbnailFile.name : (form.thumbnailUrl ? "URL Override active" : "No file selected")}
              </span>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Or paste direct poster CDN URL:</label>
              <input
                type="text"
                name="thumbnailUrl"
                value={form.thumbnailUrl}
                onChange={handleInputChange}
                placeholder="https://cdn.example.com/poster.jpg"
                disabled={formLoading}
                className="form-input"
                style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              />
            </div>
          </div>

          {/* Published Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
            <input
              type="checkbox"
              id="isPublished"
              name="isPublished"
              checked={form.isPublished}
              onChange={handleInputChange}
              disabled={formLoading}
              style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
            />
            <label htmlFor="isPublished" style={{ color: "var(--text)", fontWeight: 500, cursor: "pointer" }}>
              Publish immediately (Visible to clients)
            </label>
          </div>

          {/* Upload Progress Bar */}
          {formLoading && uploadProgress > 0 && (
            <div style={{ margin: "20px 0", background: "var(--bg3)", borderRadius: "10px", padding: "12px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
                <span>Uploading Assets to Bunny CDN...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--primary)", transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "20px", marginTop: "20px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formLoading}
              style={{ flex: 1, display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}
            >
              {formLoading ? (
                <>
                  <Loader className="spin" size={16} /> Publishing...
                </>
              ) : (
                <>
                  <Save size={16} /> Publish Reel
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={formLoading}
              onClick={() => navigate("/dashboard/ai-reels")}
              style={{ border: "1px solid var(--border)", padding: "10px 16px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
