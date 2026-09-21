import { useState, useRef } from "react";
import { motion } from "framer-motion";

import "./Dashboard.css";
import "./AddContent.css";

import MediaAssetsStep from "../features/content/steps/MediaAssetsStep";
import CastSection from "../features/content/cast/CastSection";
import SeasonsSection from "../features/content/seasons/SeasonsSection";
import BasicInfoSection from "../features/content/basic/BasicInfoSection";
import ReviewStep from "../features/content/steps/ReviewStep";

import { createContent } from "../features/services/content.service";
import useContentForm from "../features/hooks/useContentForm";

import {
  Plus,
  Film,
  Tv,
  Rocket,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Star,
  Images,
  Users,
} from "lucide-react";

export default function AddContent() {
  const {
    form,
    setForm,

    ch,
    setType,

    addCast,
    removeCast,

    chCast,

    addSeason,
    removeSeason,

    addEp,
    removeEp,
    chEp,

    resetForm,
  } = useContentForm();

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "main", "episodes", "complete"
  const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({ current: 0, total: 0 });
  const [validationError, setValidationError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);

  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);

  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});
  const [episodeThumbnailFiles, setEpisodeThumbnailFiles] = useState({});
  const [castFiles, setCastFiles] = useState({});

  // File Input Refs
  const videoInputRef = useRef(null);
  const posterInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const trailerInputRef = useRef(null);

  const isMovie = form.type === "movie";

  const getFullUrl = (url) => {
    if (!url) return "";
    if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(url)) {
      return url;
    }
    return url;
  };

  // Upload Handlers
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handlePosterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setPosterFile(file);
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setBannerFile(file);
  };

  const handleTrailerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setTrailerFile(file);
  };

  const handleEpisodeVideoChange = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = `${seasonIndex}_${episodeIndex}`;
      setEpisodeVideoFiles((prev) => ({ ...prev, [key]: file }));
    }
  };

  const handleEpisodeThumbnailChange = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = `${seasonIndex}_${episodeIndex}`;
      setEpisodeThumbnailFiles((prev) => ({ ...prev, [key]: file }));
    }
  };

  const handleCastFileChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCastFiles((prev) => ({ ...prev, [index]: file }));
    }
  };

  // Prevent Enter key from submitting form inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  // Step Validation per step
  const validateStep = (stepNumber) => {
    setValidationError("");
    if (stepNumber === 1) {
      if (!form.title || !form.title.trim()) return "Please enter a Content Title to proceed.";
      if (!form.description || !form.description.trim()) return "Please enter a Synopsis / Description.";
      if (form.isComingSoon && !form.releaseDate) return "Release date is required for Coming Soon titles.";
    }
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep(activeStep);
    if (err) {
      setValidationError(err);
      return;
    }

    let nextStep = activeStep + 1;
    // Skip episode step for movies
    if (isMovie && nextStep === 4) {
      nextStep = 5;
    }
    setValidationError("");
    setActiveStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setValidationError("");
    let prevStep = activeStep - 1;
    if (isMovie && prevStep === 4) {
      prevStep = 3;
    }
    setActiveStep(Math.max(1, prevStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Final pre-submit audit check
    if (!form.title || !form.title.trim()) {
      setValidationError("Content title is required.");
      setActiveStep(1);
      return;
    }
    if (!form.description || !form.description.trim()) {
      setValidationError("Synopsis / description is required.");
      setActiveStep(1);
      return;
    }
    if (!posterFile && !form.poster) {
      setValidationError("Please attach a poster image file or URL in Media Assets (Step 2).");
      setActiveStep(2);
      return;
    }
    if (isMovie && !form.isComingSoon && !videoFile && !form.videoUrl) {
      setValidationError("Please attach a movie video file or stream URL in Media Assets (Step 2).");
      setActiveStep(2);
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("main");

    try {
      await createContent({
        form,
        videoFile,
        posterFile,
        bannerFile,
        trailerFile,
        castFiles,
        episodeVideoFiles,
        episodeThumbnailFiles,

        onTrailerProgress: (percent) => {
          setUploadProgress(percent);
        },

        onVideoProgress: (percent) => {
          setUploadProgress(percent);
          if (percent === 100) {
            setUploadPhase(form.type === "movie" ? "complete" : "episodes");
          }
        },

        onEpisodeProgress: (current, total, percent) => {
          setUploadPhase("episodes");
          setCurrentEpisodeInfo({ current, total });
          setUploadProgress(percent);
          if (current === total && percent === 100) {
            setUploadPhase("complete");
          }
        },
      });

      setPublishSuccess(true);
      resetForm();
      setVideoFile(null);
      setPosterFile(null);
      setBannerFile(null);
      setTrailerFile(null);
      setEpisodeVideoFiles({});
      setEpisodeThumbnailFiles({});
      setCastFiles({});
      setUploadProgress(0);
      setUploadPhase("");
      setCurrentEpisodeInfo({ current: 0, total: 0 });
      setActiveStep(1);

    } catch (error) {
      console.error(error);
      setValidationError(error.response?.data?.message || "Error publishing content. Please check connection.");
      setUploadProgress(0);
      setUploadPhase("");
    }

    setLoading(false);
  };

  // Step definitions
  const stepsList = [
    { id: 1, title: "Basic Info", icon: Star },
    { id: 2, title: "Media Assets", icon: Images },
    { id: 3, title: "Cast & Crew", icon: Users },
    ...(!isMovie ? [{ id: 4, title: "Episodes", icon: Tv }] : []),
    { id: 5, title: "Review & Publish", icon: Rocket },
  ];

  return (
    <div className="add-content-page">

      {/* Header & Type Toggle */}
      <div className="pg-header" style={{ alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(255, 209, 26, 0.15)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 209, 26, 0.3)",
              }}
            >
              <Plus size={22} />
            </div>
            <div>
              <h1 className="pg-title" style={{ fontSize: "1.5rem", margin: 0 }}>
                Publish Content Studio
              </h1>
              <p className="pg-sub" style={{ margin: 0, fontSize: "0.86rem" }}>
                Multi-step publishing workflow for Movies, Web Series, and Microdramas with direct CDN integration
              </p>
            </div>
          </div>
        </div>

        <div className="segmented-switch">
          {[
            { id: "movie", label: "Movies", icon: Film },
            { id: "series", label: "Web Series", icon: Tv },
            { id: "microdrama", label: "Microdramas", icon: Clapperboard },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = form.type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`segmented-switch-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  setType(item.id);
                  if (item.id === "movie" && activeStep === 4) setActiveStep(3);
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="addContentTypePill"
                    className="segmented-switch-active-bg"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="segmented-switch-btn-text" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon size={15} />
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="stepper-bar-container">
        {stepsList.map((st, idx) => {
          const Icon = st.icon;
          const isCompleted = activeStep > st.id;
          const isActive = activeStep === st.id;

          return (
            <div
              key={st.id}
              className={`stepper-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              onClick={() => {
                setValidationError("");
                setActiveStep(st.id);
              }}
            >
              <div className="stepper-circle">
                {isCompleted ? <CheckCircle2 size={16} /> : <span className="step-num">{st.id}</span>}
              </div>
              <div className="stepper-text-block">
                <span className="stepper-label">{st.title}</span>
                <span className="stepper-subtext">Step 0{st.id}</span>
              </div>
              {idx < stepsList.length - 1 && <div className="stepper-connector" />}
            </div>
          );
        })}
      </div>

      {/* Inline Validation Alert */}
      {validationError && (
        <div className="validation-alert-box">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Success Notification State */}
      {publishSuccess && (
        <div
          className="form-card"
          style={{
            borderColor: "rgba(16, 185, 129, 0.4)",
            background: "rgba(16, 185, 129, 0.06)",
            alignItems: "center",
            textAlign: "center",
            padding: "48px 24px",
            borderRadius: "20px",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.18)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <CheckCircle2 size={38} />
          </div>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--text)" }}>
            Content Published Successfully! 🚀
          </h3>
          <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", maxWidth: 540, margin: "10px 0 24px", lineHeight: 1.5 }}>
            Your title media has been encoded, synchronized, and deployed to CDN streaming nodes. It is now live and accessible across mobile and smart TV apps.
          </p>
          <button
            type="button"
            className="btn-lg"
            onClick={() => setPublishSuccess(false)}
            style={{ padding: "14px 32px", fontSize: "0.95rem", borderRadius: "12px", background: "var(--primary)", color: "#0b0f19", fontWeight: 700 }}
          >
            <Plus size={18} /> Publish Another Title
          </button>
        </div>
      )}

      {/* Main Wizard Step Content */}
      {!publishSuccess && (
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>

          {activeStep === 1 && (
            <BasicInfoSection form={form} ch={ch} setForm={setForm} />
          )}

          {activeStep === 2 && (
            <MediaAssetsStep
              form={form}
              ch={ch}

              posterFile={posterFile}
              posterInputRef={posterInputRef}
              handlePosterFileChange={handlePosterFileChange}
              onRemovePosterFile={() => setPosterFile(null)}

              bannerFile={bannerFile}
              bannerInputRef={bannerInputRef}
              handleBannerFileChange={handleBannerFileChange}
              onRemoveBannerFile={() => setBannerFile(null)}

              trailerFile={trailerFile}
              trailerInputRef={trailerInputRef}
              handleTrailerFileChange={handleTrailerFileChange}
              onRemoveTrailerFile={() => setTrailerFile(null)}

              videoFile={videoFile}
              videoInputRef={videoInputRef}
              handleVideoFileChange={handleVideoFileChange}
              onRemoveVideoFile={() => setVideoFile(null)}

              type={form.type}
              isComingSoon={form.isComingSoon}
            />
          )}

          {activeStep === 3 && (
            <CastSection
              cast={form.cast}
              castFiles={castFiles}
              addCast={addCast}
              removeCast={removeCast}
              chCast={chCast}
              handleCastFileChange={handleCastFileChange}
              getFullUrl={getFullUrl}
            />
          )}

          {activeStep === 4 && !isMovie && (
            <SeasonsSection
              form={form}
              setForm={setForm}

              addSeason={addSeason}
              addEp={addEp}
              removeSeason={removeSeason}

              chEp={chEp}
              removeEp={removeEp}

              episodeVideoFiles={episodeVideoFiles}
              episodeThumbnailFiles={episodeThumbnailFiles}

              handleEpisodeVideoChange={handleEpisodeVideoChange}
              handleEpisodeThumbnailChange={handleEpisodeThumbnailChange}

              setEpisodeVideoFiles={setEpisodeVideoFiles}
              setEpisodeThumbnailFiles={setEpisodeThumbnailFiles}
            />
          )}

          {activeStep === 5 && (
            <ReviewStep
              form={form}
              posterFile={posterFile}
              bannerFile={bannerFile}
              trailerFile={trailerFile}
              videoFile={videoFile}
              castFiles={castFiles}
              episodeVideoFiles={episodeVideoFiles}
              episodeThumbnailFiles={episodeThumbnailFiles}
              onGoToStep={(s) => setActiveStep(s)}
            />
          )}

          {/* Realtime Uploading Queue Card */}
          {loading && (
            <div
              className="upload-progress-card"
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "var(--bg2)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 209, 26, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    className="spinner"
                    style={{
                      width: 22,
                      height: 22,
                      border: "3px solid rgba(255, 209, 26, 0.2)",
                      borderTopColor: "var(--primary)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
                    {uploadPhase === "main" && (
                      form.type === "movie" ? "Uploading Movie Assets & Video Content..." : 
                      form.type === "microdrama" ? "Uploading Microdrama Details..." :
                      "Uploading Web Series Assets..."
                    )}
                    {uploadPhase === "episodes" && `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                    {uploadPhase === "complete" && "Finalizing and Syncing CDN Network..."}
                  </span>
                </div>
                <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--primary)" }}>
                  {uploadProgress}%
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    backgroundColor: "var(--primary)",
                    borderRadius: "999px",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-muted)" }}>
                <span>Please keep this browser tab open until publishing completes.</span>
                {uploadPhase === "main" && (
                  <span>
                    {videoFile || trailerFile ? "Uploading high speed CDN streams..." : "Saving metadata..."}
                  </span>
                )}
                {uploadPhase === "episodes" && (
                  <span>
                    Processing Season Episode Files ({currentEpisodeInfo.current}/{currentEpisodeInfo.total})
                  </span>
                )}
                {uploadPhase === "complete" && <span>Syncing CDN distribution nodes...</span>}
              </div>
            </div>
          )}

          {/* Stepper Navigation Footer Bar */}
          <div className="wizard-footer-container" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {validationError && (
              <div className="validation-alert-box" style={{ margin: 0 }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            <div className="wizard-footer-bar">
              <button
                type="button"
                className="btn-wizard-back"
                disabled={activeStep === 1 || loading}
                onClick={handlePrevStep}
              >
                <ChevronLeft size={18} /> Back
              </button>

              <div className="wizard-step-counter">
                Step <strong>{activeStep}</strong> of <strong>{stepsList.length}</strong>
              </div>

              {activeStep < 5 ? (
                <button
                  type="button"
                  className="btn-wizard-next"
                  onClick={handleNextStep}
                >
                  Next Step <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-lg"
                  disabled={loading}
                  style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 32px", borderRadius: "12px", background: "var(--primary)", color: "#0b0f19", fontWeight: 800, border: "none", cursor: loading ? "wait" : "pointer" }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, border: "3px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Rocket size={18} /> Confirm & Publish Content <ChevronRight size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </form>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

