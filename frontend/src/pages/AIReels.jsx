import { useState, useEffect, useRef } from "react";
import { useToast } from "../App";
import {
  Plus,
  Play,
  Trash2,
  Edit,
  Save,
  Loader,
  CircleAlert,
  Film,
  Calendar,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  getAIReels,
  createAIReel,
  updateAIReel,
  deleteAIReel,
} from "../features/services/aiReel.service";

import "./Content.css"; // Reuse Content Library styling for consistency
import "./AddContent.css"; // Reuse Form styling

export default function AIReels() {
  const { showToast } = useToast();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter reels based on title/description
  const filteredReels = reels.filter((reel) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (reel.title && reel.title.toLowerCase().includes(query)) ||
      (reel.description && reel.description.toLowerCase().includes(query))
    );
  });

  // Drawer/Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null for create, id for update

  // Progress Bar
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

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await getAIReels();
      if (res.success) {
        setReels(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load AI Reels", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      title: "",
      description: "",
      duration: "",
      priority: 0,
      isPublished: true,
      videoUrl: "",
      thumbnailUrl: "",
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setIsOpen(true);
  };

  const handleOpenEdit = (reel) => {
    setEditId(reel._id);
    setForm({
      title: reel.title,
      description: reel.description || "",
      duration: reel.duration || "",
      priority: reel.priority || 0,
      isPublished: reel.isPublished !== false,
      videoUrl: reel.videoUrl || "",
      thumbnailUrl: reel.thumbnail || "",
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this AI Reel?")) return;

    try {
      const res = await deleteAIReel(id);
      if (res.success) {
        showToast("AI Reel deleted successfully ❌", "success");
        fetchReels();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to delete reel", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setUploadProgress(0);

    try {
      if (editId) {
        // Update Reel
        await updateAIReel(editId, {
          form,
          videoFile,
          thumbnailFile,
          onProgress: (percent) => setUploadProgress(percent),
        });
        showToast("AI Reel updated successfully! 🚀", "success");
      } else {
        // Create Reel
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
      }

      setIsOpen(false);
      fetchReels();
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
      {/* Header */}
      <div className="pg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="pg-title">
            <Film style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} size={32} />
            AI Reels Library
          </h1>
          <p className="pg-sub">Manage vertical short reels and metrics</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Plus size={18} /> Add AI Reel
        </button>
      </div>

      <div className="content-box" style={{ marginTop: "24px" }}>
        {/* Table list */}
        <div className="table-section">
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h3 style={{ margin: 0 }}>All Published & Draft Reels</h3>
            
            {/* Dynamic Search Bar */}
            <div style={{ display: "flex", alignItems: "center", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", width: "100%", maxWidth: "300px", position: "relative" }}>
              <Search size={16} style={{ color: "var(--text-muted)", marginRight: "8px" }} />
              <input
                type="text"
                placeholder="Search reels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text)",
                  width: "100%",
                  fontSize: "0.85rem"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    color: "var(--text-muted)",
                    marginLeft: "8px"
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
              {searchQuery ? `${filteredReels.length} of ${reels.length}` : reels.length} Total Reels
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader className="spin" size={32} style={{ color: "var(--primary)" }} />
            </div>
          ) : reels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No AI Reels found. Click "Add AI Reel" to publish your first vertical reel!
            </div>
          ) : filteredReels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No AI Reels found matching "{searchQuery}".
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Title & Desc</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Shares</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReels.map((reel) => (
                    <tr key={reel._id}>
                      <td style={{ width: "80px" }}>
                        <div style={{ position: "relative", width: "60px", height: "90px", borderRadius: "8px", overflow: "hidden", background: "#1a1f2c" }}>
                          <img
                            src={reel.thumbnail}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.target.src = "/placeholder-image.jpg";
                            }}
                          />
                          <a
                            href={reel.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(0,0,0,0.4)",
                              color: "#fff",
                            }}
                          >
                            <Play size={16} fill="#fff" />
                          </a>
                        </div>
                      </td>
                      <td style={{ minWidth: "200px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{reel.title}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          {reel.description || "No description provided."}
                        </div>
                        {reel.duration && (
                          <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px" }}>
                            Duration: {reel.duration}
                          </div>
                        )}
                      </td>
                      <td>{Number(reel.views || 0).toLocaleString()}</td>
                      <td>{Number(reel.like || 0).toLocaleString()}</td>
                      <td>{Number(reel.shares || 0).toLocaleString()}</td>
                      <td>{reel.priority || 0}</td>
                      <td>
                        <span className={`badge ${reel.isPublished ? "badge-success" : "badge-draft"}`} style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: reel.isPublished ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                          color: reel.isPublished ? "#10b981" : "#64748b"
                        }}>
                          {reel.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleOpenEdit(reel)}
                            style={{ padding: "6px", minWidth: "auto" }}
                          >
                            <Edit size={16} style={{ color: "var(--primary)" }} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleDelete(reel._id)}
                            style={{ padding: "6px", minWidth: "auto" }}
                          >
                            <Trash2 size={16} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawer / Modal for Creating & Editing */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => !formLoading && setIsOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "var(--bg2)",
              height: "100%",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Form Header */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>
                {editId ? "Edit AI Reel" : "Add AI Reel"}
              </h2>
              <button
                className="btn btn-ghost"
                onClick={() => setIsOpen(false)}
                disabled={formLoading}
                style={{ fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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

              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
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

                <div className="form-group" style={{ flex: 1 }}>
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
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "20px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                  style={{ flex: 1, display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}
                >
                  {formLoading ? (
                    <>
                      <Loader className="spin" size={16} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> {editId ? "Save Changes" : "Publish Reel"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={formLoading}
                  onClick={() => setIsOpen(false)}
                  style={{ border: "1px solid var(--border)", padding: "10px 16px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
