import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API, { BASE_URL } from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";
import "./Content.css";
import "./Dashboard.css";
import {
  Eye, Edit2, Trash2, X, Play, Headphones, Mic,
  Search, Plus, ChevronRight, ChevronLeft, ChevronDown, User, Calendar, Video,
  Activity, Upload, Layers, Flame, Image as ImageIcon
} from "lucide-react";

/* ===================== PAGINATION COMPONENT ===================== */
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 15, marginTop: 25, padding: "10px 0" }}>
      <button className="btn btn-ghost" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
        Previous
      </button>
      <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
      </span>
      <button className="btn btn-ghost" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>
        Next
      </button>
    </div>
  );
};

/* ===================== SEARCHBAR COMPONENT ===================== */
const SearchBar = ({ placeholder, onSearchChange, onClear, initialValue }) => {
  const [value, setValue] = useState(initialValue || "");
  const timeoutRef = useRef(null);

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 400);
  };

  const handleClear = () => {
    setValue("");
    onClear();
  };

  return (
    <div className="search-bar" style={{ minWidth: "300px" }}>
      <Search size={18} className="search-icon" />
      <input className="search-input" type="text" placeholder={placeholder} value={value} onChange={handleChange} />
      {value && <button className="search-clear" onClick={handleClear}><X size={16} /></button>}
    </div>
  );
};

