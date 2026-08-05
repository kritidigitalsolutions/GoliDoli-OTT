import { useState, useRef } from "react";
import "./Dashboard.css";
import API from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";
import {
  Plus,
  Rocket,
  ChevronRight,
  Film,
  Globe,
  Tag,
  Layers,
  Lock,
  Image,
  Video,
  Upload,
  X,
  Users,
  Trash2,
} from "lucide-react";

const EMPTY_FORM = {
  title: "",
  description: "",
  language: "",
  genre: "",
  category: "",
  isPremium: false,
  status: "ongoing",
  priority: 0,
};

export default function AddDrama() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  // Media files
  const [posterFile, setPosterFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);

  // Cast
  const [cast, setCast] = useState([{ name: "", image: "" }]);
  const [castFiles, setCastFiles] = useState({});

  // Episodes
  const [episodes, setEpisodes] = useState([
    { episodeNumber: 1, title: "", description: "", duration: "", isLocked: false, isVertical: true },
  ]);
  const [episodeVideoFiles, setEpisodeVideoFiles] = useState({});
  const [episodeThumbnailFiles, setEpisodeThumbnailFiles] = useState({});

  // Refs
  const posterInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const trailerInputRef = useRef(null);

  const ch = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  /* ── CAST ── */
  const addCast = () => setCast((c) => [...c, { name: "", image: "" }]);
  const removeCast = (i) => {
    setCast((c) => c.filter((_, idx) => idx !== i));
    setCastFiles((prev) => { const n = { ...prev }; delete n[i]; return n; });
  };
  const chCast = (i, field, value) => {
    setCast((c) => c.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const handleCastFileChange = (i, e) => {
    const file = e.target.files?.[0];
    if (file) setCastFiles((prev) => ({ ...prev, [i]: file }));
  };

  /* ── EPISODES ── */
  const addEpisode = () => {
    setEpisodes((eps) => [
      ...eps,
      { episodeNumber: eps.length + 1, title: "", description: "", duration: "", isLocked: false, isVertical: true },
    ]);
  };
  const removeEpisode = (i) => {
    setEpisodes((eps) => eps.filter((_, idx) => idx !== i));
    setEpisodeVideoFiles((prev) => { const n = { ...prev }; delete n[i]; return n; });
    setEpisodeThumbnailFiles((prev) => { const n = { ...prev }; delete n[i]; return n; });
  };
  const chEpisode = (i, field, value) => {
    setEpisodes((eps) => eps.map((ep, idx) => idx === i ? { ...ep, [field]: value } : ep));
  };
  const handleEpisodeVideoChange = (i, e) => {
    const file = e.target.files?.[0];
    if (file) setEpisodeVideoFiles((prev) => ({ ...prev, [i]: file }));
  };
  const handleEpisodeThumbnailChange = (i, e) => {
    const file = e.target.files?.[0];
    if (file) setEpisodeThumbnailFiles((prev) => ({ ...prev, [i]: file }));
  };

  /* ── SUBMIT ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Upload cast images directly to Bunny CDN
      const updatedCast = [...cast];
      const castKeys = Object.keys(castFiles);
      for (const key of castKeys) {
        const file = castFiles[key];
        if (file) {
          const cdnUrl = await uploadToBunny(file, "shortdramas", "cast");
          const idx = Number(key);
          if (updatedCast[idx]) {
            updatedCast[idx].image = cdnUrl;
          }
        }
      }

      // 2. Upload main poster
      let posterUrl = "";
      if (posterFile) {
        posterUrl = await uploadToBunny(posterFile, "shortdramas", "posters");
      }

      // 3. Upload main banner
      let bannerUrl = "";
      if (bannerFile) {
        bannerUrl = await uploadToBunny(bannerFile, "shortdramas", "banners");
      }

      // 4. Upload main trailer
      let trailerUrl = "";
      if (trailerFile) {
        trailerUrl = await uploadToBunny(trailerFile, "shortdramas", "trailers");
      }

      // 5. Build form payload with direct CDN URL strings
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description || "");
      formData.append("language", form.language || "");
      formData.append("genre", JSON.stringify(
        form.genre.split(",").map((s) => s.trim()).filter(Boolean)
      ));
      formData.append("category", JSON.stringify(form.category ? [form.category] : []));
      formData.append("isPremium", String(form.isPremium));
      formData.append("status", form.status);
      formData.append("priority", String(Number(form.priority) || 0));

      formData.append("poster", posterUrl);
      formData.append("banner", bannerUrl);
      formData.append("trailerUrl", trailerUrl);
      formData.append("cast", JSON.stringify(updatedCast));

      // Create drama first (backend saves to DB instantly!)
      const res = await API.post("/admin/shortdramas/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const dramaId = res.data.shortDrama?._id;

      // 6. Direct upload episode videos and thumbnails and save
      if (dramaId) {
        for (let i = 0; i < episodes.length; i++) {
          const ep = episodes[i];
          let epVideoUrl = "";
          let epThumbnailUrl = "";

          if (episodeVideoFiles[i]) {
            epVideoUrl = await uploadToBunny(episodeVideoFiles[i], "dramaepisodes", "videos");
          }
          if (episodeThumbnailFiles[i]) {
            epThumbnailUrl = await uploadToBunny(episodeThumbnailFiles[i], "dramaepisodes", "posters");
          }

          const epForm = new FormData();
          epForm.append("episodeNumber", ep.episodeNumber);
          epForm.append("title", ep.title || "");
          epForm.append("description", ep.description || "");
          epForm.append("duration", ep.duration || "");
          epForm.append("isLocked", String(ep.isLocked));
          epForm.append("isVertical", String(ep.isVertical));
          epForm.append("videoUrl", epVideoUrl);
          epForm.append("thumbnail", epThumbnailUrl);

          await API.post(`/admin/drama-episodes/${dramaId}/add`, epForm, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      alert("Short Drama published successfully! 🎬");

      // Reset
      setForm(EMPTY_FORM);
      setPosterFile(null);
      setBannerFile(null);
      setTrailerFile(null);
      setCast([{ name: "", image: "" }]);
      setCastFiles({});
      setEpisodes([{ episodeNumber: 1, title: "", description: "", duration: "", isLocked: false, isVertical: true }]);
      setEpisodeVideoFiles({});
      setEpisodeThumbnailFiles({});

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error publishing short drama");
    }
    setLoading(false);
  };

  /* ── HELPERS ── */
  const FilePreview = ({ file, label }) =>
    file ? (
      <div style={{ fontSize: "0.8rem", color: "var(--green)", display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <span>✓ {file.name}</span>
      </div>
    ) : (
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>{label}</div>
    );

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header" style={{ alignItems: "center" }}>
        <div>
          <h1 className="pg-title">
            <Plus size={24} style={{ color: "var(--primary)" }} />
            Add Short Drama
          </h1>
          <p className="pg-sub">Publish a new short drama with episodes to the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 30 }}>

        {/* Basic Info */}
        <div className="premium-card">
          <h3 className="section-title"><span><Film size={18} /></span> Basic Information</h3>
          <div className="form-2col" style={{ marginBottom: 20 }}>
            <div className="form-row form-full">
              <label className="form-label">Drama Title *</label>
              <input
                className="form-input-styled"
                name="title"
                placeholder="e.g. Love in Seoul"
                onChange={ch}
                value={form.title}
                required
              />
            </div>
            <div className="form-row form-full">
              <label className="form-label">Description</label>
              <textarea
                className="form-input-styled"
                name="description"
                placeholder="A brief summary..."
                rows={3}
                onChange={ch}
                value={form.description}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-row">
              <label className="form-label"><Globe size={14} style={{ marginRight: 4 }} />Language</label>
              <input
                className="form-input-styled"
                name="language"
                placeholder="Korean, Hindi, etc."
                onChange={ch}
                value={form.language}
              />
            </div>
            <div className="form-row">
              <label className="form-label"><Tag size={14} style={{ marginRight: 4 }} />Genres</label>
              <input
                className="form-input-styled"
                name="genre"
                placeholder="Romance, Drama, Comedy"
                onChange={ch}
                value={form.genre}
              />
            </div>
            <div className="form-row">
              <label className="form-label"><Layers size={14} style={{ marginRight: 4 }} />Category</label>
              <select className="form-input-styled" name="category" onChange={ch} value={form.category}>
                <option value="">Select Category</option>
                <option value="trending">Trending</option>
                <option value="top10">Top 10</option>
                <option value="recommended">Recommended</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Status</label>
              <select className="form-input-styled" name="status" onChange={ch} value={form.status}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Priority</label>
              <input
                className="form-input-styled"
                name="priority"
                type="number"
                placeholder="0"
                onChange={ch}
                value={form.priority}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
            <label className="checkbox-row" style={{ flex: 1, minWidth: "200px", background: "rgba(229,9,20,0.1)", borderColor: "rgba(229,9,20,0.2)" }}>
              <input type="checkbox" name="isPremium" onChange={ch} checked={form.isPremium} />
              <span style={{ color: "var(--primary)" }}><Lock size={16} style={{ marginRight: 8 }} />Premium Content</span>
            </label>
          </div>
        </div>

        {/* Media Assets */}
        <div className="premium-card">
          <h3 className="section-title"><span><Image size={18} /></span> Media Assets</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>

            {/* Poster */}
            <div>
              <label className="form-label">Poster Image</label>
              <div
                className="upload-zone"
                onClick={() => posterInputRef.current?.click()}
                style={{ cursor: "pointer", minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Upload size={22} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Click to upload poster</span>
              </div>
              <input ref={posterInputRef} type="file" accept="image/*" hidden onChange={(e) => setPosterFile(e.target.files?.[0] || null)} />
              <FilePreview file={posterFile} label="No poster selected" />
            </div>

            {/* Banner */}
            <div>
              <label className="form-label">Banner Image</label>
              <div
                className="upload-zone"
                onClick={() => bannerInputRef.current?.click()}
                style={{ cursor: "pointer", minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Upload size={22} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Click to upload banner</span>
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              <FilePreview file={bannerFile} label="No banner selected" />
            </div>

            {/* Trailer */}
            <div>
              <label className="form-label">Trailer Video</label>
              <div
                className="upload-zone"
                onClick={() => trailerInputRef.current?.click()}
                style={{ cursor: "pointer", minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Video size={22} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Click to upload trailer</span>
              </div>
              <input ref={trailerInputRef} type="file" accept="video/*" hidden onChange={(e) => setTrailerFile(e.target.files?.[0] || null)} />
              <FilePreview file={trailerFile} label="No trailer selected" />
            </div>
          </div>
        </div>

        {/* Cast */}
        <div className="premium-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 className="section-title" style={{ margin: 0 }}><span><Users size={18} /></span> Cast Members</h3>
            <button type="button" className="btn btn-ghost" onClick={addCast} style={{ fontSize: "0.85rem" }}>
              <Plus size={16} /> Add Cast
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cast.map((member, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--bg3)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="form-input-styled"
                    placeholder="Actor name"
                    value={member.name}
                    onChange={(e) => chCast(i, "name", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", cursor: "pointer" }}>
                    <input type="file" accept="image/*" hidden onChange={(e) => handleCastFileChange(i, e)} />
                    <div className="btn btn-ghost" style={{ fontSize: "0.8rem", textAlign: "center" }}>
                      <Upload size={14} /> {castFiles[i] ? castFiles[i].name.slice(0, 20) : "Upload Photo"}
                    </div>
                  </label>
                </div>
                <button type="button" className="icon-btn del" onClick={() => removeCast(i)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Episodes */}
        <div className="premium-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 className="section-title" style={{ margin: 0 }}><span><Video size={18} /></span> Episodes</h3>
            <button type="button" className="btn btn-ghost" onClick={addEpisode} style={{ fontSize: "0.85rem" }}>
              <Plus size={16} /> Add Episode
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {episodes.map((ep, i) => (
              <div key={i} style={{ background: "var(--bg3)", borderRadius: 12, padding: "16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.9rem" }}>
                    Episode {ep.episodeNumber}
                  </span>
                  <button type="button" className="icon-btn del" onClick={() => removeEpisode(i)}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  <div>
                    <label className="form-label">Episode #</label>
                    <input
                      className="form-input-styled"
                      type="number"
                      min="1"
                      value={ep.episodeNumber}
                      onChange={(e) => chEpisode(i, "episodeNumber", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Title</label>
                    <input
                      className="form-input-styled"
                      placeholder="Episode title"
                      value={ep.title}
                      onChange={(e) => chEpisode(i, "title", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Duration</label>
                    <input
                      className="form-input-styled"
                      placeholder="e.g. 5m"
                      value={ep.duration}
                      onChange={(e) => chEpisode(i, "duration", e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input-styled"
                    placeholder="Episode description..."
                    rows={2}
                    value={ep.description}
                    onChange={(e) => chEpisode(i, "description", e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                  {/* Video Upload */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Episode Video</label>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="video/*" hidden onChange={(e) => handleEpisodeVideoChange(i, e)} />
                      <div className="upload-zone" style={{ padding: "10px", textAlign: "center", cursor: "pointer" }}>
                        <Video size={18} style={{ color: "var(--text-muted)" }} />
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {episodeVideoFiles[i] ? episodeVideoFiles[i].name.slice(0, 25) : "Upload Video"}
                        </div>
                      </div>
                    </label>
                  </div>
                  {/* Thumbnail Upload */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Thumbnail</label>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/*" hidden onChange={(e) => handleEpisodeThumbnailChange(i, e)} />
                      <div className="upload-zone" style={{ padding: "10px", textAlign: "center", cursor: "pointer" }}>
                        <Image size={18} style={{ color: "var(--text-muted)" }} />
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {episodeThumbnailFiles[i] ? episodeThumbnailFiles[i].name.slice(0, 25) : "Upload Thumbnail"}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Flags */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={ep.isLocked}
                        onChange={(e) => chEpisode(i, "isLocked", e.target.checked)}
                      />
                      <Lock size={14} /> Locked (Premium)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={ep.isVertical}
                        onChange={(e) => chEpisode(i, "isVertical", e.target.checked)}
                      />
                      Vertical Video
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="submit-row" style={{ marginTop: 20 }}>
          <button
            type="submit"
            className="btn-lg"
            disabled={loading}
            style={{ minWidth: "240px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }}
                />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Rocket size={20} />
                <span>Publish Short Drama</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
