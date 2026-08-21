import { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Trash2,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  LayoutGrid,
  List,
  Search,
  Check,
  Film
} from "lucide-react";
import API, { BASE_URL } from "../api/axios";
import "./Dashboard.css";
import "./IntroScreens.css";
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
  const [viewMode, setViewMode] = useState("table"); // Default to "table" view

  // Search in Content Selector Modal
  const [contentSearch, setContentSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "movie" | "series" | "microdrama"
  const [selectedContentIds, setSelectedContentIds] = useState([]);

  // Preview Modal State
  const [previewBanner, setPreviewBanner] = useState(null);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Success / Error Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchHomeBanners = async () => {
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
    setFilterType("all");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContentIds([]);
    setFilterType("all");
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

  const handleDeleteBanner = async (id) => {
    if (!window.confirm("Are you sure you want to remove this banner?"))
      return;

    try {
      await API.delete(`/admin/home-banners/${id}`);
      setMessage("Home banner deleted successfully.");
      fetchHomeBanners();
    } catch (err) {
      console.error("Delete banner error:", err);
      setError("Failed to delete home banner.");
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      const newStatus = !banner.isActive;
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

  const handleMoveOrder = async (index, direction) => {
    const newBanners = [...banners];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newBanners.length) return;

    // Swap order values
    const tempOrder = newBanners[index].order;
    newBanners[index].order = newBanners[targetIndex].order;
    newBanners[targetIndex].order = tempOrder;

    // Local optimistic update
    setBanners([...newBanners].sort((a, b) => a.order - b.order));

    try {
      const items = newBanners.map((b) => ({ id: b._id, order: b.order }));
      await API.patch("/admin/home-banners/reorder", { items });
    } catch (err) {
      console.error("Reorder error:", err);
      setError("Failed to save reordered banners.");
      fetchHomeBanners();
    }
  };

  // Filter available content for modal selection (excluding already added content)
  const existingContentIds = banners.map(
    (b) => (b.contentId?._id || b.contentId)?.toString()
  );

  const filteredContentToSelect = availableContent
    .filter((c) => !existingContentIds.includes(c._id.toString()))
    .filter((c) => filterType === "all" || (c.type || "").toLowerCase() === filterType)
    .filter(
      (c) =>
        c.title.toLowerCase().includes(contentSearch.toLowerCase())
    );

  if (fetching) {
    return (
      <div
        className="page-section"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "350px",
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
          <Loader
            size={24}
            className="animate-spin"
            style={{ display: "inline-block", marginRight: 10 }}
          />
          Loading Home Banners...
        </p>
      </div>
    );
  }

  return (
    <div className="home-banners-container">
      {/* Header */}
      <div
        className="pg-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div className="banner-header-badge">
            <Film size={14} /> Hero Slider Carousel
          </div>
          <h1 className="pg-title">Homepage Hero Banners</h1>
          <p className="pg-sub">
            Feature movies, web series, and short dramas on the homepage hero carousel
          </p>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={18} /> Add Hero Banners
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="intro-controls-bar">
        <div className="intro-stats-text">
          Total Hero Banners:{" "}
          <span className="intro-stats-count">{banners.length}</span> | Active:{" "}
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            {banners.filter((b) => b.isActive !== false).length}
          </span>
        </div>

        <div className="view-toggle-group">
          <button
            className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <List size={16} /> Table View
          </button>
          <button
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid Cards View"
          >
            <LayoutGrid size={16} /> Grid Cards
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {banners.length === 0 ? (
        /* Empty State */
        <div className="intro-empty-state">
          <div className="intro-empty-icon">
            <ImageIcon size={32} />
          </div>
          <div className="intro-empty-title">No home banners added yet</div>
          <div className="intro-empty-sub">
            Add movies, series, or microdramas to feature them on the main homepage slider.
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="content-box">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>Display Order</th>
                  <th style={{ width: "140px" }}>Hero Banner</th>
                  <th>Content Title</th>
                  <th style={{ width: "140px" }}>Type</th>
                  <th style={{ width: "100px" }}>Status</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {banners.map((banner, index) => {
                  const content = banner.contentId || {};
                  const contentType = content.type || banner.contentType || "movie";
                  const imageUrl = getImageUrl(content.banner || content.poster || "");

                  return (
                    <tr key={banner._id}>
                      {/* Order Controls */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              minWidth: "26px",
                              textAlign: "center",
                              color: "#FF7A1A",
                              fontSize: "1rem",
                            }}
                          >
                            #{banner.order}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <button
                              className="icon-btn"
                              disabled={index === 0}
                              onClick={() => handleMoveOrder(index, "up")}
                              title="Move Up"
                              style={{
                                padding: "2px",
                                opacity: index === 0 ? 0.3 : 1,
                              }}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              className="icon-btn"
                              disabled={index === banners.length - 1}
                              onClick={() => handleMoveOrder(index, "down")}
                              title="Move Down"
                              style={{
                                padding: "2px",
                                opacity:
                                  index === banners.length - 1 ? 0.3 : 1,
                              }}
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Banner 16:9 Image Thumbnail */}
                      <td>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={content.title}
                            className="table-banner-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://via.placeholder.com/120x68?text=No+Banner";
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
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>

                      {/* Title & Metadata */}
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.95rem" }}>
                          {content.title || "Untitled Content"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Lang: {content.language || "N/A"} • Year: {content.releaseYear || "N/A"}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td>
                        <span className={`banner-type-badge ${contentType.toLowerCase()}`}>
                          {contentType}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td>
                        <label
                          className="switch-container"
                          title={
                            banner.isActive !== false
                              ? "Click to deactivate"
                              : "Click to activate"
                          }
                        >
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={banner.isActive !== false}
                            onChange={() => handleToggleActive(banner)}
                          />
                          <span className="switch-slider"></span>
                        </label>
                      </td>

                      {/* Actions */}
                      <td>
                        <div
                          className="tbl-actions"
                          style={{ justifyContent: "center" }}
                        >
                          <button
                            className="icon-btn"
                            onClick={() => setPreviewBanner(banner)}
                            title="Preview Hero Banner"
                            style={{ color: "#3b82f6" }}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="icon-btn del"
                            onClick={() => handleDeleteBanner(banner._id)}
                            title="Delete Banner"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="banner-grid">
          {banners.map((banner, index) => {
            const content = banner.contentId || {};
            const contentType = content.type || banner.contentType || "movie";
            const imageUrl = getImageUrl(content.banner || content.poster || "");

            return (
              <div className="banner-card" key={banner._id}>
                {/* Order Badge */}
                <div className="banner-order-badge">#{banner.order}</div>

                {/* Type Badge */}
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3 }}>
                  <span className={`banner-type-badge ${contentType.toLowerCase()}`}>
                    {contentType}
                  </span>
                </div>

                {/* Banner Image Preview Container */}
                <div className="banner-card-img-wrap">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={content.title || "Banner"}
                      className="banner-card-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://via.placeholder.com/400x225?text=No+Banner+Image";
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

                  {/* Card Quick Overlay Actions */}
                  <div className="intro-quick-actions">
                    {/* Order Arrows */}
                    <div className="order-arrows-wrap">
                      <button
                        className="arrow-btn"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, "up")}
                        title="Move Up in Order"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="arrow-btn"
                        disabled={index === banners.length - 1}
                        onClick={() => handleMoveOrder(index, "down")}
                        title="Move Down in Order"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-btns-wrap">
                      <button
                        className="btn-card-action view"
                        onClick={() => setPreviewBanner(banner)}
                        title="Preview Hero Banner"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="btn-card-action delete"
                        onClick={() => handleDeleteBanner(banner._id)}
                        title="Remove Banner"
                      >
                        <Trash2 size={15} />
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
                    }}
                  >
                    <h3 className="banner-card-title">
                      {content.title || "Untitled Content"}
                    </h3>
                    {/* Status Toggle Switch */}
                    <label
                      className="switch-container"
                      title={
                        banner.isActive !== false
                          ? "Click to deactivate"
                          : "Click to activate"
                      }
                    >
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={banner.isActive !== false}
                        onChange={() => handleToggleActive(banner)}
                      />
                      <span className="switch-slider"></span>
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

      {/* Add Home Banners Modal (Table Format) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 780 }}>
            <div className="modal-head">
              <h3>🎬 Feature Content on Homepage Hero Slider</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitBanners}>
              <div
                className="modal-body"
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                  Select one or more published Movies, Web Series, or Microdramas to feature as homepage hero banners.
                </p>

                {/* Search Bar inside Selector */}
                <div className="search-field">
                  <Search size={18} />
                  <input
                    placeholder="Search available content by title..."
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                  />
                </div>

                {/* Type Filter Toggles */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {[
                    { id: "all", label: "All Content" },
                    { id: "movie", label: "Movies" },
                    { id: "series", label: "Web Series" },
                    { id: "microdrama", label: "Microdramas" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilterType(t.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: filterType === t.id ? 'var(--primary)' : 'var(--border)',
                        background: filterType === t.id ? 'var(--primary-dim)' : 'rgba(255, 255, 255, 0.02)',
                        color: filterType === t.id ? 'var(--primary)' : 'var(--text-soft)',
                        transition: 'all 0.2s ease',
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
                        <th style={{ width: "140px" }}>Banner Image</th>
                        <th>Content Title</th>
                        <th style={{ width: "130px" }}>Type</th>
                        <th style={{ width: "150px" }}>Details</th>
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
                            }}
                          >
                            No available content found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredContentToSelect.map((c) => {
                          const isSelected = selectedContentIds.includes(c._id);
                          const imgUrl = getImageUrl(c.banner || c.poster || "");

                          return (
                            <tr
                              key={c._id}
                              className={isSelected ? "selected-row" : ""}
                              onClick={() => handleToggleSelectContent(c._id)}
                            >
                              {/* Checkbox Column */}
                              <td style={{ textAlign: "center" }}>
                                <div className="modal-checkbox">
                                  {isSelected && <Check size={13} />}
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
                                      e.target.src =
                                        "https://via.placeholder.com/120x68?text=No+Banner";
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
                                    <ImageIcon size={20} />
                                  </div>
                                )}
                              </td>

                              {/* Title Column */}
                              <td style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.95rem" }}>
                                {c.title}
                              </td>

                              {/* Type Column */}
                              <td>
                                <span className={`banner-type-badge ${(c.type || "content").toLowerCase()}`}>
                                  {c.type || "content"}
                                </span>
                              </td>

                              {/* Details Column */}
                              <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                <div>{c.genre ? (Array.isArray(c.genre) ? c.genre.join(", ") : c.genre) : "—"}</div>
                                <div style={{ fontSize: "0.75rem" }}>Lang: {c.language || "N/A"}</div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-foot" style={{ marginTop: 20 }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    marginRight: 10,
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-lg"
                  type="submit"
                  disabled={loading || selectedContentIds.length === 0}
                  style={{
                    padding: "10px 26px",
                    background: "linear-gradient(135deg, #FF7A1A, #FF4500)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor:
                      loading || selectedContentIds.length === 0
                        ? "not-allowed"
                        : "pointer",
                    boxShadow: "0 4px 14px rgba(255, 122, 26, 0.4)",
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

      {/* Hero Banner Lightbox Preview Modal */}
      {previewBanner && (
        <div className="modal-overlay">
          <div
            className="modal-box"
            style={{
              maxWidth: 720,
              padding: 0,
              borderRadius: "16px",
              background: "#0d1117",
              overflow: "hidden",
              border: "1px solid var(--border)",
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
                  previewBanner.contentId?.banner ||
                    previewBanner.contentId?.poster ||
                    ""
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
                    "linear-gradient(to top, rgba(13,17,23,1) 10%, rgba(13,17,23,0.3) 60%, transparent 100%)",
                }}
              />
              <button
                onClick={() => setPreviewBanner(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: "#fff",
                  padding: 8,
                  borderRadius: "50%",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>

              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 24,
                  right: 24,
                }}
              >
                <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
                  {previewBanner.contentId?.title || "Untitled Content"}
                </h2>
                <p style={{ fontSize: "0.9rem", color: "#cbd5e1", margin: 0 }}>
                  {previewBanner.contentId?.description || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
