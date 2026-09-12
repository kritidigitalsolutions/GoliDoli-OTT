import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Search,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Type,
  Hash,
  Link as LinkIcon,
  Wifi,
  Battery,
  Signal
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./IntroScreens.css";

export default function IntroScreensPage() {
  const [introScreens, setIntroScreens] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Preview Modal State
  const [previewScreen, setPreviewScreen] = useState(null);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    image: "",
    order: 0,
  });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const showAlert = (title, message) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: "info",
      confirmText: "OK",
      showCancel: false,
      onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  const fetchIntroScreens = async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/intro-screens");
      const data = res.data.data || [];
      setIntroScreens(data);
    } catch (err) {
      console.error("Fetch intro screens error:", err);
      showAlert("Error", "Failed to fetch intro screens.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchIntroScreens();
  }, []);

  const handleOpenAddModal = () => {
    const maxOrder =
      introScreens.length > 0
        ? Math.max(...introScreens.map((s) => s.order || 0)) + 1
        : 1;

    setForm({
      title: "",
      image: "",
      order: maxOrder,
    });
    setEditId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (screen) => {
    setForm({
      title: screen.title || "",
      image: screen.image || "",
      order: screen.order !== undefined ? screen.order : 0,
    });
    setEditId(screen._id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.image.trim()) {
      return showAlert("Validation Error", "Title and Image URL are required.");
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        image: form.image.trim(),
        order: Number(form.order),
      };

      if (editId) {
        await API.put(`/admin/intro-screens/${editId}`, payload);
      } else {
        await API.post("/admin/intro-screens", payload);
      }

      handleCloseModal();
      fetchIntroScreens();
    } catch (err) {
      console.error("Submit error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to save intro screen.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, title) => {
    showConfirm({
      title: "Delete Intro Screen",
      message: `Are you sure you want to permanently delete intro screen "${title || 'Untitled'}"?`,
      type: "danger",
      confirmText: "Delete Screen",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await API.delete(`/admin/intro-screens/${id}`);
          fetchIntroScreens();
        } catch (err) {
          console.error("Delete error:", err);
          showAlert("Error", "Failed to delete intro screen.");
        }
      }
    });
  };

  const handleMoveOrder = async (index, direction) => {
    const newScreens = [...introScreens];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newScreens.length) return;

    // Swap order values
    const tempOrder = newScreens[index].order;
    newScreens[index].order = newScreens[targetIndex].order;
    newScreens[targetIndex].order = tempOrder;

    // Local optimistic update
    setIntroScreens([...newScreens].sort((a, b) => a.order - b.order));

    try {
      const items = newScreens.map((s) => ({ id: s._id, order: s.order }));
      await API.patch("/admin/intro-screens/reorder", { items });
    } catch (err) {
      console.error("Reorder error:", err);
      showAlert("Reorder Error", "Failed to save reordered screens.");
      fetchIntroScreens();
    }
  };

  const filteredScreens = introScreens.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.title || "").toLowerCase().includes(q) || (s.image || "").toLowerCase().includes(q);
  });

  const maxOrder = introScreens.length > 0 ? Math.max(...introScreens.map(s => s.order || 0)) : 0;

  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Smartphone className="pg-title-icon" size={20} /> 
            App Intro Screens
          </h1>
          <p className="pg-sub">Manage mobile onboarding screen banners, title messaging, and sequence order</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            className="btn btn-ghost" 
            onClick={fetchIntroScreens} 
            disabled={fetching}
            title="Refresh Intro Screens"
            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
          >
            <RefreshCw size={14} className={fetching ? "spin-icon" : ""} /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenAddModal}
            style={{ padding: "6px 14px", fontSize: "0.78rem" }}
          >
            <Plus size={14} /> Add Intro Screen
          </button>
        </div>
      </div>

      {/* 3-Card Symmetrical KPI Grid */}
      <div className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Intro Screens</span>
            <div className="kpi-icon-badge icon-indigo">
              <Smartphone size={15} />
            </div>
          </div>
          <div className="kpi-value">{introScreens.length.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Mobile app onboarding slides
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Sequence Steps</span>
            <div className="kpi-icon-badge icon-emerald">
              <List size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>{maxOrder}</div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Total step order count
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Onboarding Module</span>
            <div className="kpi-icon-badge icon-amber">
              <Eye size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--primary)" }}>
            {introScreens.length > 0 ? "Active" : "Empty"}
          </div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Mobile walkthrough status
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search intro screens by title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.84rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Segmented Switch */}
            <div className="segmented-switch">
              {[
                { value: "grid", label: "Grid Cards", icon: LayoutGrid },
                { value: "table", label: "Table List", icon: List },
              ].map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`segmented-switch-btn ${viewMode === opt.value ? "active" : ""}`}
                    onClick={() => setViewMode(opt.value)}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {viewMode === opt.value && (
                      <motion.div
                        layoutId="activeIntroViewModePill"
                        className="segmented-switch-active-bg"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="segmented-switch-btn-text" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <IconComponent size={13} /> {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Display Area */}
        {introScreens.length === 0 ? (
          /* Empty State */
          <div className="intro-empty-state">
            <div className="intro-empty-icon">
              <Smartphone size={28} />
            </div>
            <div className="intro-empty-title">No Intro Screens Created Yet</div>
            <div className="intro-empty-sub">
              Add onboarding screen banners to showcase app features when users launch the mobile app.
            </div>
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ marginTop: 16, padding: "6px 16px", fontSize: "0.82rem" }}
            >
              <Plus size={14} /> Create First Screen
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid Cards View */
          <div className="intro-grid">
            {filteredScreens.map((screen, index) => (
              <div className="intro-card" key={screen._id}>
                {/* Order Badge */}
                <div className="intro-order-badge">#{screen.order}</div>

                {/* Image Preview Container */}
                <div className="intro-card-img-wrap">
                  <img
                    src={screen.image}
                    alt={screen.title || `Intro Screen ${screen.order}`}
                    className="intro-card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/300x500?text=Invalid+Image+URL";
                    }}
                  />
                  <div className="intro-card-overlay" />

                  {/* Card Quick Actions */}
                  <div className="intro-quick-actions">
                    {/* Order Shift Arrows */}
                    <div className="order-arrows-wrap">
                      <button
                        className="arrow-btn"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, "up")}
                        title="Move Step Up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        className="arrow-btn"
                        disabled={index === introScreens.length - 1}
                        onClick={() => handleMoveOrder(index, "down")}
                        title="Move Step Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Action Icon Buttons */}
                    <div className="action-btns-wrap">
                      <button
                        className="btn-card-action view"
                        onClick={() => setPreviewScreen(screen)}
                        title="Preview Mobile Screen Mockup"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-card-action edit"
                        onClick={() => handleOpenEditModal(screen)}
                        title="Edit Screen Details"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-card-action delete"
                        onClick={() => handleDelete(screen._id, screen.title)}
                        title="Delete Intro Screen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Title & URL Body */}
                <div className="intro-card-body">
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)", marginBottom: 2 }}>
                    {screen.title}
                  </div>
                  <div className="intro-url-text" title={screen.image}>
                    {screen.image}
                  </div>
                </div>
              </div>
            ))}

            {filteredScreens.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No intro screens matching "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="tbl-wrap">
            <table className="tbl tbl-categories" style={{ tableLayout: "fixed", minWidth: "760px" }}>
              <thead>
                <tr>
                  <th style={{ width: "95px", textAlign: "center" }}># ORDER</th>
                  <th style={{ width: "80px", textAlign: "center" }}>PREVIEW</th>
                  <th style={{ width: "220px" }}>TITLE</th>
                  <th>IMAGE URL</th>
                  <th style={{ width: "150px", textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredScreens.map((screen, index) => (
                  <tr key={screen._id}>
                    {/* Order Controls */}
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.88rem" }}>
                          #{screen.order}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button
                            className="icon-btn"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(index, "up")}
                            title="Move Up"
                            style={{ width: 22, height: 22, opacity: index === 0 ? 0.3 : 1 }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            className="icon-btn"
                            disabled={index === introScreens.length - 1}
                            onClick={() => handleMoveOrder(index, "down")}
                            title="Move Down"
                            style={{ width: 22, height: 22, opacity: index === introScreens.length - 1 ? 0.3 : 1 }}
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Image Thumbnail */}
                    <td style={{ textAlign: "center" }}>
                      {screen.image ? (
                        <img
                          src={screen.image}
                          alt={screen.title || `Intro Screen ${screen.order}`}
                          style={{
                            width: "36px",
                            height: "56px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "#000",
                            display: "inline-block",
                            verticalAlign: "middle"
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/100x150?text=No+Img";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "36px",
                            height: "56px",
                            borderRadius: "6px",
                            background: "var(--bg3)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)"
                          }}
                        >
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>
                      {screen.title}
                    </td>

                    {/* Image URL */}
                    <td>
                      <span className="cat-slug-badge" title={screen.image} style={{ maxWidth: "340px" }}>
                        {screen.image}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "center" }}>
                      <div className="tbl-actions" style={{ justifyContent: "center", gap: "6px" }}>
                        <button
                          className="icon-btn view"
                          onClick={() => setPreviewScreen(screen)}
                          title="Preview Mobile Screen Mockup"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="icon-btn edit"
                          onClick={() => handleOpenEditModal(screen)}
                          title="Edit Screen Details"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(screen._id, screen.title)}
                          title="Delete Intro Screen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredScreens.length === 0 && (
                  <tr>
                    <td colSpan="5" className="tbl-placeholder">
                      {searchQuery ? `No intro screens matching "${searchQuery}"` : "No intro screens found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enhanced Add / Edit Intro Screen Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <motion.div
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "480px", padding: 0, overflow: "hidden" }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
            >
              {/* Header with Icon Avatar */}
              <div className="modal-head" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "10px",
                    background: "rgba(255, 209, 26, 0.12)", color: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(255, 209, 26, 0.2)",
                    flexShrink: 0
                  }}>
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
                      {editId ? "Edit Intro Screen" : "Add New Intro Screen"}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      Configure mobile app onboarding slide title & banner URL
                    </p>
                  </div>
                </div>
                <button className="modal-close" onClick={handleCloseModal}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ padding: "20px 22px" }}>
                  {/* Title Input */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Screen Title <span style={{ color: "var(--primary)" }}>*</span>
                    </label>
                    <div className="form-input-group">
                      <Type size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="e.g. Unlimited Movies & Series"
                        value={form.title}
                        onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {/* Banner Image URL Input */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Banner Image URL <span style={{ color: "var(--primary)" }}>*</span>
                    </label>
                    <div className="form-input-group">
                      <LinkIcon size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="https://example.com/intro-screen-1.png"
                        value={form.image}
                        onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Enhanced Live Image Preview Card */}
                    {form.image ? (
                      <div className="intro-modal-preview-card">
                        <div className="intro-modal-preview-header">
                          <span className="intro-modal-preview-tag">
                            <Eye size={11} /> LIVE PREVIEW
                          </span>
                          <button
                            type="button"
                            className="intro-modal-clear-btn"
                            onClick={() => setForm(p => ({ ...p, image: "" }))}
                            title="Clear Image URL"
                          >
                            <X size={12} /> Clear
                          </button>
                        </div>
                        <div className="intro-modal-preview-body">
                          <img
                            src={form.image}
                            alt="Screen Banner Preview"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="intro-preview-fallback" style={{ display: "none" }}>
                            <ImageIcon size={22} style={{ color: "var(--text-muted)", marginBottom: 4 }} />
                            <span>Preview placeholder (paste direct image link)</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Display Order Input */}
                  <div className="form-group" style={{ marginBottom: "6px" }}>
                    <label className="form-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Sequence Step Order
                    </label>
                    <div className="form-input-group">
                      <Hash size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <input
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm(p => ({ ...p, order: e.target.value }))}
                        min="1"
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                      Lower order numbers appear first in the mobile app onboarding walkthrough.
                    </p>
                  </div>
                </div>

                <div className="modal-foot" style={{ padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
                  <button type="button" className="btn btn-ghost" onClick={handleCloseModal} style={{ padding: "8px 18px", fontSize: "0.84rem" }}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading || !form.title.trim() || !form.image.trim()}
                    style={{ padding: "8px 22px", fontSize: "0.84rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Sparkles size={14} />
                    {loading ? "Saving..." : (editId ? "Save Changes" : "Create Screen")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Realistic Smartphone Mockup Preview Modal */}
      <AnimatePresence>
        {previewScreen && (
          <div className="modal-overlay" onClick={() => setPreviewScreen(null)} style={{ backdropFilter: "blur(10px)", background: "rgba(0, 0, 0, 0.75)" }}>
            <motion.div
              className="intro-phone-wrapper"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
            >
              {/* Floating Close Button */}
              <button
                className="intro-phone-close"
                onClick={() => setPreviewScreen(null)}
                title="Close Mobile Preview"
              >
                <X size={16} />
              </button>

              {/* Phone Mockup Frame */}
              <div className="intro-phone-mockup">
                {/* Status Bar & Dynamic Island Notch */}
                <div className="intro-phone-statusbar">
                  <span>9:41</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Signal size={12} />
                    <Wifi size={12} />
                    <Battery size={14} />
                  </div>
                </div>
                <div className="intro-phone-notch">
                  <div className="intro-phone-camera" />
                  <div className="intro-phone-speaker" />
                </div>

                {/* Screen Body */}
                <div className="intro-phone-screen">
                  <img
                    src={previewScreen.image}
                    alt={previewScreen.title}
                    className="intro-phone-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/340x560?text=Invalid+Image+URL";
                    }}
                  />

                  {/* Step Tag */}
                  <div className="intro-order-badge" style={{ top: 40, left: 14 }}>
                    STEP #{previewScreen.order}
                  </div>

                  {/* Title & Carousel Overlay */}
                  <div className="intro-phone-overlay">
                    <h3 className="intro-phone-title">
                      {previewScreen.title}
                    </h3>

                    {/* Carousel Page Dots */}
                    <div className="intro-phone-dots">
                      {introScreens.map((s, i) => (
                        <div
                          key={s._id || i}
                          className={`intro-phone-dot ${s._id === previewScreen._id ? "active" : ""}`}
                        />
                      ))}
                    </div>

                    {/* Phone Home Bar */}
                    <div className="intro-phone-homebar" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation & Alert Dialog */}
      {dialog.isOpen && (
        <div className="modal-overlay" onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: dialog.type === "danger" ? "rgba(244, 63, 94, 0.12)" : "rgba(255, 209, 26, 0.14)",
                color: dialog.type === "danger" ? "#F43F5E" : "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                {dialog.type === "danger" ? <Trash2 size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>{dialog.title}</h3>
              </div>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {dialog.message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {dialog.showCancel && (
                <button className="btn btn-ghost" onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}>
                  {dialog.cancelText || "Cancel"}
                </button>
              )}
              <button
                className="btn"
                style={{
                  background: dialog.type === "danger" ? "#F43F5E" : "var(--primary)",
                  color: dialog.type === "danger" ? "#fff" : "#000",
                  fontWeight: 600
                }}
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  setDialog(prev => ({ ...prev, isOpen: false }));
                }}
              >
                {dialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
