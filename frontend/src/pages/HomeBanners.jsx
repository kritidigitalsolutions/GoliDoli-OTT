import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  ImageIcon,
  Trash2,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Search,
  Check,
  RefreshCw,
  Edit2,
  Pencil,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import API, { BASE_URL } from "../api/axios";
import "./Dashboard.css";
import "./Category.css";
import "./HomeBanners.css";

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export default function HomeBannersPage() {
  const [banners, setBanners] = useState([]);
  const [availableContent, setAvailableContent] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "active" | "inactive" | "movie" | "series" | "microdrama"

  // Search & Filters in Content Selector Modal
  const [contentSearch, setContentSearch] = useState("");
  const [modalFilterType, setModalFilterType] = useState("all"); // "all" | "movie" | "series" | "microdrama"
  const [selectedContentIds, setSelectedContentIds] = useState([]);

  // Preview Lightbox Modal State
  const [previewBanner, setPreviewBanner] = useState(null);

  // Add Banners Modal State
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit Banner Modal State
  const [editingBanner, setEditingBanner] = useState(null);
  const [editForm, setEditForm] = useState({ contentId: "", order: 1, isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);

  // Success / Error Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Custom Confirmation Dialog State
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
    confirmText: "Confirm",
    cancelText: "Cancel",
    showCancel: true,
    onConfirm: null,
  });

  const showConfirm = ({ title, message, type = "danger", confirmText = "Confirm", cancelText = "Cancel", onConfirm }) => {
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

  const fetchHomeBanners = async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/home-banners");
      const data = res.data.data || [];
      setBanners(data);
    } catch (err) {
      console.error("Fetch home banners error:", err);
      setError("Failed to fetch home banners.");
    } finally {
      setFetching(false);
    }
  };

  const fetchAvailableContent = async () => {
    try {
      const res = await API.get("/content");
      const list = res.data.content || [];
      setAvailableContent(list);
    } catch (err) {
      console.error("Fetch content error:", err);
    }
  };

  useEffect(() => {
    fetchHomeBanners();
    fetchAvailableContent();
  }, []);

  const handleOpenAddModal = () => {
    setMessage("");
    setError("");
    setSelectedContentIds([]);
    setContentSearch("");
    setModalFilterType("all");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContentIds([]);
    setModalFilterType("all");
  };

  const handleOpenEditModal = (banner) => {
    setMessage("");
    setError("");
    const content = banner.contentId || {};
    setEditingBanner(banner);
    setEditForm({
      contentId: content._id || banner.contentId || "",
      order: banner.order || 1,
      isActive: banner.isActive !== false,
    });
  };

  const handleCloseEditModal = () => {
    setEditingBanner(null);
    setSavingEdit(false);
  };

  const handleSaveEditBanner = async (e) => {
    e.preventDefault();
    if (!editingBanner) return;

    setSavingEdit(true);
    setMessage("");
    setError("");

    try {
      await API.put(`/admin/home-banners/${editingBanner._id}`, {
        contentId: editForm.contentId,
        order: parseInt(editForm.order, 10),
        isActive: editForm.isActive,
      });

      setMessage("Home banner updated successfully.");
      handleCloseEditModal();
      fetchHomeBanners();
    } catch (err) {
      console.error("Update banner error:", err);
      setError(err.response?.data?.message || "Failed to update home banner.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleSelectContent = (id) => {
    if (selectedContentIds.includes(id)) {
      setSelectedContentIds(selectedContentIds.filter((item) => item !== id));
    } else {
      setSelectedContentIds([...selectedContentIds, id]);
    }
  };

  const handleSubmitBanners = async (e) => {
    e.preventDefault();
    if (selectedContentIds.length === 0) {
      setError("Please select at least one content item to add to Home Banners.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await API.post("/admin/home-banners", {
        contentIds: selectedContentIds,
      });

      setMessage(res.data.message || "Home banners created successfully.");
      handleCloseModal();
      fetchHomeBanners();
    } catch (err) {
      console.error("Create banner error:", err);
      setError(
        err.response?.data?.message || "Failed to create home banners."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = (id, bannerTitle) => {
    showConfirm({
      title: "Delete Hero Banner",
      message: `Are you sure you want to remove "${bannerTitle || "this banner"}" from the homepage hero carousel?`,
      type: "danger",
      confirmText: "Remove Banner",
      onConfirm: async () => {
        setDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await API.delete(`/admin/home-banners/${id}`);
          setMessage("Home banner removed successfully.");
          fetchHomeBanners();
        } catch (err) {
          console.error("Delete banner error:", err);
          setError("Failed to delete home banner.");
        }
      },
    });
  };

  const handleToggleActive = async (banner) => {
    try {
      const newStatus = banner.isActive === false ? true : false;
      await API.patch(`/admin/home-banners/${banner._id}/status`, {
        isActive: newStatus,
      });

      // Update state locally
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: newStatus } : b))
      );
    } catch (err) {
      console.error("Toggle status error:", err);
      setError("Failed to update banner status.");
    }
  };

  const handleDirectOrderChange = async (currentIndex, newOrderValue) => {
    const newOrder = parseInt(newOrderValue, 10);
    if (!newOrder || isNaN(newOrder)) {
      fetchHomeBanners();
      return;
    }

    let targetOrder = newOrder;
    if (targetOrder < 1) targetOrder = 1;
    if (targetOrder > banners.length) targetOrder = banners.length;

    if (targetOrder === currentIndex + 1) {
      fetchHomeBanners();
      return;
    }

    const bannerToUpdate = banners[currentIndex];

    try {
      await API.put(`/admin/home-banners/${bannerToUpdate._id}`, { order: targetOrder });
      fetchHomeBanners();
    } catch (err) {
      console.error("Update order error:", err);
      setError("Failed to update banner order.");
      fetchHomeBanners();
    }
  };

  // Filter available content for modal selection (excluding already added content)
  const existingContentIds = banners.map(
    (b) => (b.contentId?._id || b.contentId)?.toString()
  );

  const filteredContentToSelect = availableContent
    .filter((c) => !existingContentIds.includes(c._id.toString()))
    .filter((c) => modalFilterType === "all" || (c.type || "").toLowerCase() === modalFilterType)
    .filter((c) => (c.title || "").toLowerCase().includes(contentSearch.toLowerCase()));

  // Filter banners based on search query & segmented tab filter for main view
  const filteredBanners = banners.filter((banner) => {
    const content = banner.contentId || {};
    const title = content.title || "";
    const type = (content.type || banner.contentType || "").toLowerCase();
    const isActive = banner.isActive !== false;

    // Search filter
    if (searchQuery && !title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Segmented tab filter
    if (filterTab === "active") return isActive;
    if (filterTab === "inactive") return !isActive;
    if (filterTab === "movie") return type === "movie";
    if (filterTab === "series") return type === "series" || type === "web series";
    if (filterTab === "microdrama") return type === "microdrama" || type === "short drama";

    return true;
  });

  const totalBannersCount = banners.length;
  const activeBannersCount = banners.filter((b) => b.isActive !== false).length;
  const inactiveBannersCount = totalBannersCount - activeBannersCount;

  return (
    <div className="home-banners-container">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Film className="pg-title-icon" size={20} />
            Homepage Hero Banners
          </h1>
          <p className="pg-sub">
            Feature movies, web series, and microdramas on the main app homepage carousel
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={fetchHomeBanners}
            disabled={fetching}
            title="Refresh Banners List"
            style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
          >
            <RefreshCw size={14} className={fetching ? "spin-icon" : ""} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} /> Add Hero Banners
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="alert alert-success"
          >
            <CheckCircle size={18} /> {message}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="alert alert-error"
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Card Symmetrical Executive KPI Grid */}
      <div className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Hero Banners</span>
            <div className="kpi-icon-badge icon-amber">
              <Film size={15} />
            </div>
          </div>
          <div className="kpi-value">{totalBannersCount}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Banners in homepage carousel
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Banners</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {activeBannersCount}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Visible on frontend application
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Inactive Banners</span>
            <div className="kpi-icon-badge icon-pink">
              <EyeOff size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: inactiveBannersCount > 0 ? "#F43F5E" : "var(--text-muted)" }}>
            {inactiveBannersCount}
          </div>
          <div className="kpi-footer" style={{ color: inactiveBannersCount > 0 ? "#F43F5E" : "var(--text-muted)" }}>
            Hidden or disabled banners
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div
          className="search-row"
          style={{
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search hero banners by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.84rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segmented Filter Switch */}
            <div className="segmented-switch">
              {[
                { id: "all", label: "All Banners" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
                { id: "movie", label: "Movies" },
                { id: "series", label: "Web Series" },
                { id: "microdrama", label: "Microdramas" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`segmented-switch-btn ${filterTab === opt.id ? "active" : ""}`}
                  onClick={() => setFilterTab(opt.id)}
                >
                  {filterTab === opt.id && (
                    <motion.div
                      layoutId="activeBannerFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle Group */}
          <div className="segmented-switch">
            <button
              className={`segmented-switch-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              {viewMode === "table" && (
                <motion.div
                  layoutId="activeBannerViewModePill"
                  className="segmented-switch-active-bg"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                <List size={14} /> Table
              </span>
            </button>
            <button
              className={`segmented-switch-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              {viewMode === "grid" && (
                <motion.div
                  layoutId="activeBannerViewModePill"
                  className="segmented-switch-active-bg"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                <LayoutGrid size={14} /> Grid
              </span>
            </button>
          </div>
        </div>

        {/* Main Banner Data Display */}
        {fetching ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "260px",
              color: "var(--text-muted)",
              gap: 10,
            }}
          >
            <Loader size={20} className="animate-spin" />
            <span>Loading homepage banners...</span>
          </div>
        ) : filteredBanners.length === 0 ? (
          /* Empty State */
          <div className="banner-empty-state">
            <div className="banner-empty-icon">
              <Film size={26} />
            </div>
            <div className="banner-empty-title">
              {searchQuery || filterTab !== "all"
                ? "No matching hero banners found"
                : "No home banners added yet"}
            </div>
            <div className="banner-empty-sub">
              {searchQuery || filterTab !== "all"
                ? "Try adjusting your search criteria or filter tabs."
                : "Add published movies, web series, or microdramas to showcase on the main homepage slider."}
            </div>
            {!searchQuery && filterTab === "all" && (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddModal}
                style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={16} /> Add First Hero Banner
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="tbl-wrap">
            <table className="tbl tbl-banners">
              <thead>
                <tr>
                  <th style={{ width: "100px", textAlign: "center" }}>Order</th>
                  <th style={{ width: "130px" }}>Banner Image</th>
                  <th>Content Title</th>
                  <th style={{ width: "160px" }}>Type</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Status</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBanners.map((banner, index) => {
                  const content = banner.contentId || {};
                  const contentType = (content.type || banner.contentType || "movie").toLowerCase();
                  const imageUrl = getImageUrl(content.banner || content.poster || "");

                  return (
                    <tr key={banner._id}>
                      {/* Order Input */}
                      <td style={{ textAlign: "center" }}>
                        <div className="order-pill-wrap" title="Click to edit display order">
                          <span className="order-hash">#</span>
                          <input
                            type="number"
                            min="1"
                            max={banners.length}
                            value={banner.order}
                            onChange={(e) => {
                              const newBanners = [...banners];
                              newBanners[index].order = e.target.value;
                              setBanners(newBanners);
                            }}
                            onBlur={(e) => handleDirectOrderChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.target.blur();
                              }
                            }}
                            className="order-pill-input"
                          />
                        </div>
                      </td>

                      {/* 16:9 Banner Image Thumbnail */}
                      <td>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={content.title || "Banner"}
                            className="table-banner-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/110x62?text=No+Image";
                            }}
                            onClick={() => setPreviewBanner(banner)}
                            style={{ cursor: "pointer" }}
                            title="Click to preview hero banner"
                          />
                        ) : (
                          <div
                            className="table-banner-img"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                            }}
                          >
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>

                      {/* Content Title & Details */}
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--text)",
                            fontSize: "0.92rem",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewBanner(banner)}
                        >
                          {content.title || "Untitled Content"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Lang: {content.language || "N/A"} • Year: {content.releaseYear || "N/A"}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td>
                        <span className={`banner-type-badge ${contentType}`}>
                          {contentType}
                        </span>
                      </td>

                      {/* Status Toggle Switch (Vibrant Emerald / Rose Red) */}
                      <td style={{ textAlign: "center" }}>
                        <label
                          className="switch-label"
                          title={banner.isActive !== false ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={banner.isActive !== false}
                            onChange={() => handleToggleActive(banner)}
                          />
                          <span className={`switch-track ${banner.isActive !== false ? "active" : ""}`}>
                            <span className="switch-thumb"></span>
                          </span>
                        </label>
                      </td>

                      {/* Actions Column with Preview, Edit, Delete */}
                      <td>
                        <div className="tbl-actions" style={{ justifyContent: "center" }}>
                          <button
                            className="icon-btn"
                            onClick={() => setPreviewBanner(banner)}
                            title="Preview Hero Banner"
                            style={{ color: "#3b82f6" }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => handleOpenEditModal(banner)}
                            title="Edit Hero Banner"
                            style={{ color: "#f59e0b" }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="icon-btn del"
                            onClick={() => handleDeleteBanner(banner._id, content.title)}
                            title="Remove Banner"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Cards View */
          <div className="banner-grid">
            {filteredBanners.map((banner, index) => {
              const content = banner.contentId || {};
              const contentType = (content.type || banner.contentType || "movie").toLowerCase();
              const imageUrl = getImageUrl(content.banner || content.poster || "");

              return (
                <div className="banner-card" key={banner._id}>
                  {/* Order Badge */}
                  <div className="banner-order-badge">#{banner.order}</div>

                  {/* Type Badge Overlay */}
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}>
                    <span className={`banner-type-badge ${contentType}`}>
                      {contentType}
                    </span>
                  </div>

                  {/* Image Container */}
                  <div className="banner-card-img-wrap">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={content.title || "Banner"}
                        className="banner-card-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/320x180?text=No+Image";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <div className="banner-card-overlay" />

                    {/* Quick Overlay Action Bar */}
                    <div className="banner-card-actions">
                      <div className="order-pill-wrap" style={{ background: "rgba(0,0,0,0.65)", borderColor: "rgba(255,255,255,0.18)" }} title="Click to edit display order">
                        <span className="order-hash">#</span>
                        <input
                          type="number"
                          min="1"
                          max={banners.length}
                          value={banner.order}
                          onChange={(e) => {
                            const newBanners = [...banners];
                            newBanners[index].order = e.target.value;
                            setBanners(newBanners);
                          }}
                          onBlur={(e) => handleDirectOrderChange(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                          className="order-pill-input"
                          style={{ color: "#fff" }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="icon-btn"
                          onClick={() => setPreviewBanner(banner)}
                          title="Preview Hero Banner"
                          style={{ background: "rgba(15,23,42,0.75)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleOpenEditModal(banner)}
                          title="Edit Hero Banner"
                          style={{ background: "rgba(15,23,42,0.75)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDeleteBanner(banner._id, content.title)}
                          title="Remove Banner"
                          style={{ background: "rgba(15,23,42,0.75)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="banner-card-body">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <h3 className="banner-card-title">
                        {content.title || "Untitled Content"}
                      </h3>

                      {/* Status Toggle Switch */}
                      <label
                        className="switch-label"
                        title={banner.isActive !== false ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}
                      >
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={banner.isActive !== false}
                          onChange={() => handleToggleActive(banner)}
                        />
                        <span className={`switch-track ${banner.isActive !== false ? "active" : ""}`}>
                          <span className="switch-thumb"></span>
                        </span>
                      </label>
                    </div>

                    <div className="banner-card-sub">
                      <span>Year: {content.releaseYear || "N/A"}</span>
                      <span>•</span>
                      <span>Lang: {content.language || "N/A"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Home Banners Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 760 }}>
            <div className="modal-head">
              <h3>🎬 Feature Content on Homepage Hero Slider</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitBanners}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", margin: 0 }}>
                  Select published Movies, Web Series, or Microdramas to add them to the homepage hero carousel.
                </p>

                {/* Search Bar inside Selector */}
                <div className="search-field">
                  <Search size={16} style={{ color: "var(--text-muted)" }} />
                  <input
                    placeholder="Search available content by title..."
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                  />
                  {contentSearch && (
                    <button
                      type="button"
                      onClick={() => setContentSearch("")}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Type Filter Tabs inside Selector */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Content" },
                    { id: "movie", label: "Movies" },
                    { id: "series", label: "Web Series" },
                    { id: "microdrama", label: "Microdramas" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setModalFilterType(t.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor: modalFilterType === t.id ? "var(--primary)" : "var(--border)",
                        background: modalFilterType === t.id ? "rgba(255, 122, 26, 0.15)" : "transparent",
                        color: modalFilterType === t.id ? "#FF7A1A" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Content Table Selector */}
                <div className="modal-table-container">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center" }}>Select</th>
                        <th style={{ width: "120px" }}>Banner Image</th>
                        <th>Content Title</th>
                        <th style={{ width: "140px" }}>Type</th>
                        <th style={{ width: "130px" }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContentToSelect.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              padding: "36px 10px",
                              color: "var(--text-muted)",
                              fontSize: "0.86rem",
                            }}
                          >
                            No available content found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredContentToSelect.map((c) => {
                          const isSelected = selectedContentIds.includes(c._id);
                          const imgUrl = getImageUrl(c.banner || c.poster || "");
                          const contentType = (c.type || "content").toLowerCase();

                          return (
                            <tr
                              key={c._id}
                              className={isSelected ? "selected-row" : ""}
                              onClick={() => handleToggleSelectContent(c._id)}
                            >
                              {/* Checkbox Column */}
                              <td style={{ textAlign: "center" }}>
                                <div className="modal-checkbox">
                                  {isSelected && <Check size={12} />}
                                </div>
                              </td>

                              {/* Banner Thumbnail Column */}
                              <td>
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={c.title}
                                    className="table-banner-img"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "https://via.placeholder.com/110x62?text=No+Banner";
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="table-banner-img"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    <ImageIcon size={18} />
                                  </div>
                                )}
                              </td>

                              {/* Title Column */}
                              <td style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>
                                {c.title}
                              </td>

                              {/* Type Column */}
                              <td>
                                <span className={`banner-type-badge ${contentType}`}>
                                  {contentType}
                                </span>
                              </td>

                              {/* Details Column */}
                              <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                <div>{c.genre ? (Array.isArray(c.genre) ? c.genre.join(", ") : c.genre) : "—"}</div>
                                <div style={{ fontSize: "0.74rem" }}>Lang: {c.language || "N/A"}</div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-foot" style={{ marginTop: 16 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={handleCloseModal}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading || selectedContentIds.length === 0}
                  style={{
                    opacity: selectedContentIds.length === 0 ? 0.5 : 1,
                  }}
                >
                  {loading
                    ? "Adding..."
                    : `Add Selected Banners (${selectedContentIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Home Banner Modal */}
      {editingBanner && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-head">
              <h3>✏️ Edit Homepage Hero Banner</h3>
              <button className="modal-close" onClick={handleCloseEditModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBanner}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Content Selector */}
                <div className="form-group">
                  <label style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    Featured Content Item
                  </label>
                  <select
                    value={editForm.contentId}
                    onChange={(e) => setEditForm({ ...editForm, contentId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                      outline: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    {availableContent.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title} ({c.type || "Content"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Order Priority */}
                <div className="form-group">
                  <label style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    Display Order Priority
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#FF7A1A", fontWeight: 700 }}>#</span>
                    <input
                      type="number"
                      min="1"
                      max={banners.length}
                      value={editForm.order}
                      onChange={(e) => setEditForm({ ...editForm, order: e.target.value })}
                      style={{
                        width: "80px",
                        padding: "8px 10px",
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--text)",
                        fontWeight: "bold",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      (1 = First slide on homepage carousel)
                    </span>
                  </div>
                </div>

                {/* Active Status Switch */}
                <div
                  className="form-group"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>
                      Active Status
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      {editForm.isActive ? "Visible on homepage carousel" : "Hidden from users"}
                    </div>
                  </div>

                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    />
                    <span className={`switch-track ${editForm.isActive ? "active" : ""}`}>
                      <span className="switch-thumb"></span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-foot" style={{ marginTop: 16 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={handleCloseEditModal}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Banner Lightbox Preview Modal */}
      {previewBanner && (
        <div className="modal-overlay" onClick={() => setPreviewBanner(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 700,
              padding: 0,
              borderRadius: "16px",
              background: "#090d16",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                background: "#000",
              }}
            >
              <img
                src={getImageUrl(
                  previewBanner.contentId?.banner || previewBanner.contentId?.poster || ""
                )}
                alt={previewBanner.contentId?.title || "Banner"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(9,13,22,1) 12%, rgba(9,13,22,0.4) 60%, transparent 100%)",
                }}
              />
              <button
                onClick={() => setPreviewBanner(null)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: 6,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 20,
                  right: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="banner-order-badge" style={{ position: "relative", top: 0, left: 0 }}>
                    #{previewBanner.order}
                  </span>
                  <span className={`banner-type-badge ${(previewBanner.contentId?.type || "movie").toLowerCase()}`}>
                    {previewBanner.contentId?.type || "movie"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: previewBanner.isActive !== false ? "#10B981" : "#F43F5E",
                      background: previewBanner.isActive !== false ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {previewBanner.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                  {previewBanner.contentId?.title || "Untitled Content"}
                </h2>
                <p style={{ fontSize: "0.84rem", color: "#cbd5e1", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {previewBanner.contentId?.description || "No description provided."}
                </p>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 8 }}>
                  Language: {previewBanner.contentId?.language || "N/A"} • Release Year: {previewBanner.contentId?.releaseYear || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {dialog.isOpen && (
          <div
            className="modal-overlay confirm-overlay"
            style={{ zIndex: 1100 }}
            onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
          >
            <motion.div
              className="confirm-modal-box"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`confirm-icon-badge ${dialog.type}`}>
                {dialog.type === "danger" ? <Trash2 size={24} /> : <AlertCircle size={24} />}
              </div>

              <h3 className="confirm-title">{dialog.title}</h3>
              <p className="confirm-message">{dialog.message}</p>

              <div className="confirm-actions">
                {dialog.showCancel && (
                  <button
                    className="confirm-btn-cancel"
                    onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
                  >
                    {dialog.cancelText}
                  </button>
                )}
                <button
                  className={dialog.type === "danger" ? "confirm-btn-danger" : "btn btn-primary"}
                  onClick={dialog.onConfirm}
                >
                  {dialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
