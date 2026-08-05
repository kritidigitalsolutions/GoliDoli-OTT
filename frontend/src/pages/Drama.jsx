import { useState, useEffect, useRef } from "react";
import API, { BASE_URL } from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";
import "./Content.css";
import {
  Eye, Edit2, Trash2, X, Play, Film,
  Search, Plus, User, Video, ChevronDown, ChevronRight,
  Upload, Image, Lock, Globe, Tag, Layers, Star,
} from "lucide-react";

export default function Drama() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Selected drama & its episodes
  const [selectedDrama, setSelectedDrama] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [epLoading, setEpLoading] = useState(false);

  // Modals
  const [modalMode, setModalMode] = useState(null); // "view" | "edit" | "ep-view" | "ep-edit"
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [editData, setEditData] = useState(null);

  // Upload state
  const [uploadData, setUploadData] = useState({ poster: null, banner: null, trailer: null });
  const [castFiles, setCastFiles] = useState({});
  const [epUpload, setEpUpload] = useState({ video: null, thumbnail: null });

  // Add episode form
  const [showAddEpForm, setShowAddEpForm] = useState(false);
  const [newEp, setNewEp] = useState({ episodeNumber: "", title: "", description: "", duration: "", isLocked: false, isVertical: true });
  const [newEpVideo, setNewEpVideo] = useState(null);
  const [newEpThumb, setNewEpThumb] = useState(null);
  const [addingEp, setAddingEp] = useState(false);

  const searchTimeout = useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";
    if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(url)) return url;

    if (url.startsWith("/uploads") || url.includes("uploads/")) {
      console.warn(`[LEGACY] Media url using local filesystem path detected: ${url}. Migrate this database entry to BunnyCDN.`);
    }

    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  /* ── FETCH ── */
  useEffect(() => {
    fetchData();
    setSearchQuery("");
    setSearchResults(null);
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/shortdramas?page=${currentPage}&limit=10`);
      setData(res.data.dramas || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setData([]);
    }
    setLoading(false);
  };

  const fetchEpisodes = async (dramaId) => {
    setEpLoading(true);
    try {
      const res = await API.get(`/admin/drama-episodes/${dramaId}`);
      setEpisodes((res.data.episodes || []).sort((a, b) => a.episodeNumber - b.episodeNumber));
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
    setEpLoading(false);
  };

  /* ── SEARCH ── */
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimeout.current = setTimeout(() => doSearch(q.trim()), 400);
  };

  const doSearch = async (q) => {
    setIsSearching(true);
    try {
      const res = await API.get(`/admin/shortdramas/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.results || []);
    } catch {
      setSearchResults(data.filter(d => d.title.toLowerCase().includes(q.toLowerCase())));
    }
    setIsSearching(false);
  };

  const clearSearch = () => { setSearchQuery(""); setSearchResults(null); };
  const displayData = searchResults !== null ? searchResults : data;

  /* ── DRAMA CLICK ── */
  const handleDramaClick = (drama) => {
    setSelectedDrama(drama);
    fetchEpisodes(drama._id);
  };

  /* ── MODALS ── */
  const openView = (item) => { setSelectedItem(item); setModalMode("view"); setEditData(null); };
  const openEdit = (item) => {
    setEditData({ ...item, cast: item.cast ? [...item.cast.map(c => ({ ...c }))] : [] });
    setSelectedItem(item);
    setModalMode("edit");
    setCastFiles({});
    setUploadData({ poster: null, banner: null, trailer: null });
  };
  const openEpEdit = (ep) => {
    setEditData({ ...ep });
    setSelectedEpisode(ep);
    setModalMode("ep-edit");
    setEpUpload({ video: null, thumbnail: null });
  };
  const openEpView = (ep) => {
    setSelectedEpisode(ep);
    setModalMode("ep-view");
  };
  const closeModal = () => {
    setSelectedItem(null);
    setModalMode(null);
    setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ poster: null, banner: null, trailer: null });
    setEpUpload({ video: null, thumbnail: null });
    setCastFiles({});
  };

  /* ── SAVE DRAMA ── */
  const handleSaveDrama = async () => {
    if (!editData) return;
    setLoading(true);
    try {
      // 1. Direct upload cast image files
      const castPayload = (editData.cast || []).map(c => ({ name: c.name, image: c.image || "" }));
      const castEntries = Object.entries(castFiles);
      for (const [idxStr, file] of castEntries) {
        const idx = parseInt(idxStr, 10);
        if (file) {
          const cdnUrl = await uploadToBunny(file, "shortdramas", "cast");
          if (castPayload[idx]) {
            castPayload[idx].image = cdnUrl;
          }
        }
      }

      // 2. Direct upload poster
      let posterUrl = editData.poster || "";
      if (uploadData.poster) {
        posterUrl = await uploadToBunny(uploadData.poster, "shortdramas", "posters");
      }

      // 3. Direct upload banner
      let bannerUrl = editData.banner || "";
      if (uploadData.banner) {
        bannerUrl = await uploadToBunny(uploadData.banner, "shortdramas", "banners");
      }

      // 4. Direct upload trailer
      let trailerUrl = editData.trailerUrl || "";
      if (uploadData.trailer) {
        trailerUrl = await uploadToBunny(uploadData.trailer, "shortdramas", "trailers");
      }

      const formData = new FormData();
      ["title", "description", "language", "isPremium", "status", "priority"].forEach(k => {
        if (editData[k] !== undefined) formData.append(k, editData[k]);
      });
      if (editData.genre) formData.append("genre", JSON.stringify(Array.isArray(editData.genre) ? editData.genre : editData.genre.split(",").map(s => s.trim()).filter(Boolean)));
      if (editData.category) formData.append("category", JSON.stringify(Array.isArray(editData.category) ? editData.category : [editData.category]));

      formData.append("cast", JSON.stringify(castPayload));
      formData.append("poster", posterUrl);
      formData.append("banner", bannerUrl);
      formData.append("trailerUrl", trailerUrl);

      await API.patch(`/admin/shortdramas/${selectedItem._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Drama updated successfully!");
      closeModal();
      fetchData();
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  /* ── SAVE EPISODE ── */
  const handleSaveEpisode = async () => {
    if (!editData) return;
    setLoading(true);
    try {
      // 1. Direct upload episode video file
      let videoUrl = editData.videoUrl || "";
      if (epUpload.video) {
        videoUrl = await uploadToBunny(epUpload.video, "dramaepisodes", "videos");
      }

      // 2. Direct upload thumbnail file
      let thumbnailUrl = editData.thumbnail || "";
      if (epUpload.thumbnail) {
        thumbnailUrl = await uploadToBunny(epUpload.thumbnail, "dramaepisodes", "posters");
      }

      const formData = new FormData();
      ["episodeNumber", "title", "description", "duration", "isLocked", "isVertical"].forEach(k => {
        if (editData[k] !== undefined) formData.append(k, editData[k]);
      });
      formData.append("videoUrl", videoUrl);
      formData.append("thumbnail", thumbnailUrl);

      await API.patch(`/admin/drama-episodes/${selectedEpisode._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Episode updated!");
      closeModal();
      if (selectedDrama) fetchEpisodes(selectedDrama._id);
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  /* ── ADD EPISODE ── */
  const handleAddEpisode = async () => {
    if (!newEp.episodeNumber || !selectedDrama) return;
    setAddingEp(true);
    try {
      // 1. Direct upload new episode video
      let videoUrl = "";
      if (newEpVideo) {
        videoUrl = await uploadToBunny(newEpVideo, "dramaepisodes", "videos");
      }

      // 2. Direct upload new episode thumbnail
      let thumbnailUrl = "";
      if (newEpThumb) {
        thumbnailUrl = await uploadToBunny(newEpThumb, "dramaepisodes", "posters");
      }

      const formData = new FormData();
      formData.append("episodeNumber", newEp.episodeNumber);
      formData.append("title", newEp.title || "");
      formData.append("description", newEp.description || "");
      formData.append("duration", newEp.duration || "");
      formData.append("isLocked", String(newEp.isLocked));
      formData.append("isVertical", String(newEp.isVertical));
      formData.append("videoUrl", videoUrl);
      formData.append("thumbnail", thumbnailUrl);

      await API.post(`/admin/drama-episodes/${selectedDrama._id}/add`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Episode added!");
      setShowAddEpForm(false);
      setNewEp({ episodeNumber: "", title: "", description: "", duration: "", isLocked: false, isVertical: true });
      setNewEpVideo(null);
      setNewEpThumb(null);
      fetchEpisodes(selectedDrama._id);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
    setAddingEp(false);
  };

  /* ── DELETE ── */
  const handleDelete = async (drama) => {
    if (!window.confirm(`Delete '${drama.title}' and all its episodes?`)) return;
    try {
      await API.delete(`/admin/shortdramas/${drama._id}`);
      alert("Deleted!");
      fetchData();
      if (selectedDrama?._id === drama._id) setSelectedDrama(null);
      closeModal();
    } catch { alert("Delete failed"); }
  };

  const handleDeleteEpisode = async (ep) => {
    if (!window.confirm(`Delete Episode ${ep.episodeNumber}: ${ep.title}?`)) return;
    try {
      await API.delete(`/admin/drama-episodes/${ep._id}`);
      alert("Episode deleted!");
      if (selectedDrama) fetchEpisodes(selectedDrama._id);
    } catch { alert("Delete failed"); }
  };

  /* ── CAST HELPERS ── */
  const addCastMember = () => setEditData(prev => ({ ...prev, cast: [...(prev.cast || []), { name: "", image: "" }] }));
  const removeCastMember = (idx) => {
    setEditData(prev => ({ ...prev, cast: prev.cast.filter((_, i) => i !== idx) }));
    setCastFiles(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };
  const updateCastMember = (idx, field, value) => {
    setEditData(prev => ({ ...prev, cast: prev.cast.map((c, i) => i === idx ? { ...c, [field]: value } : c) }));
  };

  /* ── PAGINATION ── */
  const Pagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 15, marginTop: 25, padding: "10px 0" }}>
        <button className="btn btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</button>
        <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
        </span>
        <button className="btn btn-ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
      </div>
    );
  };

  /* ── RENDER ── */
  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Film style={{ display: "inline-block", marginRight: 8 }} size={32} /> Short Drama Library</h1>
          <p className="pg-sub">Manage short dramas and their episodes</p>
        </div>
      </div>

      <div className="content-box">
        {/* Search */}
        <div className="filter-row" style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "20px" }}>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <div className="search-bar" style={{ minWidth: "300px" }}>
              <Search size={18} className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Search dramas..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && <button className="search-clear" onClick={clearSearch}><X size={16} /></button>}
            </div>
          </div>
        </div>

        {isSearching && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Searching…</p>}
        {searchResults !== null && !isSearching && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            <button className="link-btn" onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
          </p>
        )}

        {/* ── DRAMAS TABLE ── */}
        {!selectedDrama && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Film size={20} /> Short Dramas</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Dramas</span>
            </div>
            {loading ? <p>Loading…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Genre</th>
                      <th>Category</th>
                      <th>Episodes</th>
                      <th>Status</th>
                      <th>Premium</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={7}>No dramas found</td></tr>
                    ) : displayData.map(drama => (
                      <tr key={drama._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={getFullUrl(drama.poster)} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} onError={e => e.target.style.display = "none"} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{drama.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{drama.language}</div>
                            </div>
                          </div>
                        </td>
                        <td>{Array.isArray(drama.genre) ? drama.genre.join(", ") : drama.genre}</td>
                        <td>{Array.isArray(drama.category) ? drama.category.join(", ") : drama.category}</td>
                        <td>
                          <button
                            className="link-btn"
                            onClick={() => handleDramaClick(drama)}
                            style={{ fontWeight: 600, color: "var(--primary)" }}
                          >
                            {drama.totalEpisodes || 0} eps <ChevronRight size={14} />
                          </button>
                        </td>
                        <td>
                          <span className={`badge ${drama.status === "completed" ? "badge-active" : "badge-pub"}`}>
                            {drama.status === "completed" ? "Completed" : "Ongoing"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${drama.isPremium ? "badge-active" : "badge-draft"}`}>
                            {drama.isPremium ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(drama)} title="View"><Eye size={18} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(drama)} title="Edit"><Edit2 size={18} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(drama)} title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination />
          </div>
        )}

        {/* ── EPISODES VIEW ── */}
        {selectedDrama && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => setSelectedDrama(null)} style={{ padding: "6px 12px" }}>
                  ← Back
                </button>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedDrama.title}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{episodes.length} episodes</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => openEdit(selectedDrama)}><Edit2 size={16} /> Edit Drama</button>
                <button className="btn btn-primary" onClick={() => setShowAddEpForm(true)}><Plus size={16} /> Add Episode</button>
              </div>
            </div>

            {/* Add Episode Form */}
            {showAddEpForm && (
              <div style={{ background: "var(--bg3)", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid var(--border)" }}>
                <h4 style={{ marginTop: 0, marginBottom: 16 }}>New Episode</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                  <div>
                    <label className="form-label">Episode #</label>
                    <input className="form-input-styled" type="number" min="1" value={newEp.episodeNumber}
                      onChange={e => setNewEp(p => ({ ...p, episodeNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Title</label>
                    <input className="form-input-styled" value={newEp.title}
                      onChange={e => setNewEp(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input-styled" placeholder="e.g. 5m" value={newEp.duration}
                      onChange={e => setNewEp(p => ({ ...p, duration: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input-styled" rows={2} value={newEp.description}
                    onChange={e => setNewEp(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  <div>
                    <label className="form-label">Video File</label>
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <input type="file" accept="video/*" hidden onChange={e => setNewEpVideo(e.target.files?.[0])} />
                      <div className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                        <Upload size={14} /> {newEpVideo ? newEpVideo.name.slice(0, 20) : "Upload Video"}
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="form-label">Thumbnail</label>
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <input type="file" accept="image/*" hidden onChange={e => setNewEpThumb(e.target.files?.[0])} />
                      <div className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                        <Image size={14} /> {newEpThumb ? newEpThumb.name.slice(0, 20) : "Upload Thumb"}
                      </div>
                    </label>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={newEp.isLocked} onChange={e => setNewEp(p => ({ ...p, isLocked: e.target.checked }))} />
                      <Lock size={13} /> Locked
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={newEp.isVertical} onChange={e => setNewEp(p => ({ ...p, isVertical: e.target.checked }))} />
                      Vertical
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={handleAddEpisode} disabled={addingEp}>
                    {addingEp ? "Adding…" : "Add Episode"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowAddEpForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {epLoading ? <p>Loading episodes…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ep #</th>
                      <th>Title</th>
                      <th>Duration</th>
                      <th>Locked</th>
                      <th>Vertical</th>
                      <th>Views</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episodes.length === 0 ? (
                      <tr><td colSpan={7}>No episodes yet. Add your first episode!</td></tr>
                    ) : episodes.map(ep => (
                      <tr key={ep._id}>
                        <td><strong>Ep {ep.episodeNumber}</strong></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {ep.thumbnail && <img src={getFullUrl(ep.thumbnail)} alt="" style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4 }} onError={e => e.target.style.display = "none"} />}
                            <span>{ep.title || "—"}</span>
                          </div>
                        </td>
                        <td>{ep.duration || "—"}</td>
                        <td>
                          <span className={`badge ${ep.isLocked ? "badge-active" : "badge-draft"}`}>
                            {ep.isLocked ? "Locked" : "Free"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${ep.isVertical ? "badge-pub" : "badge-draft"}`}>
                            {ep.isVertical ? "Vertical" : "Landscape"}
                          </span>
                        </td>
                        <td>{ep.views || 0}</td>
                        <td>
                          <div className="tbl-actions">
                            {ep.videoUrl && <button className="icon-btn view" onClick={() => openEpView(ep)} title="Play"><Play size={18} /></button>}
                            <button className="icon-btn edit" onClick={() => openEpEdit(ep)} title="Edit"><Edit2 size={18} /></button>
                            <button className="icon-btn del" onClick={() => handleDeleteEpisode(ep)} title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" style={{ maxWidth: 800, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                {modalMode === "view" && `Viewing: ${selectedItem?.title}`}
                {modalMode === "edit" && `Editing: ${selectedItem?.title}`}
                {modalMode === "ep-view" && `Episode ${selectedEpisode?.episodeNumber}: ${selectedEpisode?.title}`}
                {modalMode === "ep-edit" && `Edit Episode ${selectedEpisode?.episodeNumber}`}
              </h2>
              <button className="icon-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {/* VIEW DRAMA */}
            {modalMode === "view" && selectedItem && (
              <div style={{ padding: "20px" }}>
                {selectedItem.banner && <img src={getFullUrl(selectedItem.banner)} alt="banner" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 20 }} />}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {selectedItem.poster && <img src={getFullUrl(selectedItem.poster)} alt="poster" style={{ width: 120, height: 180, objectFit: "cover", borderRadius: 8 }} />}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: "0 0 8px" }}>{selectedItem.title}</h2>
                    <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>{selectedItem.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedItem.genre?.map(g => <span key={g} className="badge badge-pub">{g}</span>)}
                      {selectedItem.category?.map(c => <span key={c} className="badge badge-coming">{c}</span>)}
                    </div>
                    <div style={{ marginTop: 12, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                      <div><Globe size={14} style={{ marginRight: 4 }} />{selectedItem.language}</div>
                      <div><Video size={14} style={{ marginRight: 4 }} />{selectedItem.totalEpisodes || 0} episodes</div>
                      <div><Star size={14} style={{ marginRight: 4 }} />{selectedItem.isPremium ? "Premium" : "Free"}</div>
                    </div>
                  </div>
                </div>
                {selectedItem.cast?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <h4>Cast</h4>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {selectedItem.cast.map((c, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          {c.image ? <img src={getFullUrl(c.image)} alt={c.name} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={20} /></div>}
                          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{c.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EDIT DRAMA */}
            {modalMode === "edit" && editData && (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-2col">
                  <div className="form-row form-full">
                    <label className="form-label">Title</label>
                    <input className="form-input-styled" value={editData.title || ""} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="form-row form-full">
                    <label className="form-label">Description</label>
                    <textarea className="form-input-styled" rows={3} value={editData.description || ""} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  <div>
                    <label className="form-label"><Globe size={14} /> Language</label>
                    <input className="form-input-styled" value={editData.language || ""} onChange={e => setEditData(p => ({ ...p, language: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label"><Tag size={14} /> Genre (comma-separated)</label>
                    <input className="form-input-styled" value={Array.isArray(editData.genre) ? editData.genre.join(", ") : editData.genre || ""} onChange={e => setEditData(p => ({ ...p, genre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label"><Layers size={14} /> Category</label>
                    <select className="form-input-styled" value={Array.isArray(editData.category) ? editData.category[0] || "" : editData.category || ""} onChange={e => setEditData(p => ({ ...p, category: [e.target.value].filter(Boolean) }))}>
                      <option value="">Select</option>
                      <option value="trending">Trending</option>
                      <option value="top10">Top 10</option>
                      <option value="recommended">Recommended</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select className="form-input-styled" value={editData.status || "ongoing"} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Priority</label>
                    <input
                      className="form-input-styled"
                      type="number"
                      placeholder="0"
                      value={editData.priority !== undefined ? editData.priority : ""}
                      onChange={e => setEditData(p => ({ ...p, priority: e.target.value === "" ? "" : Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!editData.isPremium} onChange={e => setEditData(p => ({ ...p, isPremium: e.target.checked }))} />
                    <Lock size={14} /> Premium
                  </label>
                </div>

                {/* Media Uploads */}
                <div>
                  <h4 style={{ marginBottom: 12 }}>Media Assets</h4>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {["poster", "banner", "trailer"].map(field => (
                      <div key={field} style={{ flex: 1, minWidth: 140 }}>
                        <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                        <label style={{ cursor: "pointer", display: "block" }}>
                          <input type="file" accept={field === "trailer" ? "video/*" : "image/*"} hidden
                            onChange={e => setUploadData(p => ({ ...p, [field]: e.target.files?.[0] || null }))} />
                          <div className="upload-zone" style={{ textAlign: "center", padding: "12px", cursor: "pointer" }}>
                            {field === "trailer" ? <Video size={18} /> : <Image size={18} />}
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                              {uploadData[field] ? uploadData[field].name.slice(0, 18) : `Replace ${field}`}
                            </div>
                          </div>
                        </label>
                        {editData[field === "trailer" ? "trailerUrl" : field] && !uploadData[field] && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Current: ✓ Uploaded</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cast */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ margin: 0 }}>Cast</h4>
                    <button type="button" className="btn btn-ghost" onClick={addCastMember} style={{ fontSize: "0.8rem" }}><Plus size={14} /> Add</button>
                  </div>
                  {(editData.cast || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      {c.image && <img src={getFullUrl(c._previewUrl || c.image)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />}
                      <input className="form-input-styled" style={{ flex: 1 }} placeholder="Name" value={c.name || ""} onChange={e => updateCastMember(i, "name", e.target.value)} />
                      <label style={{ cursor: "pointer" }}>
                        <input type="file" accept="image/*" hidden onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCastFiles(prev => ({ ...prev, [i]: file }));
                            updateCastMember(i, "_previewUrl", URL.createObjectURL(file));
                          }
                        }} />
                        <div className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 8px" }}><Upload size={12} /></div>
                      </label>
                      <button type="button" className="icon-btn del" onClick={() => removeCastMember(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveDrama} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
                  <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                </div>
              </div>
            )}

            {/* EPISODE VIEW */}
            {modalMode === "ep-view" && selectedEpisode && (
              <div style={{ padding: "20px" }}>
                {selectedEpisode.videoUrl ? (
                  <video
                    controls
                    autoPlay
                    style={{ width: "100%", borderRadius: 10, maxHeight: 400 }}
                    src={getFullUrl(selectedEpisode.videoUrl)}
                  />
                ) : <p style={{ color: "var(--text-muted)" }}>No video uploaded for this episode.</p>}
                <div style={{ marginTop: 16 }}>
                  <h3>Episode {selectedEpisode.episodeNumber}: {selectedEpisode.title}</h3>
                  <p style={{ color: "var(--text-muted)" }}>{selectedEpisode.description}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <span className={`badge ${selectedEpisode.isLocked ? "badge-active" : "badge-draft"}`}>{selectedEpisode.isLocked ? "Locked" : "Free"}</span>
                    <span className="badge badge-pub">{selectedEpisode.isVertical ? "Vertical" : "Landscape"}</span>
                    {selectedEpisode.duration && <span className="badge badge-draft">{selectedEpisode.duration}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* EPISODE EDIT */}
            {modalMode === "ep-edit" && editData && (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                  <div>
                    <label className="form-label">Episode #</label>
                    <input className="form-input-styled" type="number" value={editData.episodeNumber || ""} onChange={e => setEditData(p => ({ ...p, episodeNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Title</label>
                    <input className="form-input-styled" value={editData.title || ""} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input-styled" placeholder="e.g. 5m" value={editData.duration || ""} onChange={e => setEditData(p => ({ ...p, duration: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input-styled" rows={3} value={editData.description || ""} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.9rem" }}>
                    <input type="checkbox" checked={!!editData.isLocked} onChange={e => setEditData(p => ({ ...p, isLocked: e.target.checked }))} />
                    <Lock size={14} /> Locked
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.9rem" }}>
                    <input type="checkbox" checked={!!editData.isVertical} onChange={e => setEditData(p => ({ ...p, isVertical: e.target.checked }))} />
                    Vertical Video
                  </label>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Replace Video</label>
                    <label style={{ cursor: "pointer", display: "block" }}>
                      <input type="file" accept="video/*" hidden onChange={e => setEpUpload(p => ({ ...p, video: e.target.files?.[0] }))} />
                      <div className="upload-zone" style={{ textAlign: "center", padding: "12px", cursor: "pointer" }}>
                        <Video size={18} />
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {epUpload.video ? epUpload.video.name.slice(0, 20) : "Upload Video"}
                        </div>
                      </div>
                    </label>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Replace Thumbnail</label>
                    <label style={{ cursor: "pointer", display: "block" }}>
                      <input type="file" accept="image/*" hidden onChange={e => setEpUpload(p => ({ ...p, thumbnail: e.target.files?.[0] }))} />
                      <div className="upload-zone" style={{ textAlign: "center", padding: "12px", cursor: "pointer" }}>
                        <Image size={18} />
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {epUpload.thumbnail ? epUpload.thumbnail.name.slice(0, 20) : "Upload Thumbnail"}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveEpisode} disabled={loading}>{loading ? "Saving…" : "Save Episode"}</button>
                  <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
