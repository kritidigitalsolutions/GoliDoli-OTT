import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useToast } from "../App";
import {
  Film,
  Plus,
  Trash2,
  Pencil,
  Search,
  X,
  RefreshCw,
  Loader,
  CheckCircle,
  Eye,
  Heart,
  Share2,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Save,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAIReels,
  updateAIReel,
  deleteAIReel,
} from "../features/services/aiReel.service";

import "./Dashboard.css";

export default function AIReels() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "published" | "draft"

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Edit Modal State
  const [editingReel, setEditingReel] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: "",
    priority: 0,
    isPublished: true,
    videoUrl: "",
    thumbnailUrl: "",
  });

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Custom Delete Confirmation Dialog
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
    confirmText: "Delete",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await getAIReels();
      if (res && res.success) {
        setReels(res.data || []);
      } else if (Array.isArray(res)) {
        setReels(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setReels(res.data);
      }
    } catch (err) {
      console.error("Error fetching AI Reels:", err);
      showToast("Failed to load AI Reels", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  // Compute KPI Metrics
  const totalReelsCount = reels.length;
  const publishedCount = useMemo(
    () => reels.filter((r) => r.isPublished !== false).length,
    [reels]
  );
  const totalViewsCount = useMemo(
    () => reels.reduce((sum, r) => sum + (Number(r.views) || 0), 0),
    [reels]
  );
  const totalInteractionsCount = useMemo(
    () =>
      reels.reduce(
        (sum, r) => sum + (Number(r.like) || 0) + (Number(r.shares) || 0),
        0
      ),
    [reels]
  );

  // Filtered Reels
  const filteredReels = useMemo(() => {
    return reels.filter((reel) => {
      // Status filter
      if (statusFilter === "published" && reel.isPublished === false) return false;
      if (statusFilter === "draft" && reel.isPublished !== false) return false;

      // Search filter
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const titleMatch = reel.title && reel.title.toLowerCase().includes(query);
      const descMatch =
        reel.description && reel.description.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }, [reels, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReels.length / limit) || 1;
  const paginatedReels = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReels.slice(start, start + limit);
  }, [filteredReels, page, limit]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // Handlers
  const handleOpenCreate = () => {
    navigate("/dashboard/add-ai-reel");
  };

  const handleOpenEdit = (reel) => {
    setEditingReel(reel);
    setForm({
      title: reel.title || "",
      description: reel.description || "",
      duration: reel.duration || "",
      priority: reel.priority || 0,
      isPublished: reel.isPublished !== false,
      videoUrl: reel.videoUrl || "",
      thumbnailUrl: reel.thumbnail || reel.thumbnailUrl || "",
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setUploadProgress(0);
    setUploadPhase("");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleConfirmDelete = (reel) => {
    setDialog({
      isOpen: true,
      title: "Delete AI Reel?",
      message: `Are you sure you want to permanently delete "${reel.title || "this reel"}"? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete Reel",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await deleteAIReel(reel._id);
          if (res.success) {
            showToast("AI Reel deleted successfully", "success");
            fetchReels();
          } else {
            showToast(res.message || "Failed to delete reel", "error");
          }
        } catch (err) {
          console.error(err);
          showToast(err.response?.data?.message || "Failed to delete reel", "error");
        }
      },
    });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingReel) return;

    setFormLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      await updateAIReel(editingReel._id, {
        form,
        videoFile,
        thumbnailFile,
        onProgress: (percent) => setUploadProgress(percent),
        onPhase: (phase) => setUploadPhase(phase),
      });

      showToast("AI Reel updated successfully", "success");
      setEditingReel(null);
      fetchReels();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error updating AI Reel", "error");
    } finally {
      setFormLoading(false);
      setUploadProgress(0);
      setUploadPhase("");
    }
  };

  return (
    <div className="page-section">
      {/* ── Page Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Film className="pg-title-icon" size={20} />
            AI Reels Library
          </h1>
          <p className="pg-sub">
            Manage vertical short reels, monitor performance metrics, and publish updates
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={fetchReels}
            disabled={loading}
            title="Refresh Reels List"
            style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ padding: "6px 14px", fontSize: "0.82rem", height: "auto" }}
          >
            <Plus size={15} />
            <span>Add AI Reel</span>
          </button>
        </div>
      </div>

      {/* ── Executive Symmetrical 4-Card KPI Grid ── */}
      <div className="kpi-grid">
        {/* Total Reels */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Reels</span>
            <div className="kpi-icon-badge icon-indigo">
              <Film size={15} />
            </div>
          </div>
          <div className="kpi-value">
            {loading ? "..." : totalReelsCount.toLocaleString("en-IN")}
          </div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Vertical short reels in library
          </div>
        </div>

        {/* Published Reels */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Published Reels</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {loading ? "..." : publishedCount.toLocaleString("en-IN")}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Active & visible to audience
          </div>
        </div>

        {/* Total Plays */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Plays</span>
            <div className="kpi-icon-badge icon-amber">
              <Eye size={15} />
            </div>
          </div>
          <div className="kpi-value">
            {loading ? "..." : totalViewsCount.toLocaleString("en-IN")}
          </div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Audience video views
          </div>
        </div>

        {/* Total Interactions */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Interactions</span>
            <div className="kpi-icon-badge icon-pink">
              <Sparkles size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#FF0F8A" }}>
            {loading ? "..." : totalInteractionsCount.toLocaleString("en-IN")}
          </div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Likes & shares combined
          </div>
        </div>
      </div>

      {/* ── Main Content Box ── */}
      <div className="content-box">
        {/* Toolbar: Search + Filter + Counter */}
        <div
          className="search-row"
          style={{
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flex: 1,
              minWidth: "260px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search reels by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.84rem" }}
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
                    padding: 0,
                    color: "var(--text-muted)",
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segmented Status Toggle Switch */}
            <div className="segmented-switch">
              {[
                { value: "all", label: "All Reels" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Drafts" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${
                    statusFilter === opt.value ? "active" : ""
                  }`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {statusFilter === opt.value && (
                    <motion.div
                      layoutId="activeReelFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Counter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Showing{" "}
              <strong style={{ color: "var(--text)" }}>
                {filteredReels.length}
              </strong>{" "}
              of {reels.length} reels
            </span>
          </div>
        </div>

        {/* Table / Loading / Empty State */}
        {loading ? (
          <div
            className="empty-state"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "48px 20px",
            }}
          >
            <Loader
              size={22}
              className="spin-icon"
              style={{ color: "var(--primary)", margin: "0 auto 8px auto" }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Loading AI Reels...
            </p>
          </div>
        ) : filteredReels.length === 0 ? (
          <div
            className="empty-state"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "54px 20px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                marginBottom: "12px",
              }}
            >
              <Film size={24} style={{ opacity: 0.65 }} />
            </div>
            <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
              {searchQuery || statusFilter !== "all"
                ? "No matching AI Reels found"
                : "No AI Reels created yet"}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "6px",
                marginBottom: "18px",
                maxWidth: "380px",
                lineHeight: 1.5,
              }}
            >
              {searchQuery || statusFilter !== "all"
                ? "Try clearing filters or search query to see all vertical reels."
                : "Get started by adding your first vertical short AI reel to the platform."}
            </p>
            {(!searchQuery && statusFilter === "all") && (
              <button
                className="btn btn-primary"
                onClick={handleOpenCreate}
                style={{ fontSize: "0.8rem", padding: "7px 16px" }}
              >
                <Plus size={14} /> Add AI Reel
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "36px", textAlign: "center" }}>#</th>
                    <th style={{ width: "70px" }}>Poster</th>
                    <th>Title & Details</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Shares</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReels.map((reel, idx) => {
                    const itemIndex = (page - 1) * limit + idx + 1;
                    const thumbUrl = reel.thumbnail || reel.thumbnailUrl;
                    const isPublished = reel.isPublished !== false;

                    return (
                      <tr key={reel._id || idx}>
                        {/* Number Index */}
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                          }}
                        >
                          {itemIndex}
                        </td>

                        {/* Reel Vertical Poster Thumbnail */}
                        <td>
                          <div
                            style={{
                              position: "relative",
                              width: "48px",
                              height: "72px",
                              borderRadius: "7px",
                              overflow: "hidden",
                              background: "var(--bg3)",
                              border: "1px solid var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={reel.title || "AI Reel"}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/placeholder-image.jpg";
                                }}
                              />
                            ) : (
                              <Film size={18} style={{ color: "var(--text-muted)" }} />
                            )}
                          </div>
                        </td>

                        {/* Title, Duration & Description */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text)",
                                  fontSize: "0.86rem",
                                }}
                              >
                                {reel.title || "Untitled Reel"}
                              </span>
                              {reel.duration && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    background: "var(--bg3)",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid var(--border)",
                                    fontWeight: 500,
                                  }}
                                >
                                  <Clock size={10} />
                                  {reel.duration}
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: "0.78rem",
                                color: "var(--text-muted)",
                                maxWidth: "340px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {reel.description || "No description provided."}
                            </div>
                          </div>
                        </td>

                        {/* Views */}
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "var(--text-soft)",
                              fontSize: "0.82rem",
                              fontWeight: 500,
                            }}
                          >
                            <Eye size={13} style={{ color: "var(--text-muted)" }} />
                            {Number(reel.views || 0).toLocaleString("en-IN")}
                          </div>
                        </td>

                        {/* Likes */}
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "var(--text-soft)",
                              fontSize: "0.82rem",
                              fontWeight: 500,
                            }}
                          >
                            <Heart size={13} style={{ color: "#FF0F8A" }} />
                            {Number(reel.like || 0).toLocaleString("en-IN")}
                          </div>
                        </td>

                        {/* Shares */}
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "var(--text-soft)",
                              fontSize: "0.82rem",
                              fontWeight: 500,
                            }}
                          >
                            <Share2 size={13} style={{ color: "#3B82F6" }} />
                            {Number(reel.shares || 0).toLocaleString("en-IN")}
                          </div>
                        </td>

                        {/* Priority */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: "var(--bg3)",
                              color: "var(--text-soft)",
                              border: "1px solid var(--border)",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                            }}
                          >
                            P-{reel.priority || 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${
                              isPublished ? "badge-pub" : "badge-draft"
                            }`}
                          >
                            {isPublished ? "Published" : "Draft"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div
                            className="tbl-actions"
                            style={{ justifyContent: "flex-end" }}
                          >
                            <button
                              className="icon-btn edit"
                              onClick={() => handleOpenEdit(reel)}
                              title="Edit Reel Details"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="icon-btn del"
                              onClick={() => handleConfirmDelete(reel)}
                              title="Delete Reel"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Symmetrical Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="pagination-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span
                  className="pagination-info"
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  Showing page{" "}
                  <strong style={{ color: "var(--text)" }}>{page}</strong> of{" "}
                  {totalPages} ({filteredReels.length} total reels)
                </span>
                <div className="pagination-btns" style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      opacity: page === 1 ? 0.4 : 1,
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      padding: "4px 10px",
                      fontSize: "0.76rem",
                    }}
                  >
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      opacity: page === totalPages ? 0.4 : 1,
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                      padding: "4px 10px",
                      fontSize: "0.76rem",
                    }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Refined Minimal Edit AI Reel Modal ── */}
      {editingReel && (
        <div
          className="modal-overlay"
          onClick={() => !formLoading && setEditingReel(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="user-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              padding: 22,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div className="up-min-head" style={{ padding: 0, paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(255, 209, 26, 0.15)",
                    border: "1px solid rgba(255, 209, 26, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                  }}
                >
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="up-min-title" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    Edit AI Reel
                  </h3>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>
                    Update title, duration, media assets, or publication status
                  </p>
                </div>
              </div>
              <button
                className="up-min-close"
                onClick={() => !formLoading && setEditingReel(null)}
                disabled={formLoading}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={handleSubmitEdit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {/* Reel Title */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Reel Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Urban Dreams in 8K"
                  required
                  disabled={formLoading}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Brief synopsis or tags..."
                  rows={2}
                  disabled={formLoading}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Duration & Priority Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Duration (e.g. 0:15)
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={form.duration}
                    onChange={handleInputChange}
                    placeholder="0:15"
                    disabled={formLoading}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Display Priority
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={form.priority}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={formLoading}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Video Asset Section */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-soft)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Video size={14} style={{ color: "var(--primary)" }} /> Video Asset
                </label>

                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  accept="video/*"
                  disabled={formLoading}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => videoInputRef.current.click()}
                    disabled={formLoading}
                    style={{
                      fontSize: "0.78rem",
                      padding: "5px 12px",
                      borderRadius: 6,
                      height: "auto",
                    }}
                  >
                    <Upload size={13} /> Select Local Video
                  </button>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      color: "var(--text-muted)",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {videoFile ? videoFile.name : (form.videoUrl ? "URL Mode Override active" : "No new file chosen")}
                  </span>
                </div>

                <input
                  type="text"
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={handleInputChange}
                  placeholder="Or direct Bunny CDN video URL..."
                  disabled={formLoading}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.78rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Poster Thumbnail Section */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-soft)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ImageIcon size={14} style={{ color: "#FF0F8A" }} /> Thumbnail Poster Image
                </label>

                <input
                  type="file"
                  ref={thumbnailInputRef}
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  disabled={formLoading}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => thumbnailInputRef.current.click()}
                    disabled={formLoading}
                    style={{
                      fontSize: "0.78rem",
                      padding: "5px 12px",
                      borderRadius: 6,
                      height: "auto",
                    }}
                  >
                    <Upload size={13} /> Select Local Poster
                  </button>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      color: "var(--text-muted)",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {thumbnailFile ? thumbnailFile.name : (form.thumbnailUrl ? "URL Mode Override active" : "No new file chosen")}
                  </span>
                </div>

                <input
                  type="text"
                  name="thumbnailUrl"
                  value={form.thumbnailUrl}
                  onChange={handleInputChange}
                  placeholder="Or direct Bunny CDN poster URL..."
                  disabled={formLoading}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.78rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Published Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "var(--bg3)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
              >
                <input
                  type="checkbox"
                  id="modalIsPublished"
                  name="isPublished"
                  checked={form.isPublished}
                  onChange={handleInputChange}
                  disabled={formLoading}
                  style={{ width: "16px", height: "16px", accentColor: "var(--primary)", cursor: "pointer" }}
                />
                <label
                  htmlFor="modalIsPublished"
                  style={{
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    margin: 0,
                    userSelect: "none",
                  }}
                >
                  Published & visible to viewers in OTT apps
                </label>
              </div>

              {/* Upload Progress Bar */}
              {formLoading && uploadProgress > 0 && (
                <div
                  style={{
                    background: "var(--bg3)",
                    borderRadius: 8,
                    padding: 10,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <span>Uploading Assets to Bunny CDN...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "var(--border)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "var(--primary)",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 4,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingReel(null)}
                  disabled={formLoading}
                  style={{ padding: "7px 14px", borderRadius: 8, fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {formLoading ? (
                    <>
                      <Loader size={14} className="spin-icon" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Sleek Confirmation Popup Dialog ── */}
      {dialog.isOpen && (
        <div
          className="modal-overlay confirm-overlay"
          onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="confirm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirm-icon-badge ${dialog.type}`}>
              <AlertCircle size={24} />
            </div>
            <h3 className="confirm-title">{dialog.title}</h3>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn-cancel"
                onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
              >
                {dialog.cancelText || "Cancel"}
              </button>
              <button
                className="confirm-btn-danger"
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  setDialog((prev) => ({ ...prev, isOpen: false }));
                }}
              >
                {dialog.confirmText || "Delete Reel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
