import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../App";
import API from "../api/axios";
import useAudioStoryForm from "../features/hooks/useAudioStoryForm";
import { createAudioStory } from "../features/services/audioStory.service";
import {
  Headphones,
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  User,
  Mic,
  Layers,
  Lock,
  ArrowUpCircle,
  Image as ImageIcon,
  Link2,
  X,
  RotateCcw,
  Rocket,
  Music,
  Check,
  Star,
  FileText,
} from "lucide-react";

import "./Dashboard.css";
import "./AddAudioStory.css";

export default function AddAudioStory() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    form,
    setForm,
    ch,
    addEp,
    removeEp,
    chEp,
    resetForm,
  } = useAudioStoryForm();

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");
  const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({ current: 0, total: 0 });
  const [categories, setCategories] = useState([]);

  // Media File & Input Mode States
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [coverMode, setCoverMode] = useState("file"); // "file" | "url"
  const [bannerMode, setBannerMode] = useState("file"); // "file" | "url"

  const [isCoverDragging, setIsCoverDragging] = useState(false);
  const [isBannerDragging, setIsBannerDragging] = useState(false);

  // Episodes file pointers
  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});
  const [episodeThumbnailFiles, setEpisodeThumbnailFiles] = useState({});

  // Input Refs
  const coverImageInputRef = useRef(null);
  const bannerImageInputRef = useRef(null);

  // Episode Modal State
  const [isEpModalOpen, setIsEpModalOpen] = useState(false);
  const [editingEpIndex, setEditingEpIndex] = useState(null);
  const [epForm, setEpForm] = useState({
    title: "",
    duration: "",
    description: "",
    audioUrl: "",
    thumbnailUrl: "",
  });
  const [modalAudioFile, setModalAudioFile] = useState(null);
  const [modalThumbFile, setModalThumbFile] = useState(null);
  const modalAudioInputRef = useRef(null);
  const modalThumbInputRef = useRef(null);

  // Custom Confirmation Dialog
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
  });

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/admin/categories");
        if (res.data?.success) {
          const list = (res.data.categories || []).filter((c) => c.isActive !== false);
          setCategories(list);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Format File Size helper
  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Readiness KPI Computations
  const isDetailsReady = !!form.title?.trim();
  const selectedCategoriesCount = useMemo(() => {
    if (Array.isArray(form.categories)) return form.categories.length;
    return form.categories ? 1 : 0;
  }, [form.categories]);

  const hasCover = !!coverImageFile || !!form.coverImage;
  const hasBanner = !!bannerImageFile || !!form.bannerImage;
  const episodesCount = form.episodes?.length || 0;

  // Drag & Drop Handlers for Cover
  const handleCoverDrop = (e) => {
    e.preventDefault();
    setIsCoverDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setCoverImageFile(file);
        setCoverMode("file");
      } else {
        showToast("Please select a valid image file", "error");
      }
    }
  };

  // Drag & Drop Handlers for Banner
  const handleBannerDrop = (e) => {
    e.preventDefault();
    setIsBannerDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setBannerImageFile(file);
        setBannerMode("file");
      } else {
        showToast("Please select a valid image file", "error");
      }
    }
  };

  // Reset Form with Confirmation
  const handlePromptReset = () => {
    setDialog({
      isOpen: true,
      title: "Reset Form?",
      message: "Are you sure you want to discard all entered audio story details and episodes? This cannot be undone.",
      type: "warning",
      confirmText: "Discard & Reset",
      cancelText: "Keep Editing",
      onConfirm: () => {
        resetForm();
        setCoverImageFile(null);
        setBannerImageFile(null);
        setEpisodeVideoFiles({});
        setEpisodeThumbnailFiles({});
        setUploadProgress(0);
        setUploadPhase("");
        showToast("Form has been reset", "info");
      },
    });
  };

  // Episode Modal Management
  const handleOpenAddEpisode = () => {
    setEditingEpIndex(null);
    setEpForm({
      title: "",
      duration: "",
      description: "",
      audioUrl: "",
      thumbnailUrl: "",
    });
    setModalAudioFile(null);
    setModalThumbFile(null);
    setIsEpModalOpen(true);
  };

  const handleOpenEditEpisode = (index) => {
    const ep = form.episodes[index];
    setEditingEpIndex(index);
    setEpForm({
      title: ep.title || "",
      duration: ep.duration || "",
      description: ep.description || "",
      audioUrl: ep.audioUrl || "",
      thumbnailUrl: ep.thumbnailUrl || "",
    });
    setModalAudioFile(episodeVideoFiles[index] || null);
    setModalThumbFile(episodeThumbnailFiles[index] || null);
    setIsEpModalOpen(true);
  };

  const handleSaveEpisodeModal = () => {
    if (!epForm.title.trim()) {
      showToast("Episode title is required", "error");
      return;
    }

    if (editingEpIndex !== null) {
      // Update existing
      setForm((f) => ({
        ...f,
        episodes: f.episodes.map((ep, j) =>
          j === editingEpIndex
            ? {
                ...ep,
                title: epForm.title,
                duration: epForm.duration,
                description: epForm.description,
                audioUrl: epForm.audioUrl || "",
                thumbnailUrl: epForm.thumbnailUrl || "",
              }
            : ep
        ),
      }));

      setEpisodeVideoFiles((prev) => {
        const next = { ...prev };
        if (modalAudioFile) next[editingEpIndex] = modalAudioFile;
        else delete next[editingEpIndex];
        return next;
      });

      setEpisodeThumbnailFiles((prev) => {
        const next = { ...prev };
        if (modalThumbFile) next[editingEpIndex] = modalThumbFile;
        else delete next[editingEpIndex];
        return next;
      });

      showToast("Episode updated", "success");
    } else {
      // Append new
      const newIndex = form.episodes.length;
      setForm((f) => ({
        ...f,
        episodes: [
          ...f.episodes,
          {
            title: epForm.title,
            duration: epForm.duration,
            description: epForm.description,
            audioUrl: epForm.audioUrl || "",
            thumbnailUrl: epForm.thumbnailUrl || "",
          },
        ],
      }));

      if (modalAudioFile) {
        setEpisodeVideoFiles((prev) => ({ ...prev, [newIndex]: modalAudioFile }));
      }
      if (modalThumbFile) {
        setEpisodeThumbnailFiles((prev) => ({ ...prev, [newIndex]: modalThumbFile }));
      }

      showToast("Episode added", "success");
    }

    setIsEpModalOpen(false);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!form.title?.trim()) {
      showToast("Please enter an audio story title", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("main");

    try {
      await createAudioStory({
        form,
        coverImageFile,
        bannerImageFile,
        episodeVideoFiles,
        episodeThumbnailFiles,
        onCoverProgress: (percent) => setUploadProgress(percent),
        onBannerProgress: (percent) => setUploadProgress(percent),
        onEpisodeProgress: (current, total, percent) => {
          setUploadPhase("episodes");
          setCurrentEpisodeInfo({ current, total });
          setUploadProgress(percent);
          if (current === total && percent === 100) {
            setUploadPhase("complete");
          }
        },
      });

      showToast("Audio Story published successfully! 🚀", "success");
      navigate("/dashboard/audio-stories");
    } catch (err) {
      console.error("Publishing error:", err);
      showToast(err.response?.data?.message || "Error publishing audio story", "error");
      setUploadProgress(0);
      setUploadPhase("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-audio-page">
      {/* ── Top Header Navigation ── */}
      <div className="audio-header-top">
        <button
          type="button"
          className="audio-back-btn"
          onClick={() => navigate("/dashboard/audio-stories")}
          title="Back to library"
        >
          <ArrowLeft size={15} />
          <span>Back to Audio Stories</span>
        </button>

        <div className="audio-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handlePromptReset}
            disabled={loading}
            style={{ fontSize: "0.82rem", padding: "7px 14px" }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              fontSize: "0.82rem",
              padding: "7px 18px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? (
              <>
                <div className="spin-icon">
                  <RotateCcw size={14} />
                </div>
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Rocket size={15} />
                <span>Publish Story</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Page Title ── */}
      <div className="pg-header" style={{ paddingBottom: 0 }}>
        <div>
          <h1 className="pg-title">
            <Headphones className="pg-title-icon" size={22} />
            Publish New Audio Story
          </h1>
          <p className="pg-sub">
            Fill in the metadata, upload cover artwork, and organize audio episodes for OTT listeners
          </p>
        </div>
      </div>

      {/* ── Executive 4-Card Readiness KPI Strip ── */}
      <div className="audio-readiness-grid">
        {/* Basic Details */}
        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Story Details</span>
            <div className="readiness-value">
              {isDetailsReady ? form.title : "Title Missing"}
            </div>
          </div>
          <span
            className={`readiness-badge ${isDetailsReady ? "ready" : "pending"}`}
          >
            {isDetailsReady ? <Check size={13} /> : <AlertCircle size={13} />}
            {isDetailsReady ? "Ready" : "Required"}
          </span>
        </div>

        {/* Categories */}
        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Categories</span>
            <div className="readiness-value">
              {selectedCategoriesCount > 0
                ? `${selectedCategoriesCount} Selected`
                : "None Selected"}
            </div>
          </div>
          <span
            className={`readiness-badge ${
              selectedCategoriesCount > 0 ? "ready" : "neutral"
            }`}
          >
            {selectedCategoriesCount > 0 && <Check size={13} />}
            {selectedCategoriesCount > 0 ? "Configured" : "Optional"}
          </span>
        </div>

        {/* Visual Artwork */}
        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Visual Artwork</span>
            <div className="readiness-value">
              {hasCover && hasBanner
                ? "Cover & Banner Ready"
                : hasCover
                ? "Cover Ready"
                : hasBanner
                ? "Banner Ready"
                : "No Artwork"}
            </div>
          </div>
          <span
            className={`readiness-badge ${
              hasCover && hasBanner ? "ready" : hasCover ? "pending" : "neutral"
            }`}
          >
            {hasCover ? <Check size={13} /> : <ImageIcon size={13} />}
            {hasCover && hasBanner ? "Complete" : hasCover ? "Partial" : "Pending"}
          </span>
        </div>

        {/* Episodes */}
        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Episodes</span>
            <div className="readiness-value">
              {episodesCount > 0 ? `${episodesCount} Added` : "0 Episodes"}
            </div>
          </div>
          <span
            className={`readiness-badge ${episodesCount > 0 ? "ready" : "pending"}`}
          >
            {episodesCount > 0 ? <Check size={13} /> : <Mic size={13} />}
            {episodesCount > 0 ? "Ready" : "Add Chapters"}
          </span>
        </div>
      </div>

      {/* ── Two-Column Studio Layout ── */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div className="audio-studio-grid">
          {/* ═══════════ LEFT COLUMN (METADATA & EPISODES) ═══════════ */}
          <div className="audio-column">
            {/* Basic Information Card */}
            <div className="audio-card">
              <div className="card-head">
                <div className="card-title-group">
                  <div className="card-icon-wrap">
                    <Star size={16} />
                  </div>
                  <div>
                    <h3 className="card-title">Basic Information</h3>
                    <p className="card-sub">Core metadata and content classification</p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="form-field-group">
                <div className="form-label-row">
                  <label className="field-label">
                    Audio Story Title <span className="required">*</span>
                  </label>
                  <span className="field-hint">e.g. Whispers in the Dark</span>
                </div>
                <input
                  type="text"
                  name="title"
                  className="studio-input"
                  placeholder="Enter compelling story title..."
                  value={form.title}
                  onChange={ch}
                  required
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="form-field-group">
                <div className="form-label-row">
                  <label className="field-label">
                    Synopsis / Description <span className="required">*</span>
                  </label>
                  <span className="field-hint">Engaging summary for viewers</span>
                </div>
                <textarea
                  name="description"
                  className="studio-input studio-textarea"
                  placeholder="Tell listeners what this audio journey is about..."
                  value={form.description}
                  onChange={ch}
                  rows={3}
                  required
                  disabled={loading}
                />
              </div>

              {/* Author, Narrator, Priority (3-Column) */}
              <div className="form-3col">
                <div className="form-field-group">
                  <label className="field-label">
                    <User size={13} /> Author
                  </label>
                  <input
                    type="text"
                    name="author"
                    className="studio-input"
                    placeholder="Author name"
                    value={form.author}
                    onChange={ch}
                    disabled={loading}
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">
                    <Mic size={13} /> Narrator / Voice
                  </label>
                  <input
                    type="text"
                    name="narrator"
                    className="studio-input"
                    placeholder="Voice artist"
                    value={form.narrator}
                    onChange={ch}
                    disabled={loading}
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">
                    <ArrowUpCircle size={13} /> Priority
                  </label>
                  <input
                    type="number"
                    name="priority"
                    className="studio-input"
                    placeholder="0 = Auto"
                    min="0"
                    value={form.priority}
                    onChange={ch}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="form-field-group" style={{ marginTop: 4 }}>
                <div className="form-label-row">
                  <label className="field-label">
                    <Layers size={13} /> Selected Categories
                  </label>
                  <span className="field-hint">
                    {selectedCategoriesCount} selected (Click to toggle)
                  </span>
                </div>

                <div className="category-pill-wrap">
                  {categories.map((cat) => {
                    const isSelected = Array.isArray(form.categories)
                      ? form.categories.includes(cat._id)
                      : form.categories === cat._id;

                    return (
                      <button
                        key={cat._id}
                        type="button"
                        className={`category-tag-btn ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          let current = Array.isArray(form.categories)
                            ? [...form.categories]
                            : form.categories
                            ? [form.categories]
                            : [];
                          if (current.includes(cat._id)) {
                            current = current.filter((id) => id !== cat._id);
                          } else {
                            current.push(cat._id);
                          }
                          setForm((f) => ({ ...f, categories: current }));
                        }}
                        disabled={loading}
                      >
                        {isSelected && <Check size={12} />}
                        {cat.name}
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No categories found.
                    </span>
                  )}
                </div>
              </div>

              {/* Publication Options */}
              <div className="form-field-group" style={{ marginTop: 6 }}>
                <label className="field-label">Availability & Distribution</label>
                <div className="pub-options-grid">
                  {/* Premium */}
                  <div
                    className={`pub-option-card ${form.isPremium ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, isPremium: !f.isPremium }))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div className="pub-option-info">
                      <span className="pub-option-title">
                        <Lock size={13} style={{ marginRight: 4 }} /> Premium
                      </span>
                      <span className="pub-option-sub">Subscriber tier only</span>
                    </div>
                    <label className="switch-container switch-gold" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        name="isPremium"
                        className="switch-input"
                        checked={form.isPremium}
                        onChange={ch}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* Published */}
                  <div
                    className={`pub-option-card ${form.isPublished ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, isPublished: !f.isPublished }))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div className="pub-option-info">
                      <span className="pub-option-title" style={{ color: form.isPublished ? "#10b981" : "inherit" }}>
                        <ArrowUpCircle size={13} style={{ marginRight: 4 }} /> Published
                      </span>
                      <span className="pub-option-sub">Visible to listeners</span>
                    </div>
                    <label className="switch-container" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        name="isPublished"
                        className="switch-input"
                        checked={form.isPublished}
                        onChange={ch}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* Coming Soon */}
                  <div
                    className={`pub-option-card ${form.isComingSoon ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, isComingSoon: !f.isComingSoon }))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div className="pub-option-info">
                      <span className="pub-option-title" style={{ color: form.isComingSoon ? "#f59e0b" : "inherit" }}>
                        <Clock size={13} style={{ marginRight: 4 }} /> Coming Soon
                      </span>
                      <span className="pub-option-sub">Teaser announcement</span>
                    </div>
                    <label className="switch-container" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        name="isComingSoon"
                        className="switch-input"
                        checked={form.isComingSoon}
                        onChange={ch}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>

                {/* Conditional Scheduled Date */}
                {form.isComingSoon && (
                  <div style={{ marginTop: 10 }}>
                    <label className="field-label" style={{ marginBottom: 6 }}>
                      <Calendar size={13} /> Scheduled Release Date
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduleDate"
                      className="studio-input"
                      value={form.scheduleDate || ""}
                      onChange={ch}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Episodes Management Card */}
            <div className="audio-card">
              <div className="card-head">
                <div className="card-title-group">
                  <div className="card-icon-wrap" style={{ color: "#3B82F6" }}>
                    <Mic size={16} />
                  </div>
                  <div>
                    <h3 className="card-title">
                      Episodes ({episodesCount})
                    </h3>
                    <p className="card-sub">Add voice chapters, track duration, and upload audio files</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenAddEpisode}
                  disabled={loading}
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={15} /> Add Episode
                </button>
              </div>

              <div className="episodes-container">
                {form.episodes && form.episodes.length > 0 ? (
                  form.episodes.map((ep, idx) => {
                    const localAudio = episodeVideoFiles[idx];
                    const localThumb = episodeThumbnailFiles[idx];
                    const thumbSrc = localThumb
                      ? URL.createObjectURL(localThumb)
                      : ep.thumbnailUrl || null;
                    const hasAudio = !!localAudio || !!ep.audioUrl;

                    return (
                      <div key={idx} className="audio-ep-row">
                        <div className="ep-left">
                          <span className="ep-num-pill">
                            {String(idx + 1).padStart(2, "0")}
                          </span>

                          <div className="ep-thumb-card">
                            {thumbSrc ? (
                              <img
                                src={thumbSrc}
                                alt={ep.title || "Episode"}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/placeholder-image.jpg";
                                }}
                              />
                            ) : (
                              <Music size={15} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                            )}
                          </div>

                          <div className="ep-title-meta">
                            <span className="ep-title-text">
                              {ep.title || `Episode ${idx + 1}`}
                            </span>
                            <div className="ep-badges-row">
                              {ep.duration && (
                                <span className="ep-duration-badge">
                                  <Clock size={11} /> {ep.duration}
                                </span>
                              )}
                              <span
                                className={`ep-audio-pill ${
                                  hasAudio ? "added" : "none"
                                }`}
                              >
                                {localAudio
                                  ? "Audio File Attached"
                                  : ep.audioUrl
                                  ? "Stream URL Linked"
                                  : "No Audio"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ep-actions-row">
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => handleOpenEditEpisode(idx)}
                            title="Edit Episode"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn del"
                            onClick={() => removeEp(idx)}
                            title="Delete Episode"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "44px 20px",
                      borderRadius: 10,
                      background: "var(--bg3)",
                      border: "1px dashed var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--bg2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        marginBottom: 10,
                      }}
                    >
                      <Mic size={22} style={{ opacity: 0.6 }} />
                    </div>
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                      No episodes added yet
                    </p>
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        margin: "4px 0 16px 0",
                        maxWidth: 340,
                      }}
                    >
                      Build your audio story playlist by attaching voice files and chapter details.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenAddEpisode}
                      style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                    >
                      <Plus size={14} /> Add First Episode
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════ RIGHT COLUMN (ARTWORK, PREVIEW & PUBLISH) ═══════════ */}
          <div className="audio-column">
            {/* Visual Artwork Card */}
            <div className="audio-card">
              <div className="card-head">
                <div className="card-title-group">
                  <div className="card-icon-wrap" style={{ color: "#FF0F8A" }}>
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <h3 className="card-title">Visual Artwork</h3>
                    <p className="card-sub">Vertical cover poster and wide backdrop banner</p>
                  </div>
                </div>
              </div>

              {/* Cover Artwork (Vertical 2:3) */}
              <div className="form-field-group">
                <div className="dropzone-head">
                  <label className="field-label">
                    Cover Poster (Vertical 2:3)
                  </label>
                  <div className="mode-pills">
                    <button
                      type="button"
                      className={`mode-pill-btn ${coverMode === "file" ? "active" : ""}`}
                      onClick={() => setCoverMode("file")}
                    >
                      <Upload size={11} /> File
                    </button>
                    <button
                      type="button"
                      className={`mode-pill-btn ${coverMode === "url" ? "active" : ""}`}
                      onClick={() => setCoverMode("url")}
                    >
                      <Link2 size={11} /> URL
                    </button>
                  </div>
                </div>

                {coverMode === "file" ? (
                  <div
                    className={`dropzone-box ${isCoverDragging ? "dragging" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setIsCoverDragging(true); }}
                    onDragLeave={() => setIsCoverDragging(false)}
                    onDrop={handleCoverDrop}
                  >
                    {coverImageFile ? (
                      <div className="media-preview-box cover-aspect">
                        <img
                          src={URL.createObjectURL(coverImageFile)}
                          alt="Cover Preview"
                        />
                        <div className="media-preview-overlay">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => coverImageInputRef.current?.click()}
                            style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(0,0,0,0.7)" }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setCoverImageFile(null)}
                            style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(244,63,94,0.7)", color: "#fff" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="dropzone-content-area"
                        onClick={() => coverImageInputRef.current?.click()}
                      >
                        <Upload size={22} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                        <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                          Choose Cover Image
                        </span>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                          Drag & drop or click (Recommended: 600×900px)
                        </span>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={coverImageInputRef}
                      onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="text"
                      name="coverImage"
                      className="studio-input"
                      placeholder="https://cdn.example.com/cover.jpg"
                      value={form.coverImage}
                      onChange={ch}
                    />
                    {form.coverImage && (
                      <div className="media-preview-box cover-aspect" style={{ maxHeight: 160 }}>
                        <img
                          src={form.coverImage}
                          alt="Cover URL Preview"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Banner Artwork (Wide 16:9) */}
              <div className="form-field-group" style={{ marginTop: 10 }}>
                <div className="dropzone-head">
                  <label className="field-label">
                    Backdrop Banner (Wide 16:9)
                  </label>
                  <div className="mode-pills">
                    <button
                      type="button"
                      className={`mode-pill-btn ${bannerMode === "file" ? "active" : ""}`}
                      onClick={() => setBannerMode("file")}
                    >
                      <Upload size={11} /> File
                    </button>
                    <button
                      type="button"
                      className={`mode-pill-btn ${bannerMode === "url" ? "active" : ""}`}
                      onClick={() => setBannerMode("url")}
                    >
                      <Link2 size={11} /> URL
                    </button>
                  </div>
                </div>

                {bannerMode === "file" ? (
                  <div
                    className={`dropzone-box ${isBannerDragging ? "dragging" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setIsBannerDragging(true); }}
                    onDragLeave={() => setIsBannerDragging(false)}
                    onDrop={handleBannerDrop}
                  >
                    {bannerImageFile ? (
                      <div className="media-preview-box banner-aspect">
                        <img
                          src={URL.createObjectURL(bannerImageFile)}
                          alt="Banner Preview"
                        />
                        <div className="media-preview-overlay">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => bannerImageInputRef.current?.click()}
                            style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(0,0,0,0.7)" }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setBannerImageFile(null)}
                            style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(244,63,94,0.7)", color: "#fff" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="dropzone-content-area"
                        onClick={() => bannerImageInputRef.current?.click()}
                      >
                        <Upload size={22} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                        <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                          Choose Banner Image
                        </span>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                          Drag & drop or click (Recommended: 1920×1080px)
                        </span>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={bannerImageInputRef}
                      onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="text"
                      name="bannerImage"
                      className="studio-input"
                      placeholder="https://cdn.example.com/banner.jpg"
                      value={form.bannerImage}
                      onChange={ch}
                    />
                    {form.bannerImage && (
                      <div className="media-preview-box banner-aspect">
                        <img
                          src={form.bannerImage}
                          alt="Banner URL Preview"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress Bar (Active during save) */}
            {loading && (
              <div className="audio-upload-progress">
                <div className="progress-header">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="spin-icon">
                      <RotateCcw size={14} style={{ color: "var(--primary)" }} />
                    </div>
                    {uploadPhase === "main" && "Uploading Cover & Banner Assets..."}
                    {uploadPhase === "episodes" &&
                      `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                    {uploadPhase === "complete" && "Finalizing Audio Story..."}
                  </span>
                  <span style={{ color: "var(--primary)" }}>{uploadProgress}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Please keep this window open until publishing is complete.
                </span>
              </div>
            )}

            {/* Bottom Actions Card */}
            <div className="audio-card" style={{ padding: "18px 22px" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "44px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <div className="spin-icon">
                      <RotateCcw size={16} />
                    </div>
                    <span>Publishing to Platform...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={17} />
                    <span>Publish Audio Story</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Sleek Episode Creation / Edit Modal ── */}
      {isEpModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsEpModalOpen(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="user-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Modal Header */}
            <div className="up-min-head" style={{ padding: 0, paddingBottom: 12, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3B82F6",
                  }}
                >
                  <Music size={17} />
                </div>
                <div>
                  <h3 className="up-min-title" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    {editingEpIndex !== null ? "Edit Episode" : "Add New Episode"}
                  </h3>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>
                    Provide episode track name, audio source, and optional poster
                  </p>
                </div>
              </div>
              <button
                className="up-min-close"
                onClick={() => setIsEpModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Title & Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 10 }}>
                <div className="form-field-group">
                  <label className="field-label">
                    Episode Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="studio-input"
                    placeholder="e.g. Chapter 1: The Beginning"
                    value={epForm.title}
                    onChange={(e) => setEpForm({ ...epForm, title: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">Duration</label>
                  <input
                    type="text"
                    className="studio-input"
                    placeholder="e.g. 15:30"
                    value={epForm.duration}
                    onChange={(e) => setEpForm({ ...epForm, duration: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-field-group">
                <label className="field-label">Synopsis (Optional)</label>
                <textarea
                  className="studio-input"
                  style={{ minHeight: "60px", resize: "vertical" }}
                  placeholder="Episode brief synopsis..."
                  value={epForm.description}
                  onChange={(e) => setEpForm({ ...epForm, description: e.target.value })}
                />
              </div>

              {/* Audio Source Block */}
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
                <label className="field-label" style={{ color: "var(--text-soft)" }}>
                  <Music size={13} style={{ color: "var(--primary)" }} /> Audio File or Stream
                </label>

                <input
                  type="file"
                  ref={modalAudioInputRef}
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setModalAudioFile(f);
                      setEpForm((prev) => ({ ...prev, audioUrl: "" }));
                    }
                  }}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => modalAudioInputRef.current?.click()}
                    style={{ fontSize: "0.78rem", padding: "5px 12px", borderRadius: 6 }}
                  >
                    <Upload size={13} /> Select Audio File
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
                    {modalAudioFile
                      ? modalAudioFile.name
                      : epForm.audioUrl
                      ? "URL Linked"
                      : "No file chosen"}
                  </span>
                </div>

                <input
                  type="text"
                  className="studio-input"
                  style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                  placeholder="Or paste direct audio CDN URL (https://...)"
                  value={epForm.audioUrl}
                  onChange={(e) => {
                    setEpForm({ ...epForm, audioUrl: e.target.value });
                    if (e.target.value) setModalAudioFile(null);
                  }}
                />
              </div>

              {/* Episode Thumbnail Block */}
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
                <label className="field-label" style={{ color: "var(--text-soft)" }}>
                  <ImageIcon size={13} style={{ color: "#FF0F8A" }} /> Episode Poster (Optional)
                </label>

                <input
                  type="file"
                  ref={modalThumbInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setModalThumbFile(f);
                      setEpForm((prev) => ({ ...prev, thumbnailUrl: "" }));
                    }
                  }}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => modalThumbInputRef.current?.click()}
                    style={{ fontSize: "0.78rem", padding: "5px 12px", borderRadius: 6 }}
                  >
                    <Upload size={13} /> Select Image File
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
                    {modalThumbFile
                      ? modalThumbFile.name
                      : epForm.thumbnailUrl
                      ? "URL Linked"
                      : "No image chosen"}
                  </span>
                </div>

                <input
                  type="text"
                  className="studio-input"
                  style={{ fontSize: "0.78rem", padding: "6px 10px" }}
                  placeholder="Or paste direct thumbnail URL (https://...)"
                  value={epForm.thumbnailUrl}
                  onChange={(e) => {
                    setEpForm({ ...epForm, thumbnailUrl: e.target.value });
                    if (e.target.value) setModalThumbFile(null);
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 6,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsEpModalOpen(false)}
                style={{ padding: "7px 14px", borderRadius: 8, fontSize: "0.82rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEpisodeModal}
                style={{ padding: "7px 18px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600 }}
              >
                {editingEpIndex !== null ? "Save Changes" : "Add Episode"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirmation Dialog Modal ── */}
      {dialog.isOpen && (
        <div
          className="modal-overlay confirm-overlay"
          onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
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
                {dialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