export default function AudioStories() {
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [isSearching, setIsSearching] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [categories, setCategories] = useState([]);

  // Episodes
  const [selectedStory, setSelectedStory] = useState(null);
  const [episodes, setEpisodes] = useState([]);

  // Modals
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [editData, setEditData] = useState(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const [uploadData, setUploadData] = useState({
    coverImage: null, bannerImage: null, coverImageUrl: "", bannerImageUrl: ""
  });
  
  const [epUploadData, setEpUploadData] = useState({
    audio: null, thumbnail: null, audioUrl: "", thumbnailUrl: ""
  });

  const searchTimeout = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    setSearchQuery("");
    setSearchResults(null);
    return () => {
      controller.abort();
    };
  }, [currentPage]);

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

  const fetchData = async (signal) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/audio-stories?page=${currentPage}&limit=10`, { signal });
      setData(res.data.stories || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);

      setSelectedStory(null);
      setEpisodes([]);
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error(err);
        setData([]);
      }
    }
    setLoading(false);
  };

  const fetchEpisodes = async (storyId) => {
    try {
      const res = await API.get(`/admin/audio-episodes?storyId=${storyId}`);
      const eps = res.data.episodes || [];
      setEpisodes(eps);

      // Auto-sync
      const maxEps = eps.length;
      setSelectedStory(prev => prev ? { ...prev, totalEpisodes: maxEps } : prev);
      setData(prevData => prevData.map(s => s._id === storyId ? { ...s, totalEpisodes: maxEps } : s));
      setSearchResults(prev => prev ? prev.map(s => s._id === storyId ? { ...s, totalEpisodes: maxEps } : s) : prev);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimeout.current = setTimeout(() => doSearch(q.trim()), 400);
  };

  const doSearch = async (q) => {
    setIsSearching(true);
    // basic local search for now, assuming pagination isn't huge or backend has no search for audio
    const localResults = data.filter(item =>
      item.title.toLowerCase().includes(q.toLowerCase()) || 
      (item.author && item.author.toLowerCase().includes(q.toLowerCase()))
    );
    setSearchResults(localResults);
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const displayData = searchResults !== null ? searchResults : data;

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    fetchEpisodes(story._id);
  };

  /* ===================== MODALS ===================== */
  const openEdit = (item) => {
    setEditData({ ...item });
    setSelectedItem(item);
    setModalMode("edit");
    setUploadData({
      coverImage: null,
      bannerImage: null,
      coverImageUrl: item.coverImage || "",
      bannerImageUrl: item.bannerImage || "",
    });
  };
  
  const closeModal = () => {
    setSelectedItem(null); setModalMode(null); setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ coverImage: null, bannerImage: null, coverImageUrl: "", bannerImageUrl: "" });
    setEpUploadData({ audio: null, thumbnail: null, audioUrl: "", thumbnailUrl: "" });
  };

  const openEpisodeEdit = (episode) => {
    setEditData({ ...episode });
    setSelectedItem(episode);
    setSelectedEpisode(episode);
    setModalMode("episode-edit");
    setEpUploadData({
      audio: null,
      thumbnail: null,
      audioUrl: episode.audioUrl || "",
      thumbnailUrl: episode.thumbnail || ""
    });
  };

  /* ===================== SAVE STORY ===================== */
  const handleSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      let coverImageUrl = uploadData.coverImageUrl || "";
      if (uploadData.coverImage) {
        coverImageUrl = await uploadToBunny(uploadData.coverImage, "audiostories", "covers");
      }

      let bannerImageUrl = uploadData.bannerImageUrl || "";
      if (uploadData.bannerImage) {
        bannerImageUrl = await uploadToBunny(uploadData.bannerImage, "audiostories", "banners");
      }

      const formData = new FormData();
      const textFields = ["title", "description", "author", "narrator", "isPremium", "isPublished", "isComingSoon", "priority"];
      
      textFields.forEach(k => {
        const value = editData[k];
        if (value !== undefined) {
          formData.append(k, value);
        }
      });

      if (editData.releaseDate) formData.append("releaseDate", editData.releaseDate);
      if (editData.scheduleDate) formData.append("scheduleDate", editData.scheduleDate);
      
      if (editData.categories) formData.append("parsedCategories", JSON.stringify(editData.categories));

      formData.append("coverImage", coverImageUrl);
      formData.append("bannerImage", bannerImageUrl);

      await API.patch(`/admin/audio-stories/${selectedItem._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Saved successfully");
      closeModal();
      fetchData();
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  /* ===================== SAVE EPISODE ===================== */
  const handleEpisodeSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      let audioUrl = epUploadData.audioUrl || "";
      if (epUploadData.audio) {
        audioUrl = await uploadToBunny(epUploadData.audio, "audiostories", "episodes", (percent) => setUploadProgress(percent));
      }

      let thumbnailUrl = epUploadData.thumbnailUrl || "";
      if (epUploadData.thumbnail) {
        thumbnailUrl = await uploadToBunny(epUploadData.thumbnail, "audiostories", "posters");
      }

      const formData = new FormData();
      const textFields = ["title", "description", "episodeNumber", "duration"];
      textFields.forEach((k) => {
        if (editData[k] !== undefined) {
          formData.append(k, editData[k]);
        }
      });

      formData.append("audioUrl", audioUrl);
      formData.append("thumbnail", thumbnailUrl);

      await API.patch(`/admin/audio-episodes/${selectedEpisode._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Episode saved");
      closeModal();
      fetchEpisodes(selectedStory._id);
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  /* ===================== DELETE ===================== */
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete '${item.title}' permanently?`)) return;
    try {
      await API.delete(`/admin/audio-stories/${item._id}`);
      alert("Deleted");
      fetchData();
      if (selectedStory?._id === item._id) { setSelectedStory(null); setEpisodes([]); }
      closeModal();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleEpisodeDelete = async (ep) => {
    if (!window.confirm(`Delete Ep ${ep.episodeNumber}: ${ep.title}?`)) return;
    try {
      await API.delete(`/admin/audio-episodes/${ep._id}`);
      alert("Episode deleted");
      fetchEpisodes(selectedStory._id);
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Headphones style={{ display: "inline-block", marginRight: 8 }} size={32} /> Audio Stories</h1>
          <p className="pg-sub">Manage audio stories and podcast content</p>
        </div>
        <div>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard/add-audio-story")}>
                <Plus size={18} /> Add Audio Story
            </button>
        </div>
      </div>

      <div className="content-box">
        <div className="filter-row" style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "20px" }}>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <SearchBar
              placeholder="Search audio stories..."
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (!q.trim()) { setSearchResults(null); return; }
                doSearch(q.trim());
              }}
              onClear={clearSearch}
              initialValue={searchQuery}
            />
          </div>
        </div>

        {isSearching && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Searching...</p>}
        {searchResults !== null && !isSearching && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            <button className="link-btn" onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
          </p>
        )}

        <div className="table-section">
          <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}><Headphones size={20} /> Audio Stories Library</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Stories</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Total Episodes</th>
                  <th>Priority</th>
                  <th>Premium</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((item) => (
                  <tr key={item._id} className={selectedStory?._id === item._id ? "selected-row" : ""} onClick={() => handleStoryClick(item)} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="thumb-popular-wrap" style={{ width: 40, height: 40, flexShrink: 0 }}>
                          {item.coverImage ? (
                            <img src={item.coverImage} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, display: "block" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 4, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Headphones size={20} style={{ color: "rgba(255,255,255,0.4)" }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          {item.isComingSoon && (
                            <div style={{ fontSize: "0.75rem", color: "var(--orange)", marginTop: "2px" }}>
                              Coming Soon
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{item.author || "\u2014"}</td>
                    <td>{item.totalEpisodes}</td>
                    <td><strong>{item.priority || 0}</strong></td>
                    <td><span className={`badge ${item.isPremium ? "badge-active" : "badge-draft"}`}>{item.isPremium ? "Premium" : "Free"}</span></td>
                    <td>
                      <span className={`badge ${item.isPublished ? "badge-active" : "badge-draft"}`}>{item.isPublished ? "Published" : "Draft"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit2 size={16} /></button>
                        <button className="btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}><Trash2 size={16} /></button>
                        <button className="btn btn-ghost eps-btn" style={{ padding: "4px 8px", fontSize: "0.8rem", height: "auto" }} onClick={(e) => { e.stopPropagation(); handleStoryClick(item); }}>
                          <Headphones size={14} style={{ marginRight: "4px" }} /> Episodes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayData.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
                        <Headphones size={40} style={{ opacity: 0.5 }} />
                        <p>No audio stories found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {searchResults === null && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={setCurrentPage} />}
        </div>
      </div>

      {/* Selected Story Episodes Panel */}
      {selectedStory && (
        <div className="premium-card episodes-panel" style={{ marginTop: 24, animation: "pageIn 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <span><Headphones size={18} /></span> Episodes for "{selectedStory.title}"
            </h3>
          </div>

          <div className="episodes-list">
            {episodes.map((ep, idx) => (
              <div key={ep._id} className="episode-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(0,0,0,0.2)", borderRadius: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", width: 25 }}>{ep.episodeNumber}</span>
                  <div className="ep-thumbnail" style={{ width: 80, height: 45, borderRadius: 4, overflow: "hidden", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ep.thumbnail ? <img src={ep.thumbnail} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={16} style={{ opacity: 0.3 }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ep.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ep.duration || "0:00"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="action-btn" title="Edit" onClick={() => openEpisodeEdit(ep)}><Edit2 size={16} /></button>
                  <button className="action-btn delete" title="Delete" onClick={() => handleEpisodeDelete(ep)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {episodes.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                <p style={{ color: "var(--text-muted)" }}>No episodes added yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Story Modal */}
      {modalMode === "edit" && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className="modal-header">
              <h3>Edit Audio Story</h3>
              <button onClick={closeModal} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-2col">
                <div className="form-row form-full">
                  <label className="form-label">Title</label>
                  <input className="form-input-styled" value={editData.title || ""} onChange={(e) => setEditData({...editData, title: e.target.value})} />
                </div>
                <div className="form-row form-full">
                  <label className="form-label">Description</label>
                  <textarea className="form-input-styled" value={editData.description || ""} onChange={(e) => setEditData({...editData, description: e.target.value})} rows={3} />
                </div>
              </div>
              <div className="form-grid-3" style={{ marginTop: 15 }}>
                <div className="form-row"><label className="form-label">Author</label><input className="form-input-styled" value={editData.author || ""} onChange={(e) => setEditData({...editData, author: e.target.value})} /></div>
                <div className="form-row"><label className="form-label">Narrator</label><input className="form-input-styled" value={editData.narrator || ""} onChange={(e) => setEditData({...editData, narrator: e.target.value})} /></div>
                <div className="form-row"><label className="form-label">Priority</label><input className="form-input-styled" type="number" value={editData.priority || ""} onChange={(e) => setEditData({...editData, priority: e.target.value})} /></div>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                <label className="checkbox-row" style={{ flex: 1, minWidth: "200px" }}>
                  <input type="checkbox" checked={editData.isPublished || false} onChange={e => setEditData({...editData, isPublished: e.target.checked})} />
                  Published
                </label>
                <label className="checkbox-row" style={{ flex: 1, minWidth: "200px" }}>
                  <input type="checkbox" checked={editData.isComingSoon || false} onChange={e => setEditData({...editData, isComingSoon: e.target.checked})} />
                  Coming Soon
                </label>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                {editData.isComingSoon && (
                  <div className="form-row" style={{ flex: 1, minWidth: "200px" }}>
                    <label className="form-label">Schedule Date</label>
                    <input className="form-input-styled" type="datetime-local" value={editData.scheduleDate ? new Date(editData.scheduleDate).toISOString().slice(0, 16) : ""} onChange={e => setEditData({...editData, scheduleDate: e.target.value})} />
                  </div>
                )}
              </div>

              <div className="form-row form-full" style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>Update Cover Image</p>
                <input type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files[0];
                    if(f) {
                        setUploadData({...uploadData, coverImage: f});
                        setEditData({...editData, coverImage: URL.createObjectURL(f)});
                    }
                }} />
                {editData.coverImage && <img src={editData.coverImage} style={{ height: 100, marginTop: 10, borderRadius: 8 }} />}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={loading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Episode Modal */}
      {modalMode === "episode-edit" && selectedEpisode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className="modal-header">
              <h3>Edit Episode {selectedEpisode.episodeNumber}</h3>
              <button onClick={closeModal} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{marginBottom: 15}}><label className="form-label">Title</label><input className="form-input-styled" value={editData.title || ""} onChange={(e) => setEditData({...editData, title: e.target.value})} /></div>
              <div className="form-row" style={{marginBottom: 15}}><label className="form-label">Duration</label><input className="form-input-styled" value={editData.duration || ""} onChange={(e) => setEditData({...editData, duration: e.target.value})} /></div>
              <div className="form-row" style={{marginBottom: 15}}>
                <label className="form-label">Update Audio File</label>
                <input type="file" accept="audio/*" onChange={(e) => {
                    if (e.target.files[0]) setEpUploadData({...epUploadData, audio: e.target.files[0]});
                }} />
                {epUploadData.audio ? <p style={{fontSize: "0.8rem", color: "var(--primary)", marginTop: 5}}>Selected: {epUploadData.audio.name}</p> : (editData.audioUrl && <p style={{fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 5}}>Current file attached.</p>)}
              </div>
              <div className="form-row">
                <label className="form-label">Update Thumbnail</label>
                <input type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                        setEpUploadData({...epUploadData, thumbnail: f});
                        setEditData({...editData, thumbnail: URL.createObjectURL(f)});
                    }
                }} />
                {editData.thumbnail && <img src={editData.thumbnail} style={{ height: 60, marginTop: 10, borderRadius: 4 }} />}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={loading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEpisodeSave} disabled={loading}>
                {loading ? `Uploading ${uploadProgress}%...` : "Save Episode"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
