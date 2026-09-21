import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";
import { useToast } from "../App";

import "./Dashboard.css";
import "./AudioStories.css";

import {
  Headphones,
  Plus,
  Trash2,
  Pencil,
  Search,
  X,
  RefreshCw,
  Loader,
  CheckCircle2,
  Eye,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Upload,
  Music,
  Mic,
  Image as ImageIcon,
  Calendar,
  User,
  Play,
  Pause,
  Check,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  FileText,
  Copy,
  CheckCheck,
  ListMusic,
} from "lucide-react";

export default function AudioStories() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data states
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "published" | "draft" | "premium" | "comingSoon"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const genreDropdownRef = useRef(null);

  // Multi-selection state
  const [selectedStoryIds, setSelectedStoryIds] = useState(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected Story & Episodes state
  const [selectedStory, setSelectedStory] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Story Profile Details View Modal
  const [viewingStory, setViewingStory] = useState(null);
  const [copiedLabel, setCopiedLabel] = useState("");

  // Docked Audio Player state
  const [activePlayingEp, setActivePlayingEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(new Audio());

  // Edit Story Modal State
  const [editingStory, setEditingStory] = useState(null);
  const [storyForm, setStoryForm] = useState({
    title: "",
    description: "",
    author: "",
    narrator: "",
    priority: 0,
    isPremium: false,
    isPublished: true,
    isComingSoon: false,
    scheduleDate: "",
    categories: [],
  });
  const [storyCoverFile, setStoryCoverFile] = useState(null);
  const [storyBannerFile, setStoryBannerFile] = useState(null);
  const [storyCoverPreview, setStoryCoverPreview] = useState("");
  const [storyBannerPreview, setStoryBannerPreview] = useState("");
  const [storySaving, setStorySaving] = useState(false);
  const [storyUploadProgress, setStoryUploadProgress] = useState(0);

  // Episode Modal State (Add or Edit)
  const [episodeModalMode, setEpisodeModalMode] = useState(null); // "create" | "edit" | null
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [episodeForm, setEpisodeForm] = useState({
    title: "",
    episodeNumber: 1,
    duration: "",
    description: "",
  });
  const [episodeAudioFile, setEpisodeAudioFile] = useState(null);
  const [episodeThumbFile, setEpisodeThumbFile] = useState(null);
  const [episodeAudioUrl, setEpisodeAudioUrl] = useState("");
  const [episodeThumbPreview, setEpisodeThumbPreview] = useState("");
  const [episodeSaving, setEpisodeSaving] = useState(false);
  const [episodeUploadProgress, setEpisodeUploadProgress] = useState(0);

  // Custom Confirmation & Alert Dialog
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger", // "danger" | "warning" | "info"
    confirmText: "Confirm",
    cancelText: "Cancel",
    showCancel: true,
    onConfirm: null,
  });

  const showConfirm = ({
    title,
    message,
    type = "danger",
    confirmText = "Delete",
    cancelText = "Cancel",
    onConfirm,
  }) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancel: true,
      onConfirm,
    });
  };

  /* ===================== FETCH DATA ===================== */
  const fetchStories = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/audio-stories");
      const list = res.data?.stories || (Array.isArray(res.data) ? res.data : []);
      setStories(list);

      if (selectedStory) {
        const fresh = list.find((s) => s._id === selectedStory._id);
        if (fresh) setSelectedStory(fresh);
      }
    } catch (err) {
      console.error("Error fetching audio stories:", err);
      showToast(err.response?.data?.message || "Failed to load audio stories", "error");
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchEpisodes = async (storyId) => {
    setLoadingEpisodes(true);
    try {
      const res = await API.get(`/admin/audio-episodes?storyId=${storyId}`);
      const eps = res.data?.episodes || [];
      eps.sort((a, b) => (Number(a.episodeNumber) || 0) - (Number(b.episodeNumber) || 0));
      setEpisodes(eps);

      setSelectedStory((prev) => (prev ? { ...prev, totalEpisodes: eps.length } : prev));
      setStories((prev) =>
        prev.map((s) => (s._id === storyId ? { ...s, totalEpisodes: eps.length } : s))
      );
    } catch (err) {
      console.error("Error fetching episodes:", err);
      setEpisodes([]);
      showToast("Could not load episodes for this story", "error");
    } finally {
      setLoadingEpisodes(false);
    }
  };

  useEffect(() => {
    fetchStories();
    fetchCategories();

    // Audio instance setup
    const audio = audioRef.current;
    const handleTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };
    const handleError = () => {
      setIsPlaying(false);
      showToast("Audio stream unavailable or failed to load", "error");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const handleClickOutside = (e) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target)) {
        setIsGenreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleAudio = (ep) => {
    if (!ep.audioUrl) {
      showToast("No audio file available for this episode", "error");
      return;
    }

    const audio = audioRef.current;
    if (activePlayingEp?._id === ep._id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      audio.pause();
      audio.src = ep.audioUrl;
      setActivePlayingEp(ep);
      audio.play().then(() => setIsPlaying(true)).catch((e) => {
        console.error("Play error:", e);
        setIsPlaying(false);
        showToast("Cannot play this audio track", "error");
      });
    }
  };

  const handleSeekAudio = (e) => {
    const time = Number(e.target.value);
    setAudioCurrentTime(time);
    audioRef.current.currentTime = time;
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    audioRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleClosePlayer = () => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setActivePlayingEp(null);
    setIsPlaying(false);
    setAudioCurrentTime(0);
  };

  /* ===================== KPI METRICS ===================== */
  const totalStoriesCount = stories.length;
  const publishedCount = useMemo(
    () => stories.filter((s) => s.isPublished !== false).length,
    [stories]
  );
  const premiumCount = useMemo(
    () => stories.filter((s) => s.isPremium).length,
    [stories]
  );
  const totalEpisodesCount = useMemo(
    () => stories.reduce((sum, s) => sum + (Number(s.totalEpisodes) || 0), 0),
    [stories]
  );

  /* ===================== FILTER & PAGINATION ===================== */
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // Status filter
      if (statusFilter === "published" && story.isPublished === false) return false;
      if (statusFilter === "draft" && story.isPublished !== false) return false;
      if (statusFilter === "premium" && !story.isPremium) return false;
      if (statusFilter === "comingSoon" && !story.isComingSoon) return false;

      // Category filter
      if (categoryFilter !== "all") {
        const catIds = (story.categories || []).map((c) =>
          typeof c === "object" ? c._id : c
        );
        if (!catIds.includes(categoryFilter)) return false;
      }

      // Search filter
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const titleMatch = story.title?.toLowerCase().includes(query);
      const authorMatch = story.author?.toLowerCase().includes(query);
      const narratorMatch = story.narrator?.toLowerCase().includes(query);
      const descMatch = story.description?.toLowerCase().includes(query);
      return titleMatch || authorMatch || narratorMatch || descMatch;
    });
  }, [stories, searchQuery, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredStories.length / limit) || 1;
  const paginatedStories = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredStories.slice(start, start + limit);
  }, [filteredStories, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  /* ===================== MULTI-SELECTION ===================== */
  const isAllSelected = useMemo(() => {
    if (paginatedStories.length === 0) return false;
    return paginatedStories.every((s) => selectedStoryIds.has(s._id));
  }, [paginatedStories, selectedStoryIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedStoryIds);
    if (isAllSelected) {
      paginatedStories.forEach((s) => next.delete(s._id));
    } else {
      paginatedStories.forEach((s) => next.add(s._id));
    }
    setSelectedStoryIds(next);
  };

  const handleToggleSelectStory = (id, e) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedStoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStoryIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedStoryIds.size === 0) return;
    showConfirm({
      title: "Delete Selected Stories?",
      message: `Permanently delete ${selectedStoryIds.size} audio stories and all their associated episodes? This action cannot be undone.`,
      type: "danger",
      confirmText: `Delete ${selectedStoryIds.size} Stories`,
      onConfirm: async () => {
        try {
          for (const id of selectedStoryIds) {
            await API.delete(`/admin/audio-stories/${id}`);
          }
          showToast(`Successfully deleted ${selectedStoryIds.size} stories`, "success");
          setSelectedStoryIds(new Set());
          if (selectedStory && selectedStoryIds.has(selectedStory._id)) {
            setSelectedStory(null);
            setEpisodes([]);
          }
          fetchStories();
        } catch (err) {
          console.error("Bulk delete error:", err);
          showToast("Error occurred during bulk deletion", "error");
        }
      },
    });
  };

  /* ===================== EXPORT TO EXCEL & PDF ===================== */
  const getExportData = () => {
    const target =
      selectedStoryIds.size > 0
        ? stories.filter((s) => selectedStoryIds.has(s._id))
        : filteredStories;

    return target.map((s, i) => ({
      "#": i + 1,
      Title: s.title || "Untitled",
      Author: s.author || "—",
      Narrator: s.narrator || "—",
      Episodes: s.totalEpisodes || 0,
      Priority: s.priority || 0,
      Access: s.isPremium ? "Premium" : "Free",
      Status: s.isPublished ? "Published" : "Draft",
      "Coming Soon": s.isComingSoon ? "Yes" : "No",
      "Created Date": s.createdAt
        ? new Date(s.createdAt).toLocaleDateString("en-IN")
        : "—",
    }));
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast("No stories to export", "info");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audio Stories");
    XLSX.writeFile(wb, `GoliDoli_Audio_Stories_${Date.now()}.xlsx`);
    showToast("Excel spreadsheet downloaded", "success");
  };

  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) {
      showToast("No stories to export", "info");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("GoliDoli OTT — Audio Stories Catalog", 14, 15);
    const head = [["#", "Title", "Author", "Narrator", "Episodes", "Priority", "Access", "Status", "Date"]];
    const body = data.map((d) => [
      d["#"],
      d.Title,
      d.Author,
      d.Narrator,
      d.Episodes,
      d.Priority,
      d.Access,
      d.Status,
      d["Created Date"],
    ]);
    autoTable(doc, { head, body, startY: 20 });
    doc.save(`GoliDoli_Audio_Stories_${Date.now()}.pdf`);
    showToast("PDF report downloaded", "success");
  };

  /* ===================== STORY ROW CLICK ===================== */
  const handleStorySelect = (story) => {
    if (selectedStory?._id === story._id) {
      setSelectedStory(null);
      setEpisodes([]);
    } else {
      setSelectedStory(story);
      fetchEpisodes(story._id);
    }
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(""), 2000);
  };

  /* ===================== EDIT STORY MODAL ===================== */
  const openEditStory = (story, e) => {
    if (e) e.stopPropagation();
    setEditingStory(story);

    const catIds = (story.categories || []).map((c) =>
      typeof c === "object" ? c._id : c
    );

    setStoryForm({
      title: story.title || "",
      description: story.description || "",
      author: story.author || "",
      narrator: story.narrator || "",
      priority: story.priority ?? 0,
      isPremium: !!story.isPremium,
      isPublished: story.isPublished !== false,
      isComingSoon: !!story.isComingSoon,
      scheduleDate: story.scheduleDate
        ? new Date(story.scheduleDate).toISOString().slice(0, 16)
        : "",
      categories: catIds,
    });

    setStoryCoverFile(null);
    setStoryBannerFile(null);
    setStoryCoverPreview(story.coverImage || "");
    setStoryBannerPreview(story.bannerImage || "");
    setStoryUploadProgress(0);
  };

  const closeEditStoryModal = () => {
    setEditingStory(null);
    setStoryCoverFile(null);
    setStoryBannerFile(null);
    setStoryCoverPreview("");
    setStoryBannerPreview("");
    setStoryUploadProgress(0);
  };

  const handleSaveStory = async (e) => {
    e.preventDefault();
    if (!editingStory) return;

    setStorySaving(true);
    setStoryUploadProgress(0);

    try {
      let coverImageUrl = storyCoverPreview;
      if (storyCoverFile) {
        coverImageUrl = await uploadToBunny(
          storyCoverFile,
          "audiostories",
          "covers",
          (pct) => setStoryUploadProgress(Math.round(pct * 0.5))
        );
      }

      let bannerImageUrl = storyBannerPreview;
      if (storyBannerFile) {
        bannerImageUrl = await uploadToBunny(
          storyBannerFile,
          "audiostories",
          "banners",
          (pct) => setStoryUploadProgress(50 + Math.round(pct * 0.5))
        );
      }

      const formData = new FormData();
      formData.append("title", storyForm.title);
      formData.append("description", storyForm.description);
      formData.append("author", storyForm.author);
      formData.append("narrator", storyForm.narrator);
      formData.append("priority", Number(storyForm.priority) || 0);
      formData.append("isPremium", String(storyForm.isPremium));
      formData.append("isPublished", String(storyForm.isPublished));
      formData.append("isComingSoon", String(storyForm.isComingSoon));

      if (storyForm.scheduleDate) {
        formData.append("scheduleDate", storyForm.scheduleDate);
      }

      formData.append("parsedCategories", JSON.stringify(storyForm.categories || []));
      formData.append("coverImage", coverImageUrl);
      formData.append("bannerImage", bannerImageUrl);

      const res = await API.patch(`/admin/audio-stories/${editingStory._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        showToast("Audio Story updated successfully", "success");
        closeEditStoryModal();
        fetchStories();
      } else {
        showToast(res.data?.message || "Failed to update story", "error");
      }
    } catch (err) {
      console.error("Error saving story:", err);
      showToast(err.response?.data?.message || "Failed to save audio story", "error");
    } finally {
      setStorySaving(false);
      setStoryUploadProgress(0);
    }
  };

  const handleDeleteStory = (story, e) => {
    if (e) e.stopPropagation();

    showConfirm({
      title: "Delete Audio Story?",
      message: `Permanently delete "${story.title}" and all its audio episodes? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete Story",
      onConfirm: async () => {
        try {
          const res = await API.delete(`/admin/audio-stories/${story._id}`);
          if (res.data?.success !== false) {
            showToast("Audio Story deleted successfully", "success");
            if (selectedStory?._id === story._id) {
              setSelectedStory(null);
              setEpisodes([]);
            }
            if (viewingStory?._id === story._id) {
              setViewingStory(null);
            }
            fetchStories();
          } else {
            showToast(res.data?.message || "Failed to delete story", "error");
          }
        } catch (err) {
          console.error("Error deleting story:", err);
          showToast(err.response?.data?.message || "Failed to delete story", "error");
        }
      },
    });
  };

  /* ===================== EPISODE MODALS (ADD / EDIT) ===================== */
  const openAddEpisodeModal = () => {
    if (!selectedStory) return;
    setEpisodeModalMode("create");
    setEditingEpisode(null);
    setEpisodeForm({
      title: `Episode ${episodes.length + 1}`,
      episodeNumber: episodes.length + 1,
      duration: "",
      description: "",
    });
    setEpisodeAudioFile(null);
    setEpisodeThumbFile(null);
    setEpisodeAudioUrl("");
    setEpisodeThumbPreview("");
    setEpisodeUploadProgress(0);
  };

  const openEditEpisodeModal = (ep) => {
    setEpisodeModalMode("edit");
    setEditingEpisode(ep);
    setEpisodeForm({
      title: ep.title || "",
      episodeNumber: ep.episodeNumber || 1,
      duration: ep.duration ? String(ep.duration) : "",
      description: ep.description || "",
    });
    setEpisodeAudioFile(null);
    setEpisodeThumbFile(null);
    setEpisodeAudioUrl(ep.audioUrl || "");
    setEpisodeThumbPreview(ep.thumbnail || "");
    setEpisodeUploadProgress(0);
  };

  const closeEpisodeModal = () => {
    setEpisodeModalMode(null);
    setEditingEpisode(null);
    setEpisodeAudioFile(null);
    setEpisodeThumbFile(null);
    setEpisodeAudioUrl("");
    setEpisodeThumbPreview("");
    setEpisodeUploadProgress(0);
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEpisodeAudioFile(file);

    try {
      const audioElem = document.createElement("audio");
      audioElem.preload = "metadata";
      audioElem.src = URL.createObjectURL(file);
      audioElem.onloadedmetadata = () => {
        const sec = Math.round(audioElem.duration);
        if (!isNaN(sec) && sec > 0) {
          setEpisodeForm((prev) => ({ ...prev, duration: String(sec) }));
        }
      };
    } catch (err) {
      console.warn("Could not calculate audio duration", err);
    }
  };

  const handleSaveEpisode = async (e) => {
    e.preventDefault();
    if (!selectedStory) return;

    setEpisodeSaving(true);
    setEpisodeUploadProgress(0);

    try {
      let finalAudioUrl = episodeAudioUrl;
      if (episodeAudioFile) {
        finalAudioUrl = await uploadToBunny(
          episodeAudioFile,
          "audiostories",
          "episodes",
          (pct) => setEpisodeUploadProgress(Math.round(pct * 0.8))
        );
      }

      let finalThumbUrl = episodeThumbPreview;
      if (episodeThumbFile) {
        finalThumbUrl = await uploadToBunny(
          episodeThumbFile,
          "audiostories",
          "posters",
          (pct) => setEpisodeUploadProgress(80 + Math.round(pct * 0.2))
        );
      }

      if (!finalAudioUrl && episodeModalMode === "create") {
        showToast("Audio track file is required", "error");
        setEpisodeSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append("storyId", selectedStory._id);
      formData.append("title", episodeForm.title);
      formData.append("episodeNumber", Number(episodeForm.episodeNumber) || 1);
      formData.append("duration", Number(episodeForm.duration) || 0);
      formData.append("description", episodeForm.description || "");
      formData.append("audioUrl", finalAudioUrl);
      formData.append("thumbnail", finalThumbUrl);

      if (episodeModalMode === "create") {
        const res = await API.post("/admin/audio-episodes", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          showToast("Audio Episode added successfully", "success");
          closeEpisodeModal();
          fetchEpisodes(selectedStory._id);
        } else {
          showToast(res.data?.message || "Failed to add episode", "error");
        }
      } else if (episodeModalMode === "edit" && editingEpisode) {
        const res = await API.patch(`/admin/audio-episodes/${editingEpisode._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          showToast("Audio Episode updated successfully", "success");
          closeEpisodeModal();
          fetchEpisodes(selectedStory._id);
        } else {
          showToast(res.data?.message || "Failed to update episode", "error");
        }
      }
    } catch (err) {
      console.error("Error saving episode:", err);
      showToast(err.response?.data?.message || "Failed to save episode", "error");
    } finally {
      setEpisodeSaving(false);
      setEpisodeUploadProgress(0);
    }
  };

  const handleDeleteEpisode = (ep) => {
    showConfirm({
      title: "Delete Episode?",
      message: `Permanently delete Ep ${ep.episodeNumber}: "${ep.title}"?`,
      type: "danger",
      confirmText: "Delete Episode",
      onConfirm: async () => {
        try {
          const res = await API.delete(`/admin/audio-episodes/${ep._id}`);
          if (res.data?.success !== false) {
            showToast("Episode deleted successfully", "success");
            if (activePlayingEp?._id === ep._id) {
              handleClosePlayer();
            }
            fetchEpisodes(selectedStory._id);
          } else {
            showToast(res.data?.message || "Failed to delete episode", "error");
          }
        } catch (err) {
          console.error("Error deleting episode:", err);
          showToast(err.response?.data?.message || "Failed to delete episode", "error");
        }
      },
    });
  };

  const formatDuration = (seconds) => {
    const s = Number(seconds);
    if (!s || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const toggleCategorySelection = (catId) => {
    setStoryForm((prev) => {
      const exists = prev.categories.includes(catId);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((id) => id !== catId)
          : [...prev.categories, catId],
      };
    });
  };

  return (
    <div className="page-section">
      {/* ── Page Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Headphones className="pg-title-icon" size={20} />
            Audio Stories Library
          </h1>
          <p className="pg-sub">
            Manage podcast serials, audio narrations, episode releases, and subscriptions
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={fetchStories}
            disabled={loading}
            title="Refresh Audio Stories List"
            style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/dashboard/add-audio-story")}
            style={{ padding: "6px 14px", fontSize: "0.78rem", height: "auto" }}
          >
            <Plus size={15} /> Add Audio Story
          </button>
        </div>
      </div>

      {/* ── Symmetrical 4-Card Executive KPI Grid ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Stories</span>
            <div className="kpi-icon-badge icon-amber">
              <Headphones size={15} />
            </div>
          </div>
          <div className="kpi-value">{totalStoriesCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Audio titles in catalog
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Published Live</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {publishedCount.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Live for listeners ({totalStoriesCount > 0 ? Math.round((publishedCount / totalStoriesCount) * 100) : 0}%)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Premium Content</span>
            <div className="kpi-icon-badge icon-indigo">
              <Sparkles size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#6366F1" }}>
            {premiumCount.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#6366F1" }}>
            Exclusive subscriber tier
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Episodes</span>
            <div className="kpi-icon-badge icon-pink">
              <Mic size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#FF0F8A" }}>
            {totalEpisodesCount.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#FF0F8A" }}>
            Audio episodes online
          </div>
        </div>
      </div>

      {/* ── Main Content Box & Table ── */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search stories by title, author, or narrator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.84rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segmented Switch Filter */}
            <div className="segmented-switch">
              {[
                { value: "all", label: "All Stories" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" },
                { value: "premium", label: "Premium" },
                { value: "comingSoon", label: "Coming Soon" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${statusFilter === opt.value ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                >
                  {statusFilter === opt.value && (
                    <motion.div
                      layoutId="activeAudioFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Category Custom Dropdown Filter */}
            {categories.length > 0 && (
              <div className="custom-genre-dropdown-wrap" ref={genreDropdownRef}>
                <button
                  type="button"
                  className={`custom-genre-btn ${isGenreOpen ? "open" : ""}`}
                  onClick={() => setIsGenreOpen((prev) => !prev)}
                  title="Filter by Genre / Category"
                >
                  <SlidersHorizontal size={13} style={{ color: categoryFilter !== "all" ? "var(--primary)" : "var(--text-muted)" }} />
                  <span>
                    {categoryFilter === "all"
                      ? "All Genres"
                      : (categories.find((c) => c._id === categoryFilter)?.name || "Genre")}
                  </span>
                  <ChevronDown size={13} className={`genre-chevron ${isGenreOpen ? "rotate" : ""}`} />
                </button>

                {isGenreOpen && (
                  <div className="custom-genre-menu">
                    <div
                      className={`custom-genre-item ${categoryFilter === "all" ? "active" : ""}`}
                      onClick={() => {
                        setCategoryFilter("all");
                        setIsGenreOpen(false);
                      }}
                    >
                      <span>All Genres</span>
                      {categoryFilter === "all" && <Check size={13} className="genre-check" />}
                    </div>
                    {categories.map((c) => (
                      <div
                        key={c._id}
                        className={`custom-genre-item ${categoryFilter === c._id ? "active" : ""}`}
                        onClick={() => {
                          setCategoryFilter(c._id);
                          setIsGenreOpen(false);
                        }}
                      >
                        <span>{c.name}</span>
                        {categoryFilter === c._id && <Check size={13} className="genre-check" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export & Bulk Actions Group */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {selectedStoryIds.size > 0 && (
              <>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 4, fontWeight: 500 }}>
                  <strong style={{ color: "var(--primary)" }}>{selectedStoryIds.size}</strong> selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-ghost"
                  style={{ fontSize: "0.78rem", padding: "5px 10px", height: "auto", color: "#f43f5e", borderColor: "rgba(244, 63, 94, 0.3)" }}
                  title="Delete selected stories"
                >
                  <Trash2 size={13} /> Delete Selected
                </button>
              </>
            )}
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedStoryIds.size > 0 ? "Export selected stories to Excel" : "Export current list to Excel"}
            >
              <FileSpreadsheet size={14} style={{ color: "#10b981" }} />
              {selectedStoryIds.size > 0 ? "Export Selected" : "Export Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedStoryIds.size > 0 ? "Export selected stories to PDF" : "Export current list to PDF"}
            >
              <FileText size={14} style={{ color: "#FF0F8A" }} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Stories Table */}
        {loading ? (
          <div className="empty-state" style={{ padding: "36px 0" }}>
            <Loader size={22} className="spin-icon" style={{ color: "var(--primary)", margin: "0 auto 8px auto" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading audio stories library...</p>
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "38px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: "pointer", accentColor: "var(--primary)", width: 14, height: 14 }}
                        />
                      </div>
                    </th>
                    <th style={{ width: "38px", textAlign: "center", verticalAlign: "middle" }}>#</th>
                    <th>Story</th>
                    <th>Author / Voice</th>
                    <th>Episodes</th>
                    <th>Priority</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStories.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state" style={{ padding: "40px 0" }}>
                          <Headphones size={30} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 8 }} />
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            No audio stories found matching your filter criteria
                          </p>
                          {(searchQuery || statusFilter !== "all" || categoryFilter !== "all") && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                                setCategoryFilter("all");
                              }}
                              style={{ marginTop: 10, fontSize: "0.76rem", padding: "4px 12px" }}
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStories.map((item, index) => {
                      const itemIndex = (page - 1) * limit + index + 1;
                      const isSelected = selectedStory?._id === item._id;

                      return (
                        <tr
                          key={item._id || index}
                          className={isSelected ? "selected-story-row" : ""}
                          onClick={() => handleStorySelect(item)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ textAlign: "center", verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <input
                                type="checkbox"
                                checked={selectedStoryIds.has(item._id)}
                                onChange={(e) => handleToggleSelectStory(item._id, e)}
                                style={{ cursor: "pointer", accentColor: "var(--primary)", width: 14, height: 14 }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.78rem", verticalAlign: "middle" }}>
                            {itemIndex}
                          </td>
                          <td>
                            <div className="story-cell">
                              <div className="story-thumb-wrap">
                                {item.coverImage ? (
                                  <>
                                    <img
                                      className="story-thumb-img"
                                      src={item.coverImage}
                                      alt=""
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        if (e.target.nextElementSibling) {
                                          e.target.nextElementSibling.style.display = "flex";
                                        }
                                      }}
                                    />
                                    <div className="story-thumb-fallback" style={{ display: "none" }}>
                                      <Headphones size={18} />
                                    </div>
                                  </>
                                ) : (
                                  <div className="story-thumb-fallback">
                                    <Headphones size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="story-info-meta">
                                <span className="story-title-text">{item.title}</span>
                                <div className="story-sub-text">
                                  {item.isComingSoon && (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "rgba(245, 158, 11, 0.14)",
                                        color: "var(--orange, #f59e0b)",
                                        border: "1px solid rgba(245, 158, 11, 0.3)",
                                        fontSize: "0.65rem",
                                        padding: "1px 5px",
                                      }}
                                    >
                                      Coming Soon
                                    </span>
                                  )}
                                  {item.categories && item.categories.length > 0 && (
                                    <div className="category-pill-list">
                                      {item.categories.slice(0, 2).map((c, ci) => (
                                        <span key={ci} className="category-mini-pill">
                                          {typeof c === "object" ? c.name : "Category"}
                                        </span>
                                      ))}
                                      {item.categories.length > 2 && (
                                        <span className="category-mini-pill">
                                          +{item.categories.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ color: "var(--text)", fontSize: "0.82rem", fontWeight: 500 }}>
                                {item.author || "—"}
                              </span>
                              {item.narrator && (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                  Voice: {item.narrator}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`episode-count-pill ${isSelected ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStorySelect(item);
                              }}
                              title="Click to view & manage episodes"
                            >
                              <ListMusic size={13} />
                              {item.totalEpisodes || 0} {item.totalEpisodes === 1 ? "Ep" : "Eps"}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "24px",
                                height: "24px",
                                borderRadius: "4px",
                                background: "var(--bg3)",
                                border: "1px solid var(--border)",
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                color: "var(--text)",
                              }}
                            >
                              {item.priority || 0}
                            </span>
                          </td>
                          <td>
                            <span className={item.isPremium ? "badge-tier-premium" : "badge-tier-free"}>
                              {item.isPremium ? "Premium" : "Free"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${item.isPublished ? "badge-active" : "badge-draft"}`}
                              style={{ fontSize: "0.68rem" }}
                            >
                              {item.isPublished ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td>
                            <div className="tbl-actions" style={{ justifyContent: "flex-end" }}>
                              <button
                                className="icon-btn view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingStory(item);
                                }}
                                title="View Story Profile"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                className="icon-btn view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStorySelect(item);
                                }}
                                title={isSelected ? "Collapse Episodes" : "Manage Episodes"}
                                style={isSelected ? { borderColor: "var(--primary)", color: "var(--primary)" } : {}}
                              >
                                <ListMusic size={14} />
                              </button>
                              <button
                                className="icon-btn edit"
                                onClick={(e) => openEditStory(item, e)}
                                title="Edit Audio Story"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="icon-btn del"
                                onClick={(e) => handleDeleteStory(item, e)}
                                title="Delete Audio Story"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="pagination-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  Showing page <strong style={{ color: "var(--text)" }}>{page}</strong> of {totalPages} ({filteredStories.length} stories)
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
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

      {/* ── Selected Story Episodes Management Panel ── */}
      {selectedStory && (
        <div className="episodes-panel-box">
          <div className="episodes-panel-header">
            <div className="episodes-panel-title-area">
              {selectedStory.coverImage ? (
                <>
                  <img
                    className="episodes-panel-cover"
                    src={selectedStory.coverImage}
                    alt=""
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                  <div
                    className="episodes-panel-cover"
                    style={{ display: "none", alignItems: "center", justifyContent: "center", background: "var(--bg3)" }}
                  >
                    <Headphones size={20} style={{ color: "var(--text-muted)" }} />
                  </div>
                </>
              ) : (
                <div
                  className="episodes-panel-cover"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg3)" }}
                >
                  <Headphones size={20} style={{ color: "var(--text-muted)" }} />
                </div>
              )}
              <div>
                <h3 className="episodes-panel-heading">
                  <span>Episodes for "{selectedStory.title}"</span>
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255, 209, 26, 0.14)",
                      color: "var(--primary)",
                      border: "1px solid rgba(255, 209, 26, 0.4)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {episodes.length} Episodes
                  </span>
                </h3>
                <p className="episodes-panel-sub">
                  Author: {selectedStory.author || "N/A"} • Voice: {selectedStory.narrator || "N/A"} • Tier: {selectedStory.isPremium ? "Premium" : "Free"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                className="btn btn-primary"
                onClick={openAddEpisodeModal}
                style={{ padding: "5px 12px", fontSize: "0.76rem", height: "auto" }}
              >
                <Plus size={14} /> Add Episode
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  setSelectedStory(null);
                  setEpisodes([]);
                }}
                title="Close episodes panel"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {loadingEpisodes ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <Loader size={20} className="spin-icon" style={{ color: "var(--primary)", margin: "0 auto 8px auto" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Loading episodes list...</p>
            </div>
          ) : (
            <div className="episodes-list-grid">
              {episodes.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    background: "var(--bg3)",
                    borderRadius: "8px",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <Music size={28} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 6 }} />
                  <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "0 0 10px 0" }}>
                    No episodes added yet for this audio story.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={openAddEpisodeModal}
                    style={{ padding: "5px 14px", fontSize: "0.76rem", height: "auto" }}
                  >
                    <Plus size={14} /> Add First Episode
                  </button>
                </div>
              ) : (
                episodes.map((ep) => {
                  const isCurrentPlaying = activePlayingEp?._id === ep._id && isPlaying;

                  return (
                    <div
                      key={ep._id}
                      className={`episode-item-card ${activePlayingEp?._id === ep._id ? "is-active-playing" : ""}`}
                    >
                      <div className="episode-item-left">
                        <div className="episode-index-badge">
                          {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                        </div>

                        {ep.thumbnail ? (
                          <>
                            <img
                              className="episode-thumb-preview"
                              src={ep.thumbnail}
                              alt=""
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextElementSibling) {
                                  e.target.nextElementSibling.style.display = "flex";
                                }
                              }}
                            />
                            <div className="episode-thumb-placeholder" style={{ display: "none" }}>
                              <ImageIcon size={15} />
                            </div>
                          </>
                        ) : (
                          <div className="episode-thumb-placeholder">
                            <ImageIcon size={15} />
                          </div>
                        )}

                        <div className="episode-item-details">
                          <h4 className="episode-item-title" style={{ display: "flex", alignItems: "center" }}>
                            <span>{ep.title}</span>
                            {isCurrentPlaying && (
                              <span className="soundwave-bars">
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                              </span>
                            )}
                          </h4>
                          <div className="episode-item-meta">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <Clock size={11} /> {formatDuration(ep.duration)}
                            </span>
                            {ep.description && (
                              <span style={{ opacity: 0.7, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                • {ep.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {ep.audioUrl && (
                          <button
                            className={`audio-preview-btn ${isCurrentPlaying ? "playing" : ""}`}
                            onClick={() => handleToggleAudio(ep)}
                            title={isCurrentPlaying ? "Pause Audio" : "Listen Audio Track"}
                          >
                            {isCurrentPlaying ? <Pause size={13} /> : <Play size={13} />}
                            <span>{isCurrentPlaying ? "Playing" : "Preview"}</span>
                          </button>
                        )}

                        <div className="tbl-actions">
                          <button
                            className="icon-btn edit"
                            onClick={() => openEditEpisodeModal(ep)}
                            title="Edit Episode"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="icon-btn del"
                            onClick={() => handleDeleteEpisode(ep)}
                            title="Delete Episode"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Story Profile Details View Modal ── */}
      {viewingStory && (
        <div className="modal-overlay" onClick={() => setViewingStory(null)}>
          <div
            className="user-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            {/* Minimal Header */}
            <div className="up-min-head">
              <h3 className="up-min-title">
                <Headphones size={16} style={{ color: "var(--primary)" }} /> Audio Story Profile
              </h3>
              <button className="up-min-close" onClick={() => setViewingStory(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Brief Story Card */}
            <div className="up-min-user-card">
              {viewingStory.coverImage ? (
                <>
                  <img
                    className="up-min-avatar"
                    style={{ borderRadius: 8 }}
                    src={viewingStory.coverImage}
                    alt=""
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                  <div
                    className="up-min-avatar"
                    style={{ borderRadius: 8, display: "none", alignItems: "center", justifyContent: "center" }}
                  >
                    <Headphones size={20} />
                  </div>
                </>
              ) : (
                <div
                  className="up-min-avatar"
                  style={{ borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Headphones size={20} />
                </div>
              )}
              <div className="up-min-user-meta">
                <div className="up-min-name-row">
                  <h4 className="up-min-name">{viewingStory.title}</h4>
                  <span className={`badge ${viewingStory.isPublished ? "badge-active" : "badge-draft"}`}>
                    {viewingStory.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="up-min-email">
                  {viewingStory.author ? `By ${viewingStory.author}` : "No author specified"}
                </p>
              </div>
            </div>

            {/* Key-Value Details */}
            <div className="up-min-list">
              <div className="up-min-row">
                <span className="up-min-label">Narrator / Voice</span>
                <span className="up-min-val">{viewingStory.narrator || "Not Specified"}</span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Catalog Episodes</span>
                <span className="up-min-val" style={{ color: "var(--primary)" }}>
                  {viewingStory.totalEpisodes || 0} Episodes
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Access Tier</span>
                <span
                  className="up-min-val"
                  style={{
                    color: viewingStory.isPremium
                      ? (document.body.classList.contains("light") ? "#b45309" : "#ffd11a")
                      : "inherit",
                    fontWeight: 600,
                  }}
                >
                  {viewingStory.isPremium ? "Premium" : "Free"}
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Catalog Priority</span>
                <span className="up-min-val">{viewingStory.priority || 0}</span>
              </div>

              {viewingStory.isComingSoon && (
                <div className="up-min-row">
                  <span className="up-min-label">Scheduled Release</span>
                  <span className="up-min-val" style={{ color: "var(--orange, #f59e0b)" }}>
                    {viewingStory.scheduleDate
                      ? new Date(viewingStory.scheduleDate).toLocaleString("en-IN")
                      : "Marked Coming Soon"}
                  </span>
                </div>
              )}

              <div className="up-min-row">
                <span className="up-min-label">Story ID</span>
                <span className="up-min-val mono">
                  {viewingStory._id}
                  <button
                    className="up-min-copy-btn"
                    onClick={() => handleCopy(viewingStory._id, "id")}
                    title="Copy Story ID"
                  >
                    {copiedLabel === "id" ? <CheckCheck size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
                  </button>
                </span>
              </div>

              {viewingStory.description && (
                <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>
                    Synopsis
                  </span>
                  <p style={{ color: "var(--text-soft)", margin: 0, lineHeight: 1.45 }}>
                    {viewingStory.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="up-min-foot">
              <div className="up-min-actions">
                <button
                  type="button"
                  onClick={() => {
                    handleStorySelect(viewingStory);
                    setViewingStory(null);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg3)",
                    color: "var(--text)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Headphones size={13} /> Episodes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const st = viewingStory;
                    setViewingStory(null);
                    openEditStory(st);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "var(--orange, #f59e0b)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  type="button"
                  className="up-min-btn-del"
                  onClick={() => {
                    const st = viewingStory;
                    setViewingStory(null);
                    handleDeleteStory(st);
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
              <button
                type="button"
                className="up-min-btn-close"
                onClick={() => setViewingStory(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Story Modal ── */}
      {editingStory && (
        <div className="modal-overlay" onClick={closeEditStoryModal}>
          <div
            className="user-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 580,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              className="up-min-head"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
                marginBottom: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255, 209, 26, 0.15)",
                    border: "1px solid rgba(255, 209, 26, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                  }}
                >
                  <ListMusic size={18} />
                </div>
                <div>
                  <h3 className="up-min-title" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    Edit Audio Story
                  </h3>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>
                    Update title, metadata, category tags, and artwork
                  </p>
                </div>
              </div>
              <button className="up-min-close" onClick={closeEditStoryModal} title="Close">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveStory}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
              }}
            >
              {/* Scrollable Modal Content Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Title & Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Story Title *
                  </label>
                  <input
                    type="text"
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Priority
                  </label>
                  <input
                    type="number"
                    value={storyForm.priority}
                    onChange={(e) => setStoryForm({ ...storyForm, priority: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Author & Narrator */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Author / Writer
                  </label>
                  <input
                    type="text"
                    value={storyForm.author}
                    onChange={(e) => setStoryForm({ ...storyForm, author: e.target.value })}
                    placeholder="e.g. Ruskin Bond"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Narrator / Voice Artist
                  </label>
                  <input
                    type="text"
                    value={storyForm.narrator}
                    onChange={(e) => setStoryForm({ ...storyForm, narrator: e.target.value })}
                    placeholder="e.g. Piyush Mishra"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Description / Synopsis
                </label>
                <textarea
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                  rows={3}
                  placeholder="Enter synopsis for this audio story..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.84rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Categories Selector */}
              {categories.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Categories & Genres
                  </label>
                  <div className="category-selector-group">
                    {categories.map((cat) => {
                      const isSelected = storyForm.categories.includes(cat._id);
                      return (
                        <div
                          key={cat._id}
                          className={`category-choice-pill ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleCategorySelection(cat._id)}
                        >
                          {isSelected && <Check size={11} style={{ marginRight: 3 }} />}
                          {cat.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggles: Published, Premium, Coming Soon */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--bg3)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Published</span>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={storyForm.isPublished}
                      onChange={(e) => setStoryForm({ ...storyForm, isPublished: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    ⭐ Premium (VIP)
                  </span>
                  <label className="switch-container switch-gold">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={storyForm.isPremium}
                      onChange={(e) => setStoryForm({ ...storyForm, isPremium: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Coming Soon</span>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={storyForm.isComingSoon}
                      onChange={(e) => setStoryForm({ ...storyForm, isComingSoon: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              {/* Schedule Date (if coming soon) */}
              {storyForm.isComingSoon && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Scheduled Release Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={storyForm.scheduleDate}
                    onChange={(e) => setStoryForm({ ...storyForm, scheduleDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Artwork: Cover Image & Banner Image */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                {/* Cover Image Upload */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Cover Poster (1:1 or 3:4)
                  </label>
                  <label className="modal-upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setStoryCoverFile(file);
                          setStoryCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    {storyCoverPreview ? (
                      <div style={{ position: "relative", width: "100%", height: 70 }}>
                        <img
                          src={storyCoverPreview}
                          alt="Cover"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }}
                        />
                        <span style={{ fontSize: "0.68rem", color: "var(--primary)", display: "block", marginTop: 2 }}>
                          Click to change
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload size={16} style={{ color: "var(--text-muted)" }} />
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Upload cover file</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Banner Image Upload */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Wide Banner (16:9)
                  </label>
                  <label className="modal-upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setStoryBannerFile(file);
                          setStoryBannerPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    {storyBannerPreview ? (
                      <div style={{ position: "relative", width: "100%", height: 70 }}>
                        <img
                          src={storyBannerPreview}
                          alt="Banner"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }}
                        />
                        <span style={{ fontSize: "0.68rem", color: "var(--primary)", display: "block", marginTop: 2 }}>
                          Click to change
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload size={16} style={{ color: "var(--text-muted)" }} />
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Upload banner file</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Progress indicator */}
              {storySaving && storyUploadProgress > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>Uploading artwork to CDN...</span>
                    <span>{storyUploadProgress}%</span>
                  </div>
                  <div className="upload-progress-bar-wrap">
                    <div className="upload-progress-fill" style={{ width: `${storyUploadProgress}%` }} />
                  </div>
                </div>
              )}

              </div>

              {/* Fixed Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: "14px 20px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg2)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeEditStoryModal}
                  disabled={storySaving}
                  style={{ padding: "7px 14px", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={storySaving}
                  style={{ padding: "7px 20px", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                >
                  {storySaving ? <Loader size={14} className="spin-icon" /> : <Check size={14} />}
                  {storySaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Episode Modal ── */}
      {episodeModalMode && (
        <div className="modal-overlay" onClick={closeEpisodeModal}>
          <div
            className="user-profile-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              className="up-min-head"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
                marginBottom: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255, 209, 26, 0.15)",
                    border: "1px solid rgba(255, 209, 26, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                  }}
                >
                  <Music size={18} />
                </div>
                <div>
                  <h3 className="up-min-title" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    {episodeModalMode === "create" ? "Add New Episode" : `Edit Episode ${editingEpisode?.episodeNumber}`}
                  </h3>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>
                    Story: {selectedStory?.title}
                  </p>
                </div>
              </div>
              <button className="up-min-close" onClick={closeEpisodeModal} title="Close">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveEpisode}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
              }}
            >
              {/* Scrollable Form Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
              {/* Episode Number & Title */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Ep # *
                  </label>
                  <input
                    type="number"
                    value={episodeForm.episodeNumber}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, episodeNumber: e.target.value })}
                    required
                    min={1}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                    Episode Title *
                  </label>
                  <input
                    type="text"
                    value={episodeForm.title}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                    required
                    placeholder="e.g. Chapter 1: The Encounter"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Duration & Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={episodeForm.duration}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, duration: e.target.value })}
                  placeholder="e.g. 180 (auto-calculated when uploading audio)"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.84rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Episode Description
                </label>
                <textarea
                  value={episodeForm.description}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
                  rows={2}
                  placeholder="Short summary of this episode..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.84rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Audio Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Audio File (.mp3, .aac, .m4a, .wav) {episodeModalMode === "create" && "*"}
                </label>
                <label className="modal-upload-box" style={{ padding: 18 }}>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                  />
                  <Music size={22} style={{ color: episodeAudioFile ? "var(--primary)" : "var(--text-muted)" }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 500, color: episodeAudioFile ? "var(--primary)" : "var(--text)" }}>
                    {episodeAudioFile ? episodeAudioFile.name : (episodeAudioUrl ? "Audio track attached (click to replace)" : "Choose audio track file")}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Direct high-speed stream upload to CDN
                  </span>
                </label>
              </div>

              {/* Thumbnail Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-soft)" }}>
                  Episode Thumbnail (Optional)
                </label>
                <label className="modal-upload-box" style={{ padding: 12 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setEpisodeThumbFile(file);
                        setEpisodeThumbPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {episodeThumbPreview ? (
                    <div style={{ position: "relative", width: "100%", height: 60 }}>
                      <img
                        src={episodeThumbPreview}
                        alt="Thumbnail"
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 4 }}
                      />
                      <span style={{ fontSize: "0.68rem", color: "var(--primary)", display: "block", marginTop: 2 }}>
                        Click to change thumbnail
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload size={16} style={{ color: "var(--text-muted)" }} />
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Upload thumbnail image</span>
                    </>
                  )}
                </label>
              </div>

              {/* Progress indicator */}
              {episodeSaving && episodeUploadProgress > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>Uploading track to CDN...</span>
                    <span>{episodeUploadProgress}%</span>
                  </div>
                  <div className="upload-progress-bar-wrap">
                    <div className="upload-progress-fill" style={{ width: `${episodeUploadProgress}%` }} />
                  </div>
                </div>
              )}

              </div>

              {/* Fixed Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: "14px 20px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg2)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeEpisodeModal}
                  disabled={episodeSaving}
                  style={{ padding: "7px 14px", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={episodeSaving}
                  style={{ padding: "7px 20px", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                >
                  {episodeSaving ? <Loader size={14} className="spin-icon" /> : <Check size={14} />}
                  {episodeSaving ? "Saving Episode..." : (episodeModalMode === "create" ? "Add Episode" : "Save Episode")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Sleek Confirmation & Alert Dialog ── */}
      {dialog.isOpen && (
        <div
          className="modal-overlay confirm-overlay"
          onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon-badge ${dialog.type}`}>
              {dialog.type === "danger" ? (
                <AlertCircle size={24} />
              ) : (
                <CheckCircle2 size={24} />
              )}
            </div>
            <h3 className="confirm-title">{dialog.title}</h3>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              {dialog.showCancel && (
                <button
                  className="confirm-btn-cancel"
                  onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                  {dialog.cancelText || "Cancel"}
                </button>
              )}
              <button
                className={dialog.type === "danger" ? "confirm-btn-danger" : "btn btn-primary"}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  borderRadius: 10,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
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

      {/* ── Docked Floating Studio Audio Player Bar ── */}
      {activePlayingEp && (
        <div className="docked-audio-player">
          <div className="docked-player-info">
            {activePlayingEp.thumbnail ? (
              <img className="docked-player-thumb" src={activePlayingEp.thumbnail} alt="" />
            ) : selectedStory?.coverImage ? (
              <img className="docked-player-thumb" src={selectedStory.coverImage} alt="" />
            ) : (
              <div
                className="docked-player-thumb"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg3)" }}
              >
                <Music size={18} style={{ color: "var(--primary)" }} />
              </div>
            )}
            <div className="docked-player-text">
              <h4 className="docked-player-title">
                {activePlayingEp.title}
              </h4>
              <span className="docked-player-sub">
                Ep {activePlayingEp.episodeNumber} • {selectedStory?.title || "Audio Story"}
              </span>
            </div>
          </div>

          <div className="docked-scrubber-wrap">
            <span className="docked-time-text">{formatDuration(audioCurrentTime)}</span>
            <input
              type="range"
              min={0}
              max={audioDuration || 100}
              value={audioCurrentTime}
              onChange={handleSeekAudio}
              className="docked-scrubber-slider"
            />
            <span className="docked-time-text">{formatDuration(audioDuration)}</span>
          </div>

          <div className="docked-player-controls">
            <button
              className="docked-play-btn"
              onClick={() => handleToggleAudio(activePlayingEp)}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
            </button>

            <button
              className="icon-btn"
              onClick={handleToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              className="docked-player-close"
              onClick={handleClosePlayer}
              title="Close Player"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
