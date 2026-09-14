import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API, { BASE_URL } from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";

import "./Content.css";
import "./Dashboard.css";
import {
  Eye, Edit2, Trash2, X, Play, Film, Tv,
  Search, Plus, ChevronRight, ChevronLeft, ChevronDown, User, Calendar, Video,
  Activity, Upload, Layers, Flame, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert, AlertCircle
} from "lucide-react";

/* ===================== PAGINATION COMPONENT ===================== */
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 15, marginTop: 25, padding: "10px 0" }}>
      <button
        className="btn btn-ghost"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Previous
      </button>
      <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
      </span>
      <button
        className="btn btn-ghost"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
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
    <div className="search-bar">
      <Search size={15} className="search-icon" />
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button className="search-clear" onClick={handleClear} title="Clear Search">
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default function Content() {
  const navigate = useNavigate();
  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const [contentType, setContentType] = useState("movies");
  const [adultFilter, setAdultFilter] = useState("all"); // "all" | "non-adult" | "adult"
  const location = useLocation();

  /* ===================== CUSTOM DIALOG POPUP STATE ===================== */
  const [popupDialog, setPopupDialog] = useState({
    isOpen: false,
    type: "warning", // "warning" | "danger" | "success" | "info"
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const showCustomAlert = (message, title = "Notification", type = "info") => {
    return new Promise((resolve) => {
      setPopupDialog({
        isOpen: true,
        type,
        title,
        message,
        confirmText: "OK",
        cancelText: null,
        onConfirm: () => {
          setPopupDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null,
      });
    });
  };

  const showCustomConfirm = (message, title = "Please Confirm", type = "warning", confirmText = "Continue", cancelText = "Cancel") => {
    return new Promise((resolve) => {
      setPopupDialog({
        isOpen: true,
        type,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setPopupDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setPopupDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const [stats, setStats] = useState({
    totalItems: 0,
    moviesCount: 0,
    seriesCount: 0,
    microdramasCount: 0,
  });

  const fetchContentStats = async () => {
    try {
      const [mRes, sRes, mdRes] = await Promise.all([
        API.get("/admin/movies?page=1&limit=1"),
        API.get("/admin/series?page=1&limit=1"),
        API.get("/admin/microdramas?page=1&limit=1"),
      ]);
      const mTotal = mRes.data.total || (mRes.data.movies || []).length || 0;
      const sTotal = sRes.data.total || (sRes.data.series || []).length || 0;
      const mdTotal = mdRes.data.total || (mdRes.data.microdramas || []).length || 0;
      setStats({
        moviesCount: mTotal,
        seriesCount: sTotal,
        microdramasCount: mdTotal,
        totalItems: mTotal + sTotal + mdTotal,
      });
    } catch (err) {
      console.error("Failed to fetch content stats:", err);
    }
  };

  useEffect(() => {
    fetchContentStats();
  }, []);

  useEffect(() => {
    if (location.state?.contentType) {
      setContentType(location.state.contentType);
    }
  }, [location.state]);

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

  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [collapsedSeasons, setCollapsedSeasons] = useState({});

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "saving", "complete", ""
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [uploadData, setUploadData] = useState({
    poster: null, banner: null, trailer: null, video: null
  });
  const [castFiles, setCastFiles] = useState({}); // { index: File }


  // Add season/episode forms
  const [showAddEpisodeForm, setShowAddEpisodeForm] = useState(null); // seasonNumber
  const [newEpisode, setNewEpisode] = useState({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
  const [newEpisodeVideo, setNewEpisodeVideo] = useState(null);
  const [newEpisodeVideoUrl, setNewEpisodeVideoUrl] = useState("");
  const [newEpisodeThumbnail, setNewEpisodeThumbnail] = useState(null);
  const [newEpisodeThumbnailUrl, setNewEpisodeThumbnailUrl] = useState("");
  const [showAddSeasonForm, setShowAddSeasonForm] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState("");
  const [addingEpisode, setAddingEpisode] = useState(false);


  const videoRef = useRef(null);
  const searchTimeout = useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";
    // Check if it's already a full URL (http, https, data:, blob:, or //)
    const isFullUrl = /^(https?:\/\/|data:|blob:|\/\/)/i.test(url);
    if (isFullUrl) return url;

    if (url.startsWith("/uploads") || url.includes("uploads/")) {
      console.warn(`[LEGACY] Media url using local filesystem path detected: ${url}. Migrate this database entry to BunnyCDN.`);
    }

    // Otherwise, append BASE_URL and ensure proper slash handling
    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };



  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    setSearchQuery("");
    setSearchResults(null);
    return () => {
      controller.abort();
    };
  }, [contentType, currentPage]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/admin/categories");
        if (res.data.success) {
          // Show active categories only
          const list = (res.data.categories || []).filter(c => c.isActive !== false);
          setCategories(list);
        }
      } catch (err) {
        console.error("Error fetching categories for content edit:", err);
      }
    };
    fetchCategories();
  }, []);


  /* ===================== LOCK LOGIC ===================== */
  const isLocked = (item) => {
    // if (!item.isComingSoon) return false;
    if (!item.releaseDate) return false;
    return new Date(item.releaseDate) > new Date();
  };

  // Coming-soon: view & edit allowed, but video upload locked (trailer OK)
  const isVideoUploadLocked = (item) => isLocked(item);

  /* ===================== DATA FETCH ===================== */
  const fetchData = async (signal) => {
    setLoading(true);
    try {
      if (contentType === "all") {
        // Fetch all three content types in parallel
        const [moviesRes, seriesRes, microdramasRes] = await Promise.all([
          API.get(`/admin/movies?page=1&limit=100`, { signal }),
          API.get(`/admin/series?page=1&limit=100`, { signal }),
          API.get(`/admin/microdramas?page=1&limit=100`, { signal }),
        ]);
        const movies = (moviesRes.data.movies || []).map(m => ({ ...m, _type: "movie" }));
        const series = (seriesRes.data.series || []).map(s => ({ ...s, _type: "series" }));
        const microdramas = (microdramasRes.data.microdramas || []).map(md => ({ ...md, _type: "microdrama" }));
        const combined = [...movies, ...series, ...microdramas];
        setData(combined);
        setTotalPages(1);
        setTotalItems(combined.length);
      } else {
        const endpoint = contentType === "movies" ? "/admin/movies" :
          contentType === "series" ? "/admin/series" :
            contentType === "microdramas" ? "/admin/microdramas" :
              "/admin/movies";
        const res = await API.get(`${endpoint}?page=${currentPage}&limit=10`, { signal });

        const key = contentType === "movies" ? "movies" :
          contentType === "series" ? "series" :
            contentType === "microdramas" ? "microdramas" :
              "movies";
        setData(res.data[key] || []);
        setTotalPages(res.data.pages || 1);
        setTotalItems(res.data.total || 0);
      }

      setSelectedSeries(null);
      setEpisodes([]);
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error(err);
        setData([]);
      }
    }
    setLoading(false);
  };


  const fetchEpisodes = async (seriesId) => {
    try {
      const epEndpoint = contentType === "microdramas" ? `/admin/microdramas-episodes/${seriesId}` : `/admin/episodes?seriesId=${seriesId}`;
      const res = await API.get(epEndpoint);
      const eps = res.data.episodes || [];
      setEpisodes(eps);

      // Auto-sync series totalSeasons locally to reflect in UI instantly
      const maxS = eps.length > 0 ? Math.max(...eps.map(e => e.seasonNumber)) : 0;
      setSelectedSeries(prev => prev ? { ...prev, totalSeasons: Math.max(prev.totalSeasons || 0, maxS) } : prev);
      setData(prevData => prevData.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s));
      setSearchResults(prev => prev ? prev.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s) : prev);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };


  /* ===================== SEARCH ===================== */
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
      const endpoint = contentType === "movies" ? `/admin/movies/search?q=${encodeURIComponent(q)}` :
        contentType === "series" ? `/admin/series/search?q=${encodeURIComponent(q)}` :
          contentType === "microdramas" ? `/admin/microdramas/search?q=${encodeURIComponent(q)}` :
            `/admin/movies/search?q=${encodeURIComponent(q)}`;
      const res = await API.get(endpoint);
      setSearchResults(res.data.results || []);
    } catch (err) {
      // Fallback to local search if admin search endpoint doesn't exist
      const localResults = data.filter(item =>
        item.title.toLowerCase().includes(q.toLowerCase())
      );
      setSearchResults(localResults);
    }
    setIsSearching(false);
  };


  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const displayData = searchResults !== null ? searchResults : data;

  // Adult sub-filter: isHide only applies when is18plus is true
  const filteredDisplayData = displayData.filter(item => {
    if (adultFilter === "adult") return item.is18plus === true;
    if (adultFilter === "non-adult") return item.is18plus !== true;
    return true; // "all"
  });

  /* ===================== SERIES / EPISODES ===================== */
  const handleSeriesClick = (series) => {
    setSelectedSeries(series);
    fetchEpisodes(series._id);
    setCollapsedSeasons({});
    setEpisodeSearchQuery("");
  };

  const groupEpisodesBySeason = () => {
    const grouped = {};
    const filteredEpisodes = episodeSearchQuery.trim()
      ? episodes.filter(ep =>
        ep.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()) ||
        ep.seasonNumber.toString() === episodeSearchQuery.trim() ||
        ep.episodeNumber.toString() === episodeSearchQuery.trim()
      )
      : episodes;

    filteredEpisodes.forEach(ep => {
      const sNum = ep.seasonNumber || 1;
      if (!grouped[sNum]) grouped[sNum] = [];
      grouped[sNum].push(ep);
    });
    return grouped;
  };

  const toggleSeason = (seasonNum) => {
    setCollapsedSeasons(prev => ({ ...prev, [seasonNum]: !prev[seasonNum] }));
  };

  /* ===================== ADD EPISODE ===================== */
  const handleAddEpisode = async (seasonNumber) => {
    const epData = showAddEpisodeForm === "new-season"
      ? { ...newEpisode, seasonNumber: Number(newSeasonNumber) }
      : { ...newEpisode, seasonNumber: Number(seasonNumber) };

    if (!epData.title || !epData.episodeNumber || !epData.seasonNumber) {
      showCustomAlert("Title, Episode Number, and Season Number are required.", "Required Fields", "warning");
      return;
    }
    setAddingEpisode(true);
    try {
      let videoUrl = newEpisodeVideoUrl || "";
      let thumbnailUrl = newEpisodeThumbnailUrl || "";

      if (newEpisodeVideo) {
        videoUrl = await uploadToBunny(newEpisodeVideo, "episodes", "videos");
      }
      if (newEpisodeThumbnail) {
        thumbnailUrl = await uploadToBunny(newEpisodeThumbnail, "episodes", "posters");
      }

      const formData = new FormData();
      formData.append("seriesId", selectedSeries._id);
      formData.append("title", epData.title);
      formData.append("episodeNumber", epData.episodeNumber);
      formData.append("seasonNumber", epData.seasonNumber);
      formData.append("duration", epData.duration || "");
      formData.append("description", epData.description || "");
      formData.append("videoUrl", videoUrl);
      formData.append("thumbnailUrl", thumbnailUrl);

      const epAddRoute = contentType === "microdramas" ? `/admin/microdramas-episodes/${selectedSeries._id}/add` : "/admin/episodes/add";
      await API.post(epAddRoute, formData, { headers: { "Content-Type": "multipart/form-data" } });

      showCustomAlert("Episode added successfully!", "Success", "success");
      setShowAddEpisodeForm(null);
      setShowAddSeasonForm(false);
      setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
      setNewSeasonNumber("");
      setNewEpisodeVideo(null);
      setNewEpisodeVideoUrl("");
      setNewEpisodeThumbnail(null);
      setNewEpisodeThumbnailUrl("");
      setNewSeasonNumber("");
      fetchEpisodes(selectedSeries._id);

    } catch (err) {
      showCustomAlert("Failed: " + (err.response?.data?.message || err.message), "Error", "danger");
    }
    setAddingEpisode(false);
  };

  /* ===================== DELETE SEASON ===================== */
  const handleDeleteSeason = async (seasonNumber) => {
    const confirmed = await showCustomConfirm(
      `Delete ALL episodes in Season ${seasonNumber}? This cannot be undone.`,
      "Delete Season",
      "danger",
      "Delete Season",
      "Cancel"
    );
    if (!confirmed) return;
    try {
      if (contentType === "microdramas") {
        showCustomAlert("Deleting entire seasons is not supported for Microdramas yet.", "Not Supported", "info");
        return;
      }
      await API.delete(`/admin/episodes/season/${selectedSeries._id}/${seasonNumber}`);

      showCustomAlert(`Season ${seasonNumber} deleted`, "Season Deleted", "success");
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      showCustomAlert("Failed to delete season: " + (err.response?.data?.message || err.message), "Delete Failed", "danger");
    }
  };

  /* ===================== MODALS ===================== */
  const openView = (item) => { setSelectedItem(item); setModalMode("view"); setEditData(null); };
  const openEdit = (item) => {
    setEditData({ ...item, cast: item.cast ? [...item.cast.map(c => ({ ...c }))] : [] });
    setSelectedItem(item);
    setModalMode("edit");
    setCastFiles({});
    setUploadData({
      poster: null,
      banner: null,
      trailer: null,
      video: null,
      posterUrl: item.poster || "",
      bannerUrl: item.banner || "",
      trailerUrl: item.trailerUrl || "",
      videoUrl: item.videoUrl || ""
    });
  };
  const closeModal = () => {
    if (editData?.cast) {
      editData.cast.forEach(c => {
        if (c._previewUrl) URL.revokeObjectURL(c._previewUrl);
      });
    }
    setSelectedItem(null); setModalMode(null); setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ poster: null, banner: null, trailer: null, video: null });
    setCastFiles({});
  };

  const openEpisodePlayer = (episode) => {
    setSelectedEpisode(episode); setSelectedItem(episode); setModalMode("episode-view");
  };

  const openEpisodeEdit = (episode) => {
    setEditData({ ...episode });
    setSelectedItem(episode);
    setSelectedEpisode(episode);
    setModalMode("episode-edit");
    setUploadData({
      video: null,
      thumbnail: null,
      videoUrl: episode.videoUrl || "",
      thumbnailUrl: episode.thumbnail || ""
    });
  };

  /* ===================== UPLOAD ===================== */
  const handleUploadChange = (field, file) => {
    setUploadData(prev => ({ ...prev, [field]: file }));
  };



  /* ===================== EDIT SAVE ===================== */
  const handleSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      const typeFolder = contentType === "movies" ? "movies" :
        contentType === "series" ? "series" :
          contentType === "microdramas" ? "microdramas" :
            "movies";

      // 1. Direct upload cast image files and update payload URLs
      const invalidCast = (editData.cast || []).find((c, idx) => {
        const hasImage = Boolean(c.image || castFiles[idx]);
        return hasImage && !String(c.name || "").trim();
      });

      if (invalidCast) {
        throw new Error("Cast member name is required when a cast image is set");
      }

      const castPayload = (editData.cast || [])
        .map(c => ({
          name: String(c.name || "").trim(),
          image: c.image || "",
        }))
        .filter(c => c.name || c.image);
      const castEntries = Object.entries(castFiles);
      for (const [idxStr, file] of castEntries) {
        const idx = parseInt(idxStr, 10);
        if (file) {
          const cdnUrl = await uploadToBunny(file, typeFolder, "cast");
          if (castPayload[idx]) {
            castPayload[idx].image = cdnUrl;
          }
        }
      }

      // 2. Direct upload poster
      let posterUrl = uploadData.posterUrl || "";
      if (uploadData.poster) {
        posterUrl = await uploadToBunny(uploadData.poster, typeFolder, "posters");
      }

      // 3. Direct upload banner
      let bannerUrl = uploadData.bannerUrl || "";
      if (uploadData.banner) {
        bannerUrl = await uploadToBunny(uploadData.banner, typeFolder, "banners");
      }

      // 4. Direct upload trailer
      let trailerUrl = uploadData.trailerUrl || "";
      if (uploadData.trailer) {
        trailerUrl = await uploadToBunny(
          uploadData.trailer,
          typeFolder,
          "trailers",
          (percent) => setUploadProgress(percent)   // Γ£à add this
        );
      }

      // 5. Direct upload video (movies only)
      let videoUrl = uploadData.videoUrl || "";
      if (contentType === "movies" && uploadData.video) {
        videoUrl = await uploadToBunny(uploadData.video, "movies", "videos", (percent) => {
          setUploadProgress(percent);
        });
      }

      const formData = new FormData();
      // Basic text fields
      const textFields = ["title", "description", "language", "duration", "rating", "releaseYear", "isPremium", "isComingSoon", "isPopular", "is18plus", "isHide", "releaseDate", "priority"];

      textFields.forEach(k => {
        const value = editData[k];

        if (value === undefined || value === null) {
          return;
        }

        if (
          k === "releaseDate" &&
          (value === "" || value === "null" || Number.isNaN(Date.parse(value)))
        ) {
          return;
        }

        formData.append(k, value);
      });
      if (editData.genre) formData.append("genre", JSON.stringify(editData.genre));
      if (editData.category) formData.append("category", JSON.stringify(editData.category));

      formData.append("cast", JSON.stringify(castPayload));
      formData.append("poster", posterUrl);
      formData.append("banner", bannerUrl);
      formData.append("trailerUrl", trailerUrl);
      if (contentType === "movies") {
        formData.append("videoUrl", videoUrl);
      }

      const route = contentType === "movies" ? "movies" :
        contentType === "series" ? "series" :
          "microdramas";
      await API.patch(`/admin/${route}/${selectedItem._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showCustomAlert("Saved successfully", "Success", "success");
      closeModal();
      fetchData();
    } catch (err) {
      console.error("CONTENT SAVE ERROR:", err.response?.data || err);
      showCustomAlert("Save failed: " + (err.response?.data?.error || err.response?.data?.message || err.message), "Save Failed", "danger");
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  const handleEpisodeSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      // 1. Direct upload episode video file
      let videoUrl = uploadData.videoUrl || "";
      if (uploadData.video) {
        videoUrl = await uploadToBunny(uploadData.video, "episodes", "videos", (percent) => {
          setUploadProgress(percent);
        });
      }

      // 2. Direct upload thumbnail file
      let thumbnailUrl = uploadData.thumbnailUrl || "";
      if (uploadData.thumbnail) {
        thumbnailUrl = await uploadToBunny(uploadData.thumbnail, "episodes", "posters");
      }

      const formData = new FormData();
      const textFields = ["title", "description", "seasonNumber", "episodeNumber", "duration"];
      textFields.forEach((k) => {

        // Prevent sending invalid null date
        if (
          k === "releaseDate" &&
          (
            editData[k] === null ||
            editData[k] === "" ||
            editData[k] === undefined
          )
        ) {
          return;
        }

        if (editData[k] !== undefined) {
          formData.append(k, editData[k]);
        }
      });

      formData.append("videoUrl", videoUrl);
      formData.append("thumbnailUrl", thumbnailUrl);

      const epUpdateRoute = contentType === "microdramas" ? `/admin/microdramas-episodes/${selectedEpisode._id}` : `/admin/episodes/${selectedEpisode._id}`;
      await API.patch(epUpdateRoute, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showCustomAlert("Episode saved", "Success", "success");
      closeModal();
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      showCustomAlert("Save failed: " + (err.response?.data?.message || err.message), "Save Failed", "danger");
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  /* ===================== TOGGLE PUBLISHED (OPTIMISTIC INSTANT UI) ===================== */
  const handleTogglePublished = async (item) => {
    const originalStatus = item.isPublished;
    const updatedIsPublished = item.isPublished === false ? true : false;

    // 1. Instant local state update (0ms UI latency)
    setData(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: updatedIsPublished } : x));
    if (searchResults) {
      setSearchResults(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: updatedIsPublished } : x));
    }

    // 2. Background API persistence with exact item route
    try {
      const route = item._type === "series" ? "series" :
        item._type === "microdrama" ? "microdramas" :
        item._type === "movie" ? "movies" :
        contentType === "series" ? "series" :
        contentType === "microdramas" ? "microdramas" :
        "movies";

      await API.patch(`/admin/${route}/${item._id}`, { isPublished: updatedIsPublished });
    } catch (err) {
      console.error("Failed to update status on server:", err);
      // Revert local state on error
      setData(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: originalStatus } : x));
      if (searchResults) {
        setSearchResults(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: originalStatus } : x));
      }
      showCustomAlert("Failed to save toggle state to server.", "Update Failed", "danger");
    }
  };

  /* ===================== BULK HIDE 18+ CONTENT ===================== */
  const [bulkHiding, setBulkHiding] = useState(false);

  const handleBulkHideAdult = async (hideValue) => {
    // Get all 18+ items from current data
    const adultItems = data.filter(item => item.is18plus === true);
    if (adultItems.length === 0) { showCustomAlert("No 18+ content found.", "Notice", "info"); return; }

    const action = hideValue ? "hide" : "unhide";
    const confirmed = await showCustomConfirm(
      `This will ${action} all ${adultItems.length} item(s) marked as 18+. Continue?`,
      "Content Visibility Confirmation",
      "warning",
      "Continue",
      "Cancel"
    );
    if (!confirmed) return;

    setBulkHiding(true);
    try {
      // Determine route per item (use _type if available, else contentType)
      const getRoute = (item) => {
        if (item._type === "movie") return "movies";
        if (item._type === "series") return "series";
        if (item._type === "microdrama") return "microdramas";
        return contentType === "movies" ? "movies" : contentType === "series" ? "series" : "microdramas";
      };

      await Promise.all(
        adultItems.map(item =>
          API.patch(`/admin/${getRoute(item)}/${item._id}`, { isHide: hideValue })
        )
      );

      // Update local state
      setData(prev => prev.map(x => x.is18plus ? { ...x, isHide: hideValue } : x));
      if (searchResults) {
        setSearchResults(prev => prev.map(x => x.is18plus ? { ...x, isHide: hideValue } : x));
      }
    } catch (err) {
      console.error(err);
      showCustomAlert("Bulk action failed: " + (err.response?.data?.message || err.message), "Action Failed", "danger");
    } finally {
      setBulkHiding(false);
    }
  };

  /* ===================== DELETE ===================== */
  const handleDelete = async (item) => {
    const confirmed = await showCustomConfirm(
      `Delete '${item.title || item.name}' permanently? This action cannot be undone.`,
      "Confirm Permanent Delete",
      "danger",
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;
    try {
      if (contentType === "movies") await API.delete(`/admin/movies/${item._id}`);
      else if (contentType === "series") await API.delete(`/admin/series/${item._id}`);
      else if (contentType === "microdramas") await API.delete(`/admin/microdramas/${item._id}`);
      else if (contentType === "movies") await API.delete(`/admin/movies/${item._id}`);

      showCustomAlert("Item deleted successfully", "Deleted", "success");
      fetchData();
      if (selectedSeries?._id === item._id) { setSelectedSeries(null); setEpisodes([]); }
      closeModal();
    } catch (err) {
      showCustomAlert("Delete failed: " + (err.response?.data?.message || err.message), "Delete Failed", "danger");
    }
  };

  const handleEpisodeDelete = async (ep) => {
    const confirmed = await showCustomConfirm(
      `Delete Ep ${ep.episodeNumber}: ${ep.title}? This action cannot be undone.`,
      "Delete Episode",
      "danger",
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;
    try {
      const epDeleteRoute = contentType === "microdramas" ? `/admin/microdramas-episodes/${ep._id}` : `/admin/episodes/${ep._id}`;
      await API.delete(epDeleteRoute);

      showCustomAlert("Episode deleted", "Deleted", "success");
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      showCustomAlert("Delete failed: " + (err.response?.data?.message || err.message), "Delete Failed", "danger");
    }
  };

  /* ===================== PiP ===================== */
  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch (e) { console.error("PiP:", e); }
  };

  /* ===================== CAST HELPERS ===================== */
  const addCastMember = () => {
    setEditData(prev => ({ ...prev, cast: [...(prev.cast || []), { name: "", image: "", file: null }] }));
  };
  const removeCastMember = (idx) => {
    setEditData(prev => {
      const target = prev.cast[idx];
      if (target?._previewUrl) URL.revokeObjectURL(target._previewUrl);
      return { ...prev, cast: prev.cast.filter((_, i) => i !== idx) };
    });
    // Shift cast files keys to align with shifted indices
    setCastFiles(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, file]) => {
        const keyIndex = parseInt(k, 10);
        if (keyIndex < idx) {
          next[keyIndex] = file;
        } else if (keyIndex > idx) {
          next[keyIndex - 1] = file;
        }
      });
      return next;
    });
  };
  const updateCastMember = (idx, field, value) => {
    setEditData(prev => ({
      ...prev,
      cast: prev.cast.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };
  const setCastImageFile = (idx, file) => {
    setCastFiles(prev => ({ ...prev, [idx]: file }));
    // Show local preview
    if (file) {
      const url = URL.createObjectURL(file);
      updateCastMember(idx, "_previewUrl", url);
    }
  };

  /* ===================== TABLE UI HELPERS ===================== */
  const renderCategories = (category) => {
    const catArray = Array.isArray(category)
      ? category
      : typeof category === "string"
      ? category.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    if (catArray.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>;

    const displayCats = catArray.slice(0, 2);
    const remaining = catArray.length - 2;

    return (
      <div className="cat-chip-group">
        {displayCats.map((cat, idx) => (
          <span key={idx} className="cat-chip">
            {cat}
          </span>
        ))}
        {remaining > 0 && (
          <span className="cat-chip-more" title={catArray.slice(2).join(", ")}>
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  const renderAudienceBadge = (is18plus) => {
    return is18plus ? (
      <span className="badge-audience adult">🔞 18+ Adult</span>
    ) : (
      <span className="badge-audience non-adult">✓ Family</span>
    );
  };

  const renderStatusToggle = (item) => {
    const isPub = item.isPublished !== false;
    const locked = isLocked(item);
    return (
      <div className="status-toggle-wrap">
        <label className="switch-container" title={isPub ? "Click to make Draft" : "Click to Publish"}>
          <input
            type="checkbox"
            className="switch-input"
            checked={isPub}
            onChange={() => handleTogglePublished(item)}
          />
          <span className="switch-slider"></span>
        </label>
        <span className={`status-label ${isPub ? (locked ? "coming-soon" : "published") : "draft"}`}>
          {isPub ? (locked ? "Coming Soon" : "Published") : "Draft"}
        </span>
      </div>
    );
  };

  /* ===================== GROUPED SEASONS ===================== */
  const groupedEpisodes = groupEpisodesBySeason();
  const seasonNumbers = Object.keys(groupedEpisodes).map(Number).sort((a, b) => a - b);

  /* ===================== RENDER ===================== */
  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Film className="pg-title-icon" size={20} />
            Content Management
          </h1>
          <p className="pg-sub">View, filter, and manage platform movies, series, and microdramas</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/add-content")}
            style={{ padding: "7px 14px", fontSize: "0.82rem" }}
          >
            <Plus size={15} /> Add Content
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              fetchData();
              fetchContentStats();
            }}
            disabled={loading}
            title="Refresh Content List"
            style={{ padding: "7px 12px", fontSize: "0.78rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* 4-Card Symmetrical KPI Grid */}
      <div className="kpi-grid kpi-grid-4">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Catalog</span>
            <div className="kpi-icon-badge icon-amber">
              <Layers size={15} />
            </div>
          </div>
          <div className="kpi-value">{stats.totalItems.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Total media items in library
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Movies</span>
            <div className="kpi-icon-badge icon-blue">
              <Film size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#3B82F6" }}>{stats.moviesCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#3B82F6" }}>
            Feature films & titles
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Series & Shows</span>
            <div className="kpi-icon-badge icon-indigo">
              <Tv size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#6366F1" }}>{stats.seriesCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#6366F1" }}>
            Episodic series & seasons
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Microdramas</span>
            <div className="kpi-icon-badge icon-emerald">
              <Flame size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>{stats.microdramasCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Short-form drama content
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12, alignItems: "center" }}>
          {/* Category Segmented Switch */}
          <div className="segmented-switch">
            {[
              { key: "all", label: "All Content", icon: Layers },
              { key: "movies", label: "Movies", icon: Film },
              { key: "series", label: "Series", icon: Tv },
              { key: "microdramas", label: "Microdramas", icon: Flame },
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isActive = contentType === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`segmented-switch-btn ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setContentType(tab.key);
                    setCurrentPage(1);
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeContentTabPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">
                    <IconComponent size={14} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <SearchBar
              placeholder={`Search ${contentType}...`}
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

        {/* Rating / Audience Filter Chips */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Rating Filter:</span>
          {[
            { key: "all", label: "All" },
            { key: "non-adult", label: "Family Friendly" },
            { key: "adult", label: "🔞 18+ Adult" },
          ].map(({ key, label }) => {
            const isActive = adultFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAdultFilter(key)}
                className={`filter-chip ${isActive ? "active" : ""} ${key}`}
              >
                {label}
              </button>
            );
          })}
          {adultFilter === "adult" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 10 }}>
              <label className="switch-container" title="Hide All 18+ Content">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={filteredDisplayData.length > 0 && filteredDisplayData.every(i => i.isHide)}
                  disabled={bulkHiding || filteredDisplayData.length === 0}
                  onChange={e => handleBulkHideAdult(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                {bulkHiding ? "Updating..." : "Hide All 18+ Content"}
              </span>
            </div>
          )}
        </div>

        {/* Search status */}
        {isSearching && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Searching...</p>}
        {searchResults !== null && !isSearching && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            <button className="link-btn" onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
          </p>
        )}

        {/* ========== ALL CONTENT TABLE ========== */}
        {contentType === "all" && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Layers size={20} /> All Content Library</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Items</span>
            </div>
            {loading ? <p>Loading...</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Type</th><th>Category</th><th>Year</th><th>Audience</th><th>Priority</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplayData.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No content found</td></tr>
                    ) : filteredDisplayData.map(item => (
                      <tr key={item._id}>
                        <td>
                          <div className="tbl-media-cell">
                            <div className="thumb-popular-wrap">
                              {item.poster ? (
                                <img
                                  src={getFullUrl(item.poster)}
                                  alt=""
                                  className="thumb-img"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Film size={18} style={{ color: "var(--text-muted)" }} />
                              )}
                              {item.isPopular && <span className="thumb-popular-tape">🔥 Popular</span>}
                            </div>
                            <div>
                              <div className="media-title">{item.title}</div>
                              <div className="media-sub">{item.duration || (item.totalSeasons ? `${item.totalSeasons} Season(s)` : "")}</div>
                              {isLocked(item) && (
                                <div className="media-lock-date">
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(item.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge-type ${item._type}`}>
                            {item._type === "movie" ? "Movie" : item._type === "series" ? "Series" : "Microdrama"}
                          </span>
                        </td>
                        <td>{renderCategories(item.category)}</td>
                        <td><span className="year-txt">{item.releaseYear || "—"}</span></td>
                        <td>{renderAudienceBadge(item.is18plus)}</td>
                        <td><span className="priority-badge">{item.priority || 0}</span></td>
                        <td>{renderStatusToggle(item)}</td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(item)} title="View"><Eye size={15} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(item)} title="Edit"><Edit2 size={15} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={15} /></button>
                            {(item._type === "series" || item._type === "microdrama") && (
                              <button className="btn-seasons" onClick={() => { setContentType(item._type === "series" ? "series" : "microdramas"); setTimeout(() => handleSeriesClick(item), 100); }} title="Seasons & Episodes">
                                <Tv size={13} /> Seasons
                              </button>
                            )}
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

        {/* ========== MOVIES TABLE ========== */}
        {contentType === "movies" && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Film size={20} /> Movies Library</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Movies</span>
            </div>
            {loading ? <p>Loading...</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Category</th><th>Year</th><th>Audience</th><th>Priority</th><th>Premium</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplayData.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No content found</td></tr>
                    ) : filteredDisplayData.map(movie => (
                      <tr key={movie._id}>
                        <td>
                          <div className="tbl-media-cell">
                            <div className="thumb-popular-wrap">
                              {movie.poster ? (
                                <img
                                  src={getFullUrl(movie.poster)}
                                  alt=""
                                  className="thumb-img"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Film size={18} style={{ color: "var(--text-muted)" }} />
                              )}
                              {movie.isPopular && <span className="thumb-popular-tape">🔥 Popular</span>}
                            </div>
                            <div>
                              <div className="media-title">{movie.title}</div>
                              <div className="media-sub">{movie.duration || "Movie"}</div>
                              {isLocked(movie) && (
                                <div className="media-lock-date">
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(movie.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{renderCategories(movie.category)}</td>
                        <td><span className="year-txt">{movie.releaseYear || "—"}</span></td>
                        <td>{renderAudienceBadge(movie.is18plus)}</td>
                        <td><span className="priority-badge">{movie.priority || 0}</span></td>
                        <td>
                          <span className={`badge-tier ${movie.isPremium ? "premium" : "free"}`}>
                            {movie.isPremium ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td>{renderStatusToggle(movie)}</td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(movie)} title="View"><Eye size={15} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(movie)} title="Edit"><Edit2 size={15} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(movie)} title="Delete"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}


        {/* ========== SERIES TABLE ========== */}
        {(contentType === "series" || contentType === "microdramas") && !selectedSeries && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Tv size={20} /> {contentType === "series" ? "Series" : "Microdramas"} Library</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total {contentType === "series" ? "Series" : "Microdramas"}</span>
            </div>
            {loading ? <p>Loading...</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Category</th><th>Year</th><th>Audience</th><th>Priority</th><th>Seasons</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplayData.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No content found</td></tr>
                    ) : filteredDisplayData.map(series => (
                      <tr key={series._id}>
                        <td>
                          <div className="tbl-media-cell">
                            <div className="thumb-popular-wrap">
                              {series.poster ? (
                                <img
                                  src={getFullUrl(series.poster)}
                                  alt=""
                                  className="thumb-img"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Tv size={18} style={{ color: "var(--text-muted)" }} />
                              )}
                              {series.isPopular && <span className="thumb-popular-tape">🔥 Popular</span>}
                            </div>
                            <div>
                              <div className="media-title">{series.title}</div>
                              <div className="media-sub">{series.totalSeasons ? `${series.totalSeasons} Season(s)` : "Series"}</div>
                              {isLocked(series) && (
                                <div className="media-lock-date">
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(series.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{renderCategories(series.category)}</td>
                        <td><span className="year-txt">{series.releaseYear || "—"}</span></td>
                        <td>{renderAudienceBadge(series.is18plus)}</td>
                        <td><span className="priority-badge">{series.priority || 0}</span></td>
                        <td><span className="seasons-count-tag">{series.totalSeasons || 1} Seasons</span></td>
                        <td>{renderStatusToggle(series)}</td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => openView(series)} title="View"><Eye size={15} /></button>
                            <button className="icon-btn edit" onClick={() => openEdit(series)} title="Edit"><Edit2 size={15} /></button>
                            <button className="icon-btn del" onClick={() => handleDelete(series)} title="Delete"><Trash2 size={15} /></button>
                            <button className="btn-seasons" onClick={() => handleSeriesClick(series)} title="Seasons & Episodes">
                              <Tv size={13} /> Seasons
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}


        {/* ========== EPISODES VIEW ========== */}
        {selectedSeries && (
          <div>
            {/* Series episodes header */}
            <div className="seasons-view-header">
              <button className="back-btn" onClick={() => { setSelectedSeries(null); setEpisodes([]); }}>
                <ChevronLeft size={20} />
                <span>Back to Library</span>
              </button>

              <div className="series-mini-card">
                <img src={getFullUrl(selectedSeries.poster || selectedSeries.banner)} alt="" className="mini-poster" />
                <div className="mini-info">
                  <div className="mini-title-row">
                    <Tv size={24} className="type-icon" />
                    <h2>{selectedSeries.title}</h2>
                  </div>
                  <div className="mini-stats">
                    <div className="stat-item">
                      <strong>{episodes.length}</strong>
                      <span>Episodes</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                      <strong>{seasonNumbers.length}</strong>
                      <span>Seasons</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary add-season-btn"
                  onClick={() => { setShowAddSeasonForm(true); setShowAddEpisodeForm("new-season"); }}
                >
                  <Plus size={18} /> <span>Add New Season</span>
                </button>
              </div>

              <div className="seasons-search-wrapper">
                <div className="search-bar">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search episodes by title, season, or number..."
                    className="search-input"
                    value={episodeSearchQuery}
                    onChange={e => setEpisodeSearchQuery(e.target.value)}
                  />
                  {episodeSearchQuery && (
                    <button className="search-clear" onClick={() => setEpisodeSearchQuery("")}><X size={16} /></button>
                  )}
                </div>
              </div>
            </div>

            {/* Add new season form */}
            {showAddSeasonForm && showAddEpisodeForm === "new-season" && (
              <div className="add-form-card" style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12, color: "var(--primary)" }}>
                  <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Add New Season &amp; First Episode
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 12 }}>
                  <div className="form-row">
                    <label className="form-label">Season Number *</label>
                    <input className="form-input" type="number" min="1" value={newSeasonNumber} onChange={e => setNewSeasonNumber(e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Number *</label>
                    <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 1" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 45m" />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <label className="form-label">Episode Title *</label>
                  <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 12 }}>
                  <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="form-label">Episode Video*</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="video/*" id="new-ep-video-new" className="file-input" onChange={e => { setNewEpisodeVideo(e.target.files[0]); setNewEpisodeVideoUrl(""); }} />
                      <label htmlFor="new-ep-video-new" className="file-label">
                        {newEpisodeVideo ? `\u2713 ${newEpisodeVideo.name}` : "Choose Video"}
                      </label>
                    </div>
                    <input className="form-input" placeholder="Or Paste URL" value={newEpisodeVideoUrl} onChange={e => { setNewEpisodeVideoUrl(e.target.value); if (e.target.value) setNewEpisodeVideo(null); }} />
                  </div>

                  <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="form-label">Episode Thumbnail</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="image/*" id="new-ep-thumb-new" className="file-input" onChange={e => { setNewEpisodeThumbnail(e.target.files[0]); setNewEpisodeThumbnailUrl(""); }} />
                      <label htmlFor="new-ep-thumb-new" className="file-label">
                        {newEpisodeThumbnail ? `\u2713 ${newEpisodeThumbnail.name}` : "Choose Thumbnail"}
                      </label>
                    </div>
                    <input className="form-input" placeholder="Or Paste URL" value={newEpisodeThumbnailUrl} onChange={e => { setNewEpisodeThumbnailUrl(e.target.value); if (e.target.value) setNewEpisodeThumbnail(null); }} />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleAddEpisode("new-season")} disabled={addingEpisode}>
                    {addingEpisode ? "Adding..." : <><Plus size={14} /> Add Season &amp; Episode</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowAddSeasonForm(false); setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewSeasonNumber(""); setNewEpisodeVideo(null); setNewEpisodeVideoUrl(""); setNewEpisodeThumbnail(null); setNewEpisodeThumbnailUrl(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Seasons */}
            {seasonNumbers.length === 0 && !showAddSeasonForm && (
              <div className="empty-state-container">
                <div className="empty-state-card">
                  <div className="empty-state-icon">
                    <Tv size={64} />
                    <div className="icon-pulse"></div>
                  </div>
                  <h3>No Seasons Created Yet</h3>
                  <p>Start building your series library by adding the first season and episode.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setShowAddSeasonForm(true); setShowAddEpisodeForm("new-season"); }}
                  >
                    <Plus size={18} /> Add Your First Season
                  </button>
                </div>
              </div>
            )}

            {seasonNumbers.map(seasonNum => (
              <div key={seasonNum} className="season-block">
                {/* Season header */}
                <div className="season-header">
                  <button className="season-toggle" onClick={() => toggleSeason(seasonNum)}>
                    {collapsedSeasons[seasonNum] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <span>Season {seasonNum}</span>
                    <span className="season-count">{groupedEpisodes[seasonNum].length} episodes</span>
                  </button>
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => { setShowAddEpisodeForm(seasonNum); setShowAddSeasonForm(false); setNewEpisode(p => ({ ...p, seasonNumber: seasonNum })); }}
                    >
                      <Plus size={14} /> Add Episode
                    </button>
                    <button
                      className="btn btn-ghost del-season-btn"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => handleDeleteSeason(seasonNum)}
                    >
                      <Trash2 size={14} /> Delete Season
                    </button>
                  </div>
                </div>

                {/* Add episode inline form for this season */}
                {showAddEpisodeForm === seasonNum && (
                  <div className="add-form-card add-form-nested">
                    <h4 style={{ marginBottom: 12 }}>Add Episode to Season {seasonNum}</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 12 }}>
                      <div className="form-row">
                        <label className="form-label">Episode Number *</label>
                        <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 3" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Duration</label>
                        <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="45m" />
                      </div>
                    </div>

                    <div className="form-row" style={{ marginBottom: 12 }}>
                      <label className="form-label">Title *</label>
                      <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 12 }}>
                      <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label className="form-label">Video * </label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id={`ep-video-s${seasonNum}`} className="file-input" onChange={e => { setNewEpisodeVideo(e.target.files[0]); setNewEpisodeVideoUrl(""); }} />
                          <label htmlFor={`ep-video-s${seasonNum}`} className="file-label">{newEpisodeVideo ? `\u2713 ${newEpisodeVideo.name}` : "Choose Video"}</label>
                        </div>
                        <input className="form-input" placeholder="Or Paste URL" value={newEpisodeVideoUrl} onChange={e => { setNewEpisodeVideoUrl(e.target.value); if (e.target.value) setNewEpisodeVideo(null); }} />
                      </div>

                      <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label className="form-label">Thumbnail </label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="image/*" id={`ep-thumb-s${seasonNum}`} className="file-input" onChange={e => { setNewEpisodeThumbnail(e.target.files[0]); setNewEpisodeThumbnailUrl(""); }} />
                          <label htmlFor={`ep-thumb-s${seasonNum}`} className="file-label">{newEpisodeThumbnail ? `\u2713 ${newEpisodeThumbnail.name}` : "Choose Thumbnail"}</label>
                        </div>
                        <input className="form-input" placeholder="Or Paste URL" value={newEpisodeThumbnailUrl} onChange={e => { setNewEpisodeThumbnailUrl(e.target.value); if (e.target.value) setNewEpisodeThumbnail(null); }} />
                      </div>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleAddEpisode(seasonNum)} disabled={addingEpisode}>
                        {addingEpisode ? "Adding..." : <><Plus size={14} /> Add Episode</>}
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewEpisodeVideo(null); setNewEpisodeVideoUrl(""); setNewEpisodeThumbnail(null); setNewEpisodeThumbnailUrl(""); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!collapsedSeasons[seasonNum] && (
                  <div className="season-content">
                    <div className="ep-list">
                      {groupedEpisodes[seasonNum]
                        .sort((a, b) => a.episodeNumber - b.episodeNumber)
                        .map(ep => (
                          <div key={ep._id} className="ep-card">
                            <div className="ep-num">E{ep.episodeNumber}</div>
                            <div className="ep-thumb-container">
                              {ep.thumbnail ? (
                                <img src={getFullUrl(ep.thumbnail)} alt="" className="ep-thumb" />
                              ) : (
                                <div className="ep-thumb-placeholder"><Film size={18} /></div>
                              )}
                              {ep.videoUrl && (
                                <button className="ep-play-overlay" onClick={() => openEpisodePlayer(ep)}>
                                  <Play size={20} fill="currentColor" />
                                </button>
                              )}
                            </div>
                            <div className="ep-info">
                              <div className="ep-title-row">
                                <span className="ep-title">{ep.title}</span>
                              </div>
                              {ep.description && (
                                <p className="ep-desc">{ep.description}</p>
                              )}
                              <div className="ep-meta">
                                <span className={`badge ${ep.videoUrl ? "badge-pub" : "badge-draft"}`}>
                                  {ep.videoUrl ? "Ready to Stream" : "No Video Uploaded"}
                                </span>
                              </div>
                            </div>
                            <div className="ep-timing">
                              <span className="ep-duration">{ep.duration || "--"}</span>
                            </div>
                            <div className="ep-actions">
                              <button className="icon-btn view" onClick={() => openEpisodePlayer(ep)} title="View Details">
                                <Eye size={18} />
                              </button>
                              <button className="icon-btn edit" onClick={() => openEpisodeEdit(ep)} title="Edit Episode">
                                <Edit2 size={18} />
                              </button>
                              <button className="icon-btn del" onClick={() => handleEpisodeDelete(ep)} title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}
      {(modalMode === "edit" || modalMode === "upload" || modalMode === "episode-view" || modalMode === "episode-edit") && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-box ${modalMode === "episode-view" ? "modal-box-view" : "modal-box-form"}`}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="modal-head">
              <h3>
                {modalMode === "view" ? "Content Details" :
                  modalMode === "edit" ? "Edit Content & Media" :
                    modalMode === "episode-edit" ? "Edit Episode & Video" :
                      "Episode Details"}
              </h3>
              <button className="modal-close" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="modal-body">

              {/* ---- EPISODE VIEW / PLAY ---- */}
              {modalMode === "episode-view" && (
                <div className="view-content">
                  <div className="view-banner">
                    <img src={getFullUrl(selectedEpisode?.thumbnail || selectedSeries?.poster || selectedSeries?.banner)} alt="Banner" className="banner-image" />
                    <div className="banner-overlay">
                      <h2>S{selectedEpisode?.seasonNumber} E{selectedEpisode?.episodeNumber}: {selectedEpisode?.title}</h2>
                    </div>
                  </div>

                  {selectedEpisode?.videoUrl ? (
                    <div className="view-video-section">
                      {getYouTubeId(selectedEpisode.videoUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(selectedEpisode.videoUrl)}`}
                          title="Episode Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="view-video-player"
                          style={{ aspectRatio: "16/9", height: "auto" }}
                        ></iframe>
                      ) : (
                        <>
                          <video ref={videoRef} controls className="view-video-player" src={getFullUrl(selectedEpisode.videoUrl)}>
                            Your browser does not support the video tag.
                          </video>
                          <button className="btn btn-primary pip-btn" onClick={() => videoRef.current?.requestPictureInPicture?.()}>
                            <Tv size={18} style={{ marginRight: 6 }} /> PiP
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "20px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-muted)" }}>
                      <Video size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>No video uploaded yet</p>
                      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setSelectedItem(selectedEpisode); setModalMode("episode-edit"); }}>
                        <Upload size={14} style={{ marginRight: 6 }} /> Upload Video
                      </button>
                    </div>
                  )}

                  <div className="view-details">
                    <div className="detail-item"><strong>Series</strong><span>{selectedSeries?.title}</span></div>
                    <div className="detail-item"><strong>Season</strong><span>{selectedEpisode?.seasonNumber}</span></div>
                    <div className="detail-item"><strong>Episode</strong><span>{selectedEpisode?.episodeNumber}</span></div>
                    <div className="detail-item"><strong>Duration</strong><span>{selectedEpisode?.duration || "\u2014"}</span></div>
                    {selectedEpisode?.description && (
                      <div className="detail-full"><strong>Description</strong><p>{selectedEpisode.description}</p></div>
                    )}
                  </div>
                </div>
              )}




              {/* ---- EPISODE EDIT ---- */}
              {modalMode === "episode-edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Episode #</label>
                      <input className="form-input" type="number" value={editData.episodeNumber || ""} onChange={e => setEditData(s => ({ ...s, episodeNumber: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Season #</label>
                      <input className="form-input" type="number" value={editData.seasonNumber || ""} onChange={e => setEditData(s => ({ ...s, seasonNumber: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
                  <h4 style={{ marginBottom: 12, fontSize: "0.9rem" }}>Media Assets</h4>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Thumbnail</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="ep-edit-thumb" className="file-input" onChange={e => handleUploadChange("thumbnail", e.target.files[0])} />
                        <label htmlFor="ep-edit-thumb" className="file-label">{uploadData.thumbnail ? `\u2713 ${uploadData.thumbnail.name}` : "Change Thumbnail"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.thumbnailUrl} onChange={e => handleUploadChange("thumbnailUrl", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Video</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="video/*" id="ep-edit-video" className="file-input" onChange={e => handleUploadChange("video", e.target.files[0])} />
                        <label htmlFor="ep-edit-video" className="file-label">{uploadData.video ? `\u2713 ${uploadData.video.name}` : "Change Video"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.videoUrl} onChange={e => handleUploadChange("videoUrl", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ---- EDIT (Movie / Series) ---- */}
              {modalMode === "edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Title</label>
                      <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Release Year</label>
                      <input className="form-input" type="number" value={editData.releaseYear || ""} onChange={e => setEditData(s => ({ ...s, releaseYear: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Rating (0ΓÇô10)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={editData.rating || ""}
                        onChange={e => {
                          let val = e.target.value;
                          if (val !== "") {
                            const num = Number(val);
                            if (num > 10) val = "10";
                            else if (num < 0) val = "0";
                          }
                          setEditData(s => ({ ...s, rating: val === "" ? "" : Number(val) }));
                        }}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Genre (comma separated)</label>
                      <input className="form-input" value={Array.isArray(editData.genre) ? editData.genre.join(", ") : (editData.genre || "")} onChange={e => setEditData(s => ({ ...s, genre: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Duration</label>
                      <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Language</label>
                      <input className="form-input" value={editData.language || ""} onChange={e => setEditData(s => ({ ...s, language: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Premium</label>
                      <select className="form-input" value={editData.isPremium ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isPremium: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Coming Soon</label>
                      <select className="form-input" value={editData.isComingSoon ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isComingSoon: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Popular</label>
                      <select className="form-input" value={editData.isPopular ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isPopular: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                     </div>
                     <div className="form-row">
                       <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                         🔞 18+ Content
                       </label>
                       <select
                         className="form-input"
                         value={editData.is18plus ? "yes" : "no"}
                         onChange={e => {
                           const val = e.target.value === "yes";
                           setEditData(s => ({ ...s, is18plus: val, isHide: val ? s.isHide : false }));
                         }}
                       >
                         <option value="no">No</option>
                         <option value="yes">Yes — 18+ Adult</option>
                       </select>
                     </div>
                     <div className="form-row">
                       <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, opacity: editData.is18plus ? 1 : 0.45 }}>
                         🙈 Hide from non-adult users
                         {!editData.is18plus && <span style={{ fontSize: "0.7rem", color: "#f87171", marginLeft: 4 }}>(requires 18+)</span>}
                       </label>
                       <select
                         className="form-input"
                         disabled={!editData.is18plus}
                         value={editData.is18plus && editData.isHide ? "yes" : "no"}
                         onChange={e => setEditData(s => ({ ...s, isHide: e.target.value === "yes" }))}
                         style={{ opacity: editData.is18plus ? 1 : 0.45, cursor: editData.is18plus ? "pointer" : "not-allowed" }}
                       >
                         <option value="no">No — Show to everyone</option>
                         <option value="yes">Yes — Hide from non-adult users</option>
                       </select>
                     </div>
                     <div className="form-row form-full" style={{ gridColumn: "span 2", marginTop: 10, marginBottom: 10 }}>
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <Layers size={14} /> Selected Categories (Select Multiple)
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {categories.map((c) => {
                          const val = c.name.toLowerCase();
                          const isSelected = Array.isArray(editData.category)
                            ? editData.category.includes(val)
                            : editData.category === val;

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
                                let currentCats = Array.isArray(editData.category) ? [...editData.category] : (editData.category ? [editData.category] : []);
                                if (currentCats.includes(val)) {
                                  currentCats = currentCats.filter(item => item !== val);
                                } else {
                                  currentCats.push(val);
                                }
                                setEditData(s => ({ ...s, category: currentCats }));
                              }}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                        {categories.length === 0 && (
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            No categories found. Configure them in the Categories page.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Priority (0 = Auto-assign, 1 = top priority)</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="0 = Automatic"
                        value={editData.priority !== undefined ? editData.priority : ""}
                        onChange={e => setEditData(s => ({ ...s, priority: e.target.value === "" ? "" : Number(e.target.value) }))}
                      />
                    </div>
                    {editData.isComingSoon && (
                      <div className="form-row">
                        <label className="form-label">Release Date</label>
                        <input
                          className="form-input"
                          type="date"
                          value={
                            editData.releaseDate && !isNaN(Date.parse(editData.releaseDate))
                              ? new Date(editData.releaseDate).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={e => setEditData(s => ({ ...s, releaseDate: e.target.value }))}
                        />
                      </div>
                    )}

                  </div>

                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>

                  {/* Cast Section */}
                  <div className="cast-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        <User size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Cast Members
                      </label>
                      <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "0.8rem" }} onClick={addCastMember}>
                        <Plus size={14} /> Add Member
                      </button>
                    </div>

                    {(editData.cast || []).length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No cast members. Click "Add Member" to add.</p>
                    )}

                    <div className="cast-list">
                      {(editData.cast || []).map((c, idx) => (
                        <div key={idx} className="cast-edit-row">
                          {/* Cast image */}
                          <div className="cast-img-upload">
                            {(c._previewUrl || c.image) ? (
                              <img src={c._previewUrl || getFullUrl(c.image)} alt={c.name} className="cast-img-preview" />
                            ) : (
                              <div className="cast-img-placeholder">
                                <User size={36} />
                              </div>
                            )}
                            <div className="file-input-wrapper">
                              <input
                                type="file"
                                accept="image/*"
                                id={`cast-img-${idx}`}
                                className="file-input"
                                onChange={e => setCastImageFile(idx, e.target.files[0])}
                              />
                              <label htmlFor={`cast-img-${idx}`} className="file-label cast-file-label">
                                {castFiles[idx] ? "\u2713 Changed" : c.image ? "Change Photo" : "Upload Photo"}
                              </label>
                            </div>
                          </div>
                          {/* Cast details container */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                            {/* Cast name */}
                            <input
                              className="form-input"
                              placeholder="Cast member name"
                              value={c.name || ""}
                              onChange={e => updateCastMember(idx, "name", e.target.value)}
                              style={{ width: "100%" }}
                            />
                            {/* Cast photo URL option */}
                            {!castFiles[idx] && (
                              <input
                                className="form-input"
                                placeholder="Or Photo URL"
                                value={c.image || ""}
                                onChange={e => updateCastMember(idx, "image", e.target.value)}
                                style={{ width: "100%", fontSize: "0.8rem", height: "30px", padding: "4px 10px" }}
                              />
                            )}
                          </div>
                          <button className="icon-btn del" title="Remove" onClick={() => removeCastMember(idx)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
                  <h4 style={{ marginBottom: 12, fontSize: "0.9rem" }}>Media Assets</h4>
                  {isLocked(selectedItem) && (
                    <p style={{ color: "var(--orange)", fontSize: "0.75rem", marginBottom: 12 }}>
                      \u26A0\uFE0F Video upload is locked until release. Trailer and images are allowed.
                    </p>
                  )}
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Poster</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="edit-poster" className="file-input" onChange={e => handleUploadChange("poster", e.target.files[0])} />
                        <label htmlFor="edit-poster" className="file-label">{uploadData.poster ? `\u2713 ${uploadData.poster.name}` : "Change Poster"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.posterUrl} onChange={e => handleUploadChange("posterUrl", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Banner</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="edit-banner" className="file-input" onChange={e => handleUploadChange("banner", e.target.files[0])} />
                        <label htmlFor="edit-banner" className="file-label">{uploadData.banner ? `\u2713 ${uploadData.banner.name}` : "Change Banner"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.bannerUrl} onChange={e => handleUploadChange("bannerUrl", e.target.value)} />
                    </div>
                    {contentType !== "microdramas" && (
                      <div className="form-row">
                        <label className="form-label">Trailer</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id="edit-trailer" className="file-input" onChange={e => handleUploadChange("trailer", e.target.files[0])} />
                          <label htmlFor="edit-trailer" className="file-label">{uploadData.trailer ? `✓ ${uploadData.trailer.name}` : "Change Trailer"}</label>
                        </div>
                        <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.trailerUrl} onChange={e => handleUploadChange("trailerUrl", e.target.value)} />
                      </div>
                    )}
                    {contentType === "movies" && (
                      <div className="form-row">
                        <label className="form-label" style={{ opacity: isLocked(selectedItem) ? 0.5 : 1 }}>Full {contentType === "movies" ? "Movie" : "Film"} Video</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id="edit-video" className="file-input" disabled={isLocked(selectedItem)} onChange={e => handleUploadChange("video", e.target.files[0])} />
                          <label htmlFor="edit-video" className={`file-label ${isLocked(selectedItem) ? "file-label-locked" : ""}`}>
                            {isLocked(selectedItem) ? "≡ƒöÆ Locked" : uploadData.video ? `\u2713 ${uploadData.video.name}` : "Change Video"}
                          </label>
                        </div>
                        <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" disabled={isLocked(selectedItem)} value={uploadData.videoUrl} onChange={e => handleUploadChange("videoUrl", e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              )}



              {uploadPhase && (
                <div
                  className="upload-progress-card"
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    background: "rgba(30, 30, 40, 0.7)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "20px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        className="spinner"
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(230, 57, 70, 0.2)",
                          borderTopColor: "var(--primary)",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                        {uploadPhase === "saving" ? "Uploading & Saving Changes..." : "Finalizing Updates..."}
                      </span>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary)" }}>
                      {uploadProgress}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #e30914 0%, #ff4d5a 100%)",
                        borderRadius: "999px",
                        transition: "width 0.3s ease-out",
                        boxShadow: "0 0 10px rgba(227, 9, 20, 0.5)",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", color: "#8a8b98" }}>
                    Please keep this window open while changes are being stored.
                  </span>
                </div>
              )}

            </div>

            {/* Modal Footer Buttons */}
            <div className="modal-footer">
              {modalMode === "edit" && (
                <button className="btn btn-primary" onClick={handleSave} disabled={!!uploadPhase}>
                  {uploadPhase ? "Saving..." : "Save Changes"}
                </button>
              )}
              {modalMode === "episode-edit" && (
                <button className="btn btn-primary" onClick={handleEpisodeSave} disabled={!!uploadPhase}>
                  {uploadPhase ? "Saving..." : "Save Episode"}
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeModal} disabled={!!uploadPhase}>
                {(modalMode === "view" || modalMode === "episode-view") ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RIGHT SLIDE-OVER DRAWER FOR VIEW DETAILS ========== */}
      <AnimatePresence>
        {modalMode === "view" && selectedItem && (
          <div className="side-drawer-overlay" onClick={closeModal}>
            <motion.div
              className="side-drawer-panel"
              onClick={(e) => e.stopPropagation()}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              {/* Drawer Header */}
              <div className="side-drawer-head">
                <div className="side-drawer-title-wrap">
                  <div className="side-drawer-icon-badge">
                    <Eye size={18} />
                  </div>
                  <h3 className="side-drawer-title">Content Details</h3>
                </div>
                <button className="side-drawer-close" onClick={closeModal} title="Close Panel">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="side-drawer-body">
                {/* Hero Banner */}
                <div className="side-drawer-hero">
                  <img
                    src={getFullUrl(selectedItem.banner || selectedItem.poster)}
                    alt=""
                    className="side-drawer-hero-img"
                  />
                  <div className="side-drawer-hero-overlay" />
                </div>

                {/* Overlapping Poster & Info */}
                <div className="side-drawer-meta-header">
                  <img
                    src={getFullUrl(selectedItem.poster)}
                    alt=""
                    className="side-drawer-poster"
                  />
                  <div className="side-drawer-info">
                    <div className="side-drawer-badges-row">
                      <span className="side-drawer-type-badge">
                        {contentType === "movies" ? "MOVIE" :
                          contentType === "microdramas" ? "MICRODRAMA" :
                            contentType === "series" ? "SERIES" : "CONTENT"}
                      </span>
                      {selectedItem.isPremium && <span className="vp-pill vp-pill-gold">★ Premium</span>}
                      {selectedItem.isPopular && <span className="vp-pill vp-pill-popular"><Flame size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />Popular</span>}
                      {selectedItem.is18plus ? (
                        <span className="vp-pill vp-pill-adult">🔞 18+ Adult</span>
                      ) : (
                        <span className="vp-pill vp-pill-family">✓ Family</span>
                      )}
                    </div>
                    <h2 className="side-drawer-item-title">{selectedItem.title}</h2>
                    <div className="side-drawer-quick-meta">
                      <span><Calendar size={13} /> {selectedItem.releaseYear || "N/A"}</span>
                      <span className="vp-dot">•</span>
                      <span>⭐ {selectedItem.rating || "0"}/10</span>
                      <span className="vp-dot">•</span>
                      <span>{selectedItem.duration || "N/A"}</span>
                      <span className="vp-dot">•</span>
                      <span>{selectedItem.language || "English"}</span>
                    </div>
                  </div>
                </div>

                {/* Scheduled Release Alert */}
                {isLocked(selectedItem) && (
                  <div className="vp-alert">
                    <Calendar size={18} />
                    <div>
                      <strong>Scheduled Release</strong>
                      <p>Available from {new Date(selectedItem.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  </div>
                )}

                {/* Storyline */}
                {selectedItem.description && (
                  <div className="side-drawer-section">
                    <div className="side-drawer-section-title"><Activity size={14} /> Storyline</div>
                    <p className="side-drawer-text">{selectedItem.description}</p>
                  </div>
                )}

                {/* Categories & Genres */}
                <div className="side-drawer-section">
                  <div className="side-drawer-section-title"><Layers size={14} /> Categories & Genres</div>
                  <div className="side-drawer-tags-wrap">
                    {(Array.isArray(selectedItem.genre) ? selectedItem.genre : [selectedItem.genre]).filter(Boolean).map((g, i) => (
                      <span key={`g-${i}`} className="side-drawer-tag">{g}</span>
                    ))}
                    {(Array.isArray(selectedItem.category) ? selectedItem.category : [selectedItem.category]).filter(Boolean).map((c, i) => (
                      <span key={`c-${i}`} className="side-drawer-tag">{c}</span>
                    ))}
                  </div>
                </div>



                {/* Content Specifications Grid */}
                <div className="side-drawer-section">
                  <div className="side-drawer-section-title"><Info size={14} /> Content Specifications</div>
                  <div className="side-drawer-specs-grid">
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Release Year</span>
                      <span className="side-drawer-spec-value">{selectedItem.releaseYear || "N/A"}</span>
                    </div>
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Duration</span>
                      <span className="side-drawer-spec-value">{selectedItem.duration || "N/A"}</span>
                    </div>
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Rating</span>
                      <span className="side-drawer-spec-value">{selectedItem.rating || 0} ⭐</span>
                    </div>
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Priority Score</span>
                      <span className="side-drawer-spec-value">{selectedItem.priority || 0}</span>
                    </div>
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Access Tier</span>
                      <span className="side-drawer-spec-value">{selectedItem.isPremium ? "★ Premium" : "Free"}</span>
                    </div>
                    <div className="side-drawer-spec-card">
                      <span className="side-drawer-spec-label">Language</span>
                      <span className="side-drawer-spec-value">{selectedItem.language || "English"}</span>
                    </div>
                    {selectedItem.releaseDate && (
                      <div className="side-drawer-spec-card">
                        <span className="side-drawer-spec-label">Release Date</span>
                        <span className="side-drawer-spec-value">{new Date(selectedItem.releaseDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cast & Crew */}
                {selectedItem.cast?.length > 0 && (
                  <div className="side-drawer-section">
                    <div className="side-drawer-section-title"><User size={14} /> Cast & Crew</div>
                    <div className="cast-grid">
                      {selectedItem.cast.map((c, i) => (
                        <div key={i} className="cast-card">
                          <img src={getFullUrl(c.image || c.photo)} alt="" className="cast-img" />
                          <div className="cast-name">{c.name}</div>
                          <div className="cast-role">{c.role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="side-drawer-foot">
                <button
                  className="btn btn-primary"
                  onClick={() => { setEditData({ ...selectedItem, cast: selectedItem.cast ? [...selectedItem.cast.map(c => ({ ...c }))] : [] }); setModalMode("edit"); }}
                  style={{ gap: 8 }}
                >
                  <Edit2 size={15} /> Edit Content
                </button>
                <button className="btn btn-ghost" onClick={closeModal}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========== CUSTOM POPUP DIALOG MODAL ========== */}
      <AnimatePresence>
        {popupDialog.isOpen && (
          <div
            className="custom-popup-overlay"
            onClick={() => popupDialog.onCancel ? popupDialog.onCancel() : popupDialog.onConfirm()}
          >
            <motion.div
              className="custom-popup-box"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className={`custom-popup-icon-wrap ${popupDialog.type}`}>
                {popupDialog.type === "danger" && <XCircle size={28} />}
                {popupDialog.type === "warning" && <AlertTriangle size={28} />}
                {popupDialog.type === "success" && <CheckCircle2 size={28} />}
                {popupDialog.type === "info" && <Info size={28} />}
              </div>
              <h3 className="custom-popup-title">{popupDialog.title}</h3>
              <p className="custom-popup-message">{popupDialog.message}</p>
              <div className="custom-popup-actions">
                {popupDialog.cancelText && (
                  <button
                    className="custom-popup-btn cancel"
                    onClick={() => popupDialog.onCancel && popupDialog.onCancel()}
                  >
                    {popupDialog.cancelText}
                  </button>
                )}
                <button
                  className={`custom-popup-btn ${popupDialog.type === "danger" ? "confirm-danger" : "confirm-primary"}`}
                  onClick={() => popupDialog.onConfirm && popupDialog.onConfirm()}
                >
                  {popupDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
