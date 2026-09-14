import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../App";
import {
  Film,
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowLeft,
  Save,
  Loader,
  Link2,
  Clock,
  Check,
  FileVideo,
  Eye,
  Sliders,
  X,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { createAIReel } from "../features/services/aiReel.service";

import "./Dashboard.css";
import "./AddAIReels.css";

export default function AddAIReels() {
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  // Input Modes ("file" or "url")
  const [videoMode, setVideoMode] = useState("file");
  const [thumbnailMode, setThumbnailMode] = useState("file");

  // Drag states
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [isThumbDragging, setIsThumbDragging] = useState(false);

  // Processing & Upload Progress State
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "thumbnail", "video", "saving"
  const [validationError, setValidationError] = useState("");
  const [autoDetectedDuration, setAutoDetectedDuration] = useState("");

  // Interactive Modal Popup State
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "confirm", // "validation" | "confirm" | "uploading" | "success" | "error"
    title: "",
    message: "",
  });

  // Input Refs
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (validationError) setValidationError("");
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Video File Processing & Metadata Extraction
  const handleVideoFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setValidationError("Please select a valid video file (MP4, WebM, MOV).");
      return;
    }
    setValidationError("");
    setVideoFile(file);

    // Silently inspect video duration in background
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const totalSecs = Math.floor(tempVideo.duration);
      if (!isNaN(totalSecs) && totalSecs > 0) {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
        setAutoDetectedDuration(formatted);
        setForm((prev) => (prev.duration ? prev : { ...prev, duration: formatted }));
      }
    };
    tempVideo.src = objectUrl;
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setAutoDetectedDuration("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // Thumbnail File Processing
  const handleThumbnailFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setValidationError("Please select an image file (JPG, PNG, WEBP).");
      return;
    }
    setValidationError("");
    setThumbnailFile(file);
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  // Drag & Drop Handlers
  const handleVideoDrop = (e) => {
    e.preventDefault();
    setIsVideoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoFileSelect(e.dataTransfer.files[0]);
      setVideoMode("file");
    }
  };

  const handleThumbDrop = (e) => {
    e.preventDefault();
    setIsThumbDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbnailFileSelect(e.dataTransfer.files[0]);
      setThumbnailMode("file");
    }
  };

  // Reset entire form
  const handleResetForm = () => {
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
    setAutoDetectedDuration("");
    setValidationError("");
    setUploadProgress(0);
    setUploadPhase("");
    setModalState({ isOpen: false, type: "confirm", title: "", message: "" });
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  // Validation & Triggering the Modal Popup
  const handlePublishClick = () => {
    // 1. Check title
    if (!form.title.trim()) {
      setModalState({
        isOpen: true,
        type: "validation",
        title: "Reel Title Required",
        message: "Please enter a descriptive title for this reel before publishing.",
      });
      return;
    }

    // 2. Check video
    const hasVideo = videoMode === "file" ? !!videoFile : !!form.videoUrl.trim();
    if (!hasVideo) {
      setModalState({
        isOpen: true,
        type: "validation",
        title: "Video Asset Missing",
        message: "Please upload a 9:16 vertical video file (MP4, WebM, MOV) or enter a direct video CDN stream URL.",
      });
      return;
    }

    // 3. Check thumbnail
    const hasThumbnail = thumbnailMode === "file" ? !!thumbnailFile : !!form.thumbnailUrl.trim();
    if (!hasThumbnail) {
      setModalState({
        isOpen: true,
        type: "validation",
        title: "Poster Cover Missing",
        message: "Please upload a thumbnail poster cover image or enter a direct image URL.",
      });
      return;
    }

    // 4. All fields valid -> Open Confirmation Modal
    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Publish AI Reel?",
      message: "Please review your reel details before publishing to Bunny CDN and the catalog.",
    });
  };

  // Execute Actual Upload & Creation
  const handleExecutePublish = async () => {
    setFormLoading(true);
    setUploadProgress(0);
    setUploadPhase("starting");

    // Switch modal into uploading mode
    setModalState({
      isOpen: true,
      type: "uploading",
      title: "Publishing AI Reel...",
      message: "Uploading assets to Bunny CDN and registering the reel in the streaming catalog.",
    });

    try {
      await createAIReel({
        form: {
          ...form,
          thumbnail: form.thumbnailUrl,
        },
        videoFile: videoMode === "file" ? videoFile : null,
        thumbnailFile: thumbnailMode === "file" ? thumbnailFile : null,
        onProgress: (percent) => setUploadProgress(percent),
        onPhase: (phase) => setUploadPhase(phase),
      });

      // Show success modal
      setModalState({
        isOpen: true,
        type: "success",
        title: "AI Reel Published Successfully! 🚀",
        message: `"${form.title}" is now uploaded to Bunny CDN and available on GoliDoli OTT.`,
      });

      showToast("AI Reel published successfully! 🚀", "success");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Failed to publish AI Reel.";
      setModalState({
        isOpen: true,
        type: "error",
        title: "Publication Failed",
        message: msg,
      });
      showToast(msg, "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Readiness status indicators
  const isTitleValid = !!form.title.trim();
  const isVideoValid = videoMode === "file" ? !!videoFile : !!form.videoUrl.trim();
  const isThumbValid = thumbnailMode === "file" ? !!thumbnailFile : !!form.thumbnailUrl.trim();
  const isReadyToPublish = isTitleValid && isVideoValid && isThumbValid;

  return (
    <div className="page-section add-reel-page">
      {/* Header Navigation & Page Actions */}
      <div className="reel-header-top">
        <button
          type="button"
          className="reel-back-btn"
          onClick={() => navigate("/dashboard/ai-reels")}
          title="Return to AI Reels catalog"
        >
          <ArrowLeft size={14} /> Back to Reels Library
        </button>

        <div className="reel-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/dashboard/ai-reels")}
            disabled={formLoading}
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublishClick}
            disabled={formLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              fontSize: "0.84rem",
              fontWeight: 700,
            }}
          >
            {formLoading ? (
              <>
                <Loader size={16} className="spin-icon" /> Publishing...
              </>
            ) : (
              <>
                <Save size={16} /> Publish Reel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Page Title (Full-Width Header) */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Film className="pg-title-icon" size={20} /> Add New AI Reel
          </h1>
          <p className="pg-sub">
            Upload vertical 9:16 short video reels with automated Bunny CDN storage and feed metadata optimization
          </p>
        </div>
      </div>

      {/* Symmetrical 4-Card KPI Readiness Bar (Uses Full Width) */}
      <div className="reel-readiness-grid">
        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Format Ratio</span>
            <span className="readiness-value">9:16 Vertical</span>
          </div>
          <span className="readiness-badge neutral">Reels Ready</span>
        </div>

        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Video Stream</span>
            <span className="readiness-value">
              {videoFile
                ? formatFileSize(videoFile.size)
                : form.videoUrl
                ? "Direct URL"
                : "Not Selected"}
            </span>
          </div>
          <span className={`readiness-badge ${isVideoValid ? "ready" : "pending"}`}>
            {isVideoValid ? <Check size={12} /> : null}
            {isVideoValid ? "Attached" : "Required"}
          </span>
        </div>

        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Poster Cover</span>
            <span className="readiness-value">
              {thumbnailFile
                ? formatFileSize(thumbnailFile.size)
                : form.thumbnailUrl
                ? "Direct URL"
                : "Not Selected"}
            </span>
          </div>
          <span className={`readiness-badge ${isThumbValid ? "ready" : "pending"}`}>
            {isThumbValid ? <Check size={12} /> : null}
            {isThumbValid ? "Attached" : "Required"}
          </span>
        </div>

        <div className="readiness-card">
          <div className="readiness-info">
            <span className="readiness-label">Visibility</span>
            <span className="readiness-value">
              {form.isPublished ? "Instant Live" : "Hidden Draft"}
            </span>
          </div>
          <span className={`readiness-badge ${form.isPublished ? "ready" : "neutral"}`}>
            {form.isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      {/* Validation Alert Banner */}
      {validationError && (
        <div className="reel-alert-banner error">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Full-Width Studio Grid (Balanced Left & Right Columns) */}
      <div className="reel-main-grid">
        {/* Left Column: Reel Metadata & Publishing Settings */}
        <div className="reel-column">
          {/* Card 1: Basic Information */}
          <div className="reel-card">
            <div className="reel-card-header">
              <div className="reel-card-title-wrap">
                <div className="reel-card-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="reel-card-title">Reel Information</h2>
                  <p className="reel-card-subtitle">
                    Enter title, story description, and playback parameters
                  </p>
                </div>
              </div>
            </div>

            <div className="reel-form-group">
              <label className="reel-form-label">
                Reel Title <span className="req-badge">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder="e.g. Neon Cyberpunk Metropolis at Midnight"
                disabled={formLoading}
                className="reel-form-input"
                maxLength={120}
              />
              <div className="input-hint-row">
                <span>Display title shown in mobile feed</span>
                <span>{form.title.length}/120</span>
              </div>
            </div>

            <div className="reel-form-group">
              <label className="reel-form-label">Description & Tags</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                placeholder="Describe your reel story, hashtags (#AI #Cinematic), or context..."
                disabled={formLoading}
                rows={4}
                className="reel-form-input"
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="reel-form-row">
              <div className="reel-form-group">
                <label className="reel-form-label">Duration (e.g. 0:15)</label>
                <input
                  type="text"
                  name="duration"
                  value={form.duration}
                  onChange={handleInputChange}
                  placeholder="0:15"
                  disabled={formLoading}
                  className="reel-form-input"
                />
                <div className="input-hint-row">
                  <span>Reel duration</span>
                  {autoDetectedDuration && (
                    <span
                      className="auto-detect-pill"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, duration: autoDetectedDuration }))
                      }
                      title="Click to apply auto-detected duration"
                    >
                      <Clock size={10} /> Auto: {autoDetectedDuration}
                    </span>
                  )}
                </div>
              </div>

              <div className="reel-form-group">
                <label className="reel-form-label">Feed Priority Sequence</label>
                <input
                  type="number"
                  name="priority"
                  value={form.priority}
                  onChange={handleInputChange}
                  placeholder="0"
                  disabled={formLoading}
                  className="reel-form-input"
                  min={0}
                />
                <div className="input-hint-row">
                  <span>0 = newest auto priority</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Publishing & Feed Settings */}
          <div className="reel-card">
            <div className="reel-card-header">
              <div className="reel-card-title-wrap">
                <div className="reel-card-icon">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 className="reel-card-title">Publishing & Feed Visibility</h2>
                  <p className="reel-card-subtitle">
                    Control instant publication and platform availability
                  </p>
                </div>
              </div>
            </div>

            {/* Visibility Toggle Switch */}
            <div
              className="reel-visibility-box"
              onClick={() =>
                !formLoading &&
                setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))
              }
            >
              <div className="reel-visibility-info">
                <span className="reel-visibility-title">
                  <Eye size={16} color="var(--primary)" />
                  Publish Immediately
                </span>
                <span className="reel-visibility-desc">
                  When enabled, reel becomes immediately visible to all platform mobile users
                </span>
              </div>
              <label className="custom-switch" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={form.isPublished}
                  onChange={handleInputChange}
                  disabled={formLoading}
                />
                <span className="switch-slider" />
              </label>
            </div>

            {/* Pre-flight Checklist Grid */}
            <div className="reel-checklist-grid">
              <div className="checklist-tile">
                <div className="checklist-tile-left">
                  {isTitleValid ? (
                    <CheckCircle2 size={15} color="#10b981" />
                  ) : (
                    <X size={15} color="#ef4444" />
                  )}
                  <span>Reel Title</span>
                </div>
                <span
                  className="checklist-tile-val"
                  style={{ color: isTitleValid ? "#10b981" : "var(--text-muted)" }}
                >
                  {isTitleValid ? "Ready" : "Required"}
                </span>
              </div>

              <div className="checklist-tile">
                <div className="checklist-tile-left">
                  {isVideoValid ? (
                    <CheckCircle2 size={15} color="#10b981" />
                  ) : (
                    <X size={15} color="#ef4444" />
                  )}
                  <span>Video Asset</span>
                </div>
                <span
                  className="checklist-tile-val"
                  style={{ color: isVideoValid ? "#10b981" : "var(--text-muted)" }}
                >
                  {videoFile ? "Attached" : form.videoUrl ? "URL Active" : "Missing"}
                </span>
              </div>

              <div className="checklist-tile">
                <div className="checklist-tile-left">
                  {isThumbValid ? (
                    <CheckCircle2 size={15} color="#10b981" />
                  ) : (
                    <X size={15} color="#ef4444" />
                  )}
                  <span>Poster Cover</span>
                </div>
                <span
                  className="checklist-tile-val"
                  style={{ color: isThumbValid ? "#10b981" : "var(--text-muted)" }}
                >
                  {thumbnailFile ? "Attached" : form.thumbnailUrl ? "URL Active" : "Missing"}
                </span>
              </div>

              <div className="checklist-tile">
                <div className="checklist-tile-left">
                  <ShieldCheck size={15} color="#10b981" />
                  <span>State</span>
                </div>
                <span
                  className="checklist-tile-val"
                  style={{ color: form.isPublished ? "#10b981" : "var(--text-soft)" }}
                >
                  {form.isPublished ? "Instant Live" : "Draft Mode"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media Assets (Video & Thumbnail) */}
        <div className="reel-column">
          {/* Card 3: Reel Video Asset */}
          <div className="reel-card">
            <div className="reel-card-header">
              <div className="reel-card-title-wrap">
                <div className="reel-card-icon">
                  <FileVideo size={18} />
                </div>
                <div>
                  <h2 className="reel-card-title">
                    Reel Video Asset <span className="req-badge">*</span>
                  </h2>
                  <p className="reel-card-subtitle">
                    9:16 vertical video (MP4, WebM, MOV)
                  </p>
                </div>
              </div>

              <div className="mode-pills">
                <button
                  type="button"
                  className={`mode-pill-btn ${videoMode === "file" ? "active" : ""}`}
                  onClick={() => setVideoMode("file")}
                >
                  <Upload size={11} /> File
                </button>
                <button
                  type="button"
                  className={`mode-pill-btn ${videoMode === "url" ? "active" : ""}`}
                  onClick={() => setVideoMode("url")}
                >
                  <Link2 size={11} /> URL
                </button>
              </div>
            </div>

            {videoMode === "file" ? (
              <>
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={(e) => handleVideoFileSelect(e.target.files?.[0] || null)}
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={formLoading}
                  style={{ display: "none" }}
                />

                {!videoFile ? (
                  <div
                    className={`dropzone-content-area ${isVideoDragging ? "dragging" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsVideoDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsVideoDragging(false);
                    }}
                    onDrop={handleVideoDrop}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Upload size={22} className="dropzone-icon-clean" />
                    <span className="dropzone-title-text">
                      Choose Video Asset
                    </span>
                    <span className="dropzone-sub-text">
                      Drag & drop or click (Recommended: 1080×1920px MP4/WebM, max 150MB)
                    </span>
                  </div>
                ) : (
                  <div className="reel-file-selected-box">
                    <div className="reel-file-info">
                      <div className="file-type-icon">
                        <FileVideo size={20} />
                      </div>
                      <div>
                        <div className="file-name-text">{videoFile.name}</div>
                        <div className="file-size-text">
                          {formatFileSize(videoFile.size)} • Direct CDN Pipeline Ready
                          {autoDetectedDuration ? ` • Duration: ${autoDetectedDuration}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="reel-file-actions">
                      <button
                        type="button"
                        className="action-pill-btn"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        Change Video
                      </button>
                      <button
                        type="button"
                        className="action-pill-btn danger"
                        onClick={handleRemoveVideo}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="reel-form-group">
                <label className="reel-form-label">Direct Video Stream URL</label>
                <input
                  type="text"
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={handleInputChange}
                  placeholder="https://cdn.example.com/reels/video.mp4"
                  disabled={formLoading}
                  className="reel-form-input"
                />
                <div className="input-hint-row">
                  <span>Direct MP4/HLS/DASH video stream URL</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Thumbnail Poster Image */}
          <div className="reel-card">
            <div className="reel-card-header">
              <div className="reel-card-title-wrap">
                <div className="reel-card-icon">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h2 className="reel-card-title">
                    Thumbnail Poster Image <span className="req-badge">*</span>
                  </h2>
                  <p className="reel-card-subtitle">
                    9:16 vertical cover poster (JPG, PNG, WEBP)
                  </p>
                </div>
              </div>

              <div className="mode-pills">
                <button
                  type="button"
                  className={`mode-pill-btn ${thumbnailMode === "file" ? "active" : ""}`}
                  onClick={() => setThumbnailMode("file")}
                >
                  <Upload size={11} /> File
                </button>
                <button
                  type="button"
                  className={`mode-pill-btn ${thumbnailMode === "url" ? "active" : ""}`}
                  onClick={() => setThumbnailMode("url")}
                >
                  <Link2 size={11} /> URL
                </button>
              </div>
            </div>

            {thumbnailMode === "file" ? (
              <>
                <input
                  type="file"
                  ref={thumbnailInputRef}
                  onChange={(e) => handleThumbnailFileSelect(e.target.files?.[0] || null)}
                  accept="image/jpeg,image/png,image/webp"
                  disabled={formLoading}
                  style={{ display: "none" }}
                />

                {!thumbnailFile ? (
                  <div
                    className={`dropzone-content-area ${isThumbDragging ? "dragging" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsThumbDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsThumbDragging(false);
                    }}
                    onDrop={handleThumbDrop}
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    <Upload size={22} className="dropzone-icon-clean" />
                    <span className="dropzone-title-text">
                      Choose Poster Image
                    </span>
                    <span className="dropzone-sub-text">
                      Drag & drop or click (Recommended: 1080×1920px 9:16 vertical cover)
                    </span>
                  </div>
                ) : (
                  <div className="reel-file-selected-box">
                    <div className="reel-file-info">
                      <div className="file-type-icon">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <div className="file-name-text">{thumbnailFile.name}</div>
                        <div className="file-size-text">
                          {formatFileSize(thumbnailFile.size)} • Poster cover ready
                        </div>
                      </div>
                    </div>

                    <div className="reel-file-actions">
                      <button
                        type="button"
                        className="action-pill-btn"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        Change Poster
                      </button>
                      <button
                        type="button"
                        className="action-pill-btn danger"
                        onClick={handleRemoveThumbnail}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="reel-form-group">
                <label className="reel-form-label">Direct Poster Image URL</label>
                <input
                  type="text"
                  name="thumbnailUrl"
                  value={form.thumbnailUrl}
                  onChange={handleInputChange}
                  placeholder="https://cdn.example.com/reels/poster.jpg"
                  disabled={formLoading}
                  className="reel-form-input"
                />
                <div className="input-hint-row">
                  <span>Direct image link from CDN or web storage</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Width Bottom Bar with Summary & Actions */}
      <div className="reel-full-bottom-bar">
        <div className="bottom-bar-status">
          {isReadyToPublish ? (
            <>
              <CheckCircle2 size={18} color="#10b981" />
              <span>All assets attached • Ready to launch to mobile client feed</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} color="#f59e0b" />
              <span>Please attach both video and poster before publishing</span>
            </>
          )}
        </div>

        <div className="bottom-bar-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/dashboard/ai-reels")}
            disabled={formLoading}
            style={{ padding: "10px 20px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublishClick}
            disabled={formLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 26px",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            {formLoading ? (
              <>
                <Loader size={18} className="spin-icon" /> Uploading to CDN...
              </>
            ) : (
              <>
                <Save size={18} /> Publish AI Reel
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════ MODAL POPUP DIALOGS ═══════════════════════ */}
      {modalState.isOpen && (
        <div
          className="reel-modal-overlay"
          onClick={() => {
            if (modalState.type !== "uploading") {
              setModalState((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div className="reel-popup-box" onClick={(e) => e.stopPropagation()}>
            {/* Validation Alert Popup */}
            {modalState.type === "validation" && (
              <>
                <div className="reel-popup-icon warning">
                  <AlertCircle size={26} />
                </div>
                <h3 className="reel-popup-title">{modalState.title}</h3>
                <p className="reel-popup-message">{modalState.message}</p>
                <div className="reel-popup-actions">
                  <button
                    type="button"
                    className="popup-btn-primary"
                    onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Got It, Let Me Add It
                  </button>
                </div>
              </>
            )}

            {/* Confirmation & Review Popup */}
            {modalState.type === "confirm" && (
              <>
                <div className="reel-popup-icon gold">
                  <Film size={26} />
                </div>
                <h3 className="reel-popup-title">{modalState.title}</h3>
                <p className="reel-popup-message">{modalState.message}</p>

                <div className="reel-popup-summary">
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Title</span>
                    <span className="popup-summary-val">{form.title}</span>
                  </div>
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Duration</span>
                    <span className="popup-summary-val">{form.duration || "0:15"}</span>
                  </div>
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Video</span>
                    <span className="popup-summary-val">
                      {videoFile
                        ? `${videoFile.name} (${formatFileSize(videoFile.size)})`
                        : form.videoUrl}
                    </span>
                  </div>
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Cover</span>
                    <span className="popup-summary-val">
                      {thumbnailFile
                        ? `${thumbnailFile.name} (${formatFileSize(thumbnailFile.size)})`
                        : form.thumbnailUrl}
                    </span>
                  </div>
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Feed Priority</span>
                    <span className="popup-summary-val">{form.priority || 0}</span>
                  </div>
                  <div className="popup-summary-row">
                    <span className="popup-summary-label">Visibility</span>
                    <span className="popup-summary-val" style={{ color: form.isPublished ? "#10b981" : "#f59e0b" }}>
                      {form.isPublished ? "Instant Live" : "Draft Mode"}
                    </span>
                  </div>
                </div>

                <div className="reel-popup-actions">
                  <button
                    type="button"
                    className="popup-btn-cancel"
                    onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="popup-btn-primary"
                    onClick={handleExecutePublish}
                  >
                    <Save size={16} /> Confirm & Publish
                  </button>
                </div>
              </>
            )}

            {/* Real-time Upload Progress Modal */}
            {modalState.type === "uploading" && (
              <>
                <div className="reel-popup-icon gold">
                  <Loader size={26} className="spin-icon" />
                </div>
                <h3 className="reel-popup-title">Publishing AI Reel...</h3>
                <p className="reel-popup-message">
                  {uploadPhase === "thumbnail"
                    ? "Uploading poster cover image to Bunny CDN..."
                    : uploadPhase === "video"
                    ? "Uploading 9:16 vertical video stream to Bunny CDN..."
                    : uploadPhase === "saving"
                    ? "Registering reel entry in catalog database..."
                    : "Connecting to Bunny CDN storage pipeline..."}
                </p>

                <div className="popup-upload-status">
                  <div className="progress-label-row">
                    <span>Direct Upload Pipeline</span>
                    <span>{uploadProgress > 0 ? `${uploadProgress}%` : "Transferring..."}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.max(uploadProgress, 10)}%` }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Success Modal Popup */}
            {modalState.type === "success" && (
              <>
                <div className="reel-popup-icon success">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className="reel-popup-title">{modalState.title}</h3>
                <p className="reel-popup-message">{modalState.message}</p>
                <div className="reel-popup-actions">
                  <button
                    type="button"
                    className="popup-btn-cancel"
                    onClick={handleResetForm}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <RotateCcw size={15} /> Upload Another
                  </button>
                  <button
                    type="button"
                    className="popup-btn-primary"
                    onClick={() => navigate("/dashboard/ai-reels")}
                  >
                    <Film size={15} /> View in Library
                  </button>
                </div>
              </>
            )}

            {/* Error Modal Popup */}
            {modalState.type === "error" && (
              <>
                <div className="reel-popup-icon error">
                  <AlertCircle size={28} />
                </div>
                <h3 className="reel-popup-title">{modalState.title}</h3>
                <p className="reel-popup-message">{modalState.message}</p>
                <div className="reel-popup-actions">
                  <button
                    type="button"
                    className="popup-btn-primary"
                    onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Close & Review
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
