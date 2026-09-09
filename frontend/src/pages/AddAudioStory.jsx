import { useState, useRef, useEffect } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import useAudioStoryForm from "../features/hooks/useAudioStoryForm";
import AudioAssetsStep from "../features/audio/steps/AudioAssetsStep";
import AudioEpisodesSection from "../features/audio/episodes/AudioEpisodesSection";
import { createAudioStory } from "../features/services/audioStory.service";
import {
  Plus,
  Headphones,
  Rocket,
  ChevronRight,
  Star,
  User,
  Mic,
  AlignLeft,
  FileText,
  Lock,
  ArrowUpCircle,
  Calendar,
  Clock,
  Layers,
} from "lucide-react";

export default function AddAudioStory() {
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

  // File states
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});
  const [episodeThumbnailFiles, setEpisodeThumbnailFiles] = useState({});

  // Refs
  const coverImageInputRef = useRef(null);
  const bannerImageInputRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/admin/categories");
        if (res.data.success) {
          const list = (res.data.categories || []).filter(c => c.isActive !== false);
          setCategories(list);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleCoverImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setCoverImageFile(file);
  };

  const handleBannerImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setBannerImageFile(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      alert("Audio Story published successfully! 🚀");
      
      resetForm();
      setCoverImageFile(null);
      setBannerImageFile(null);
      setEpisodeVideoFiles({});
      setEpisodeThumbnailFiles({});
      setUploadProgress(0);
      setUploadPhase("");
      setCurrentEpisodeInfo({ current: 0, total: 0 });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error publishing audio story");
      setUploadProgress(0);
      setUploadPhase("");
    }

    setLoading(false);
  };

  return (
    <div className="add-content-page">
      <div className="pg-header" style={{ alignItems: "center" }}>
        <div>
          <h1 className="pg-title">
            <Plus size={24} style={{ color: "var(--primary)" }} />
            Publish New Audio Story
          </h1>
          <p className="pg-sub">Fill in the details below to add an audio story to the platform</p>
        </div>
        <div className="content-type-toggle">
          <button type="button" className="toggle-btn active">
            <Headphones size={18} />
            Audio Story
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {/* Basic Info */}
        <div className="premium-card">
          <h3 className="section-title">
            <span><Star size={18} /></span> Basic Information
          </h3>

          <div className="form-2col" style={{ marginBottom: 20 }}>
            <div className="form-row form-full">
              <label className="form-label">Audio Story Title *</label>
              <input className="form-input-styled" name="title" placeholder="e.g. The Untold Story" onChange={ch} value={form.title} required />
            </div>

            <div className="form-row form-full">
              <label className="form-label">Description *</label>
              <textarea className="form-input-styled" name="description" placeholder="A brief summary..." rows={3} onChange={ch} value={form.description} required />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-row">
              <label className="form-label"><User size={14} style={{ marginRight: 4 }} /> Author</label>
              <input className="form-input-styled" name="author" placeholder="Author name" onChange={ch} value={form.author} />
            </div>

            <div className="form-row">
              <label className="form-label"><Mic size={14} style={{ marginRight: 4 }} /> Narrator</label>
              <input className="form-input-styled" name="narrator" placeholder="Narrator name" onChange={ch} value={form.narrator} />
            </div>

            <div className="form-row">
              <label className="form-label"><ArrowUpCircle size={14} style={{ marginRight: 4 }} /> Priority (0 = Auto)</label>
              <input className="form-input-styled" name="priority" type="number" min="0" placeholder="0 = Automatic" onChange={ch} value={form.priority} />
            </div>
          </div>

          <div className="form-row form-full" style={{ marginTop: 20, marginBottom: 20 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Layers size={14} /> Selected Categories (Select Multiple)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {categories.map((c) => {
                const val = c._id;
                const isSelected = Array.isArray(form.categories)
                  ? form.categories.includes(val)
                  : form.categories === val;

                return (
                  <button
                    key={c._id}
                    type="button"
                    className={`badge ${isSelected ? "badge-active" : "badge-draft"}`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: isSelected ? "var(--neon-pink)" : "var(--border)",
                      backgroundColor: isSelected ? "var(--neon-pink-dim)" : "rgba(255, 255, 255, 0.05)",
                      color: isSelected ? "var(--neon-pink)" : "var(--text-soft)",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => {
                      let currentCats = Array.isArray(form.categories) ? [...form.categories] : (form.categories ? [form.categories] : []);
                      if (currentCats.includes(val)) {
                        currentCats = currentCats.filter(item => item !== val);
                      } else {
                        currentCats.push(val);
                      }
                      setForm(f => ({ ...f, categories: currentCats }));
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
              {categories.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No categories found.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
            <label className="checkbox-row" style={{ flex: 1, minWidth: "200px", background: "rgba(229, 9, 20, 0.1)", borderColor: "rgba(229, 9, 20, 0.2)" }}>
              <input type="checkbox" name="isPremium" onChange={ch} checked={form.isPremium} />
              <span style={{ color: "var(--primary)" }}>
                <Lock size={16} style={{ marginRight: 8 }} /> Premium Content
              </span>
            </label>

            <label className="checkbox-row" style={{ flex: 1, minWidth: "200px", background: "rgba(10, 186, 115, 0.1)", borderColor: "rgba(10, 186, 115, 0.2)" }}>
              <input type="checkbox" name="isPublished" onChange={ch} checked={form.isPublished} />
              <span style={{ color: "#0aba73" }}>
                <ArrowUpCircle size={16} style={{ marginRight: 8 }} /> Published
              </span>
            </label>
            
            <label className="checkbox-row" style={{ flex: 1, minWidth: "200px", background: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)" }}>
              <input type="checkbox" name="isComingSoon" onChange={ch} checked={form.isComingSoon} />
              <span style={{ color: "#f59e0b" }}>
                <Clock size={16} style={{ marginRight: 8 }} /> Coming Soon
              </span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
            {form.isComingSoon && (
              <div className="form-row" style={{ flex: 1, minWidth: "200px" }}>
                  <label className="form-label" style={{marginBottom: "5px"}}><Calendar size={14} style={{ marginRight: 4, display: "inline-block" }} /> Schedule Publish Date</label>
                  <input className="form-input-styled" type="datetime-local" name="scheduleDate" value={form.scheduleDate || ""} onChange={ch} />
              </div>
            )}
          </div>
        </div>

        <AudioAssetsStep
          form={form}
          ch={ch}
          coverImageFile={coverImageFile}
          coverImageInputRef={coverImageInputRef}
          handleCoverImageFileChange={handleCoverImageFileChange}
          bannerImageFile={bannerImageFile}
          bannerImageInputRef={bannerImageInputRef}
          handleBannerImageFileChange={handleBannerImageFileChange}
        />

        <AudioEpisodesSection
          form={form}
          setForm={setForm}
          addEp={addEp}
          removeEp={removeEp}
          chEp={chEp}
          episodeVideoFiles={episodeVideoFiles}
          episodeThumbnailFiles={episodeThumbnailFiles}
          setEpisodeVideoFiles={setEpisodeVideoFiles}
          setEpisodeThumbnailFiles={setEpisodeThumbnailFiles}
        />

        {loading && (
          <div className="upload-progress-card" style={{ padding: "24px", borderRadius: "16px", background: "rgba(30, 30, 40, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)", display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="spinner" style={{ width: 20, height: 20, border: "3px solid rgba(230, 57, 70, 0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                  {uploadPhase === "main" && "Uploading Audio Story Metadata..."}
                  {uploadPhase === "episodes" && `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                  {uploadPhase === "complete" && "Finalizing and Publishing Content..."}
                </span>
              </div>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>{uploadProgress}%</span>
            </div>

            <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: "999px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", background: "linear-gradient(90deg, #e30914 0%, #ff4d5a 100%)", borderRadius: "999px", transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: "0 0 12px rgba(227, 9, 20, 0.5)" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a8b98" }}>
              <span>Please keep this window open until publishing is complete.</span>
            </div>
          </div>
        )}

        <div className="submit-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn-lg" disabled={loading} style={{ minWidth: "240px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            {loading ? (
              <><span className="spinner" style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Publishing...</>
            ) : (
              <><Rocket size={20} /> Publish to Platform <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
