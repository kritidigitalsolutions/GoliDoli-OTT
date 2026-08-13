import { useState, useEffect } from "react";
import {
  Smartphone,
  Pencil,
  Trash2,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  List
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./IntroScreens.css";

export default function IntroScreensPage() {
  const [introScreens, setIntroScreens] = useState([]);
  const [fetching, setFetching] = useState(true);
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

  // Success / Error Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchIntroScreens = async () => {
    try {
      const res = await API.get("/admin/intro-screens");
      const data = res.data.data || [];
      setIntroScreens(data);
    } catch (err) {
      console.error("Fetch intro screens error:", err);
      setError("Failed to fetch intro screens.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchIntroScreens();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenAddModal = () => {
    setMessage("");
    setError("");
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
    setMessage("");
    setError("");
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
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        title: form.title,
        image: form.image,
        order: Number(form.order),
      };

      if (editId) {
        const res = await API.put(`/admin/intro-screens/${editId}`, payload);
        setMessage(res.data.message || "Intro screen updated successfully.");
      } else {
        const res = await API.post("/admin/intro-screens", payload);
        setMessage(res.data.message || "Intro screen created successfully.");
      }

      handleCloseModal();
      fetchIntroScreens();
    } catch (err) {
      console.error("Submit error:", err);
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this intro screen?"))
      return;

    try {
      await API.delete(`/admin/intro-screens/${id}`);
      setMessage("Intro screen deleted successfully.");
      fetchIntroScreens();
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete intro screen.");
    }
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
      setError("Failed to save reordered screens.");
      fetchIntroScreens();
    }
  };

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
          Loading Intro Screens...
        </p>
      </div>
    );
  }

  return (
    <div className="intro-screens-container">
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
          <div className="intro-header-badge">
            <Smartphone size={14} /> Mobile Onboarding Module
          </div>
          <h1 className="pg-title">
            App Intro Screens
          </h1>
          <p className="pg-sub">
            Manage onboarding screen titles, images, and sequence order
          </p>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={18} /> Add Intro Screen
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
          Total Intro Screens:{" "}
          <span className="intro-stats-count">{introScreens.length}</span>
        </div>

        <div className="view-toggle-group">
          <button
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid size={16} /> Grid Cards
          </button>
          <button
            className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <List size={16} /> Table List
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {introScreens.length === 0 ? (
        /* Empty State */
        <div className="intro-empty-state">
          <div className="intro-empty-icon">
            <Smartphone size={32} />
          </div>
          <div className="intro-empty-title">No intro screens created yet</div>
          <div className="intro-empty-sub">
            Add intro screens to show new users onboarding banners when they open the mobile app.
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="intro-grid">
          {introScreens.map((screen, index) => (
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
                    e.target.src =
                      "https://via.placeholder.com/300x500?text=Invalid+Image+URL";
                  }}
                />
                <div className="intro-card-overlay" />

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
                      disabled={index === introScreens.length - 1}
                      onClick={() => handleMoveOrder(index, "down")}
                      title="Move Down in Order"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="action-btns-wrap">
                    <button
                      className="btn-card-action view"
                      onClick={() => setPreviewScreen(screen)}
                      title="Preview Mobile Screen"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="btn-card-action edit"
                      onClick={() => handleOpenEditModal(screen)}
                      title="Edit Screen"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn-card-action delete"
                      onClick={() => handleDelete(screen._id)}
                      title="Delete Screen"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer / Title & URL info */}
              <div className="intro-card-body">
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: 2 }}>
                  {screen.title}
                </div>
                <div className="intro-url-text" title={screen.image}>
                  {screen.image}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="content-box">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>Display Order</th>
                  <th style={{ width: "120px" }}>Image Preview</th>
                  <th>Title</th>
                  <th>Image URL</th>
                  <th style={{ width: "160px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {introScreens.map((screen, index) => (
                  <tr key={screen._id}>
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
                          #{screen.order}
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
                            disabled={index === introScreens.length - 1}
                            onClick={() => handleMoveOrder(index, "down")}
                            title="Move Down"
                            style={{
                              padding: "2px",
                              opacity:
                                index === introScreens.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Image Thumbnail */}
                    <td>
                      {screen.image ? (
                        <img
                          src={screen.image}
                          alt={screen.title || `Intro Screen ${screen.order}`}
                          style={{
                            width: "50px",
                            height: "75px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: "#000",
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://via.placeholder.com/100x150?text=No+Image";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "75px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td style={{ fontWeight: 700, color: "var(--text)" }}>
                      {screen.title}
                    </td>

                    {/* Image URL */}
                    <td>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.88rem",
                          color: "var(--text-soft)",
                          wordBreak: "break-all",
                        }}
                      >
                        {screen.image}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div
                        className="tbl-actions"
                        style={{ justifyContent: "center" }}
                      >
                        <button
                          className="icon-btn"
                          onClick={() => setPreviewScreen(screen)}
                          title="Preview Mobile Screen"
                          style={{ color: "#3b82f6" }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-btn edit"
                          onClick={() => handleOpenEditModal(screen)}
                          title="Edit Intro Screen"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(screen._id)}
                          title="Delete Intro Screen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal (Add / Edit) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <h3>
                {editId ? "✏️ Edit Intro Screen" : "📱 Add New Intro Screen"}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body"
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                {/* Title */}
                <div className="form-row">
                  <label
                    className="form-label"
                    style={{ fontWeight: 600, marginBottom: 6, display: "block" }}
                  >
                    Title <span style={{ color: "#ff4757" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    name="title"
                    placeholder="e.g. Welcome to GoliDoli OTT"
                    value={form.title}
                    onChange={handleChange}
                    required
                    style={{ width: "100%", padding: "10px 14px" }}
                  />
                </div>

                {/* Image URL */}
                <div className="form-row">
                  <label
                    className="form-label"
                    style={{ fontWeight: 600, marginBottom: 6, display: "block" }}
                  >
                    Image URL <span style={{ color: "#ff4757" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    name="image"
                    placeholder="https://example.com/intro-screen-1.png"
                    value={form.image}
                    onChange={handleChange}
                    required
                    style={{ width: "100%", padding: "10px 14px" }}
                  />
                  {form.image && (
                    <div className="intro-modal-preview">
                      <img
                        src={form.image}
                        alt="Preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Display Order */}
                <div className="form-row">
                  <label
                    className="form-label"
                    style={{ fontWeight: 600, marginBottom: 6, display: "block" }}
                  >
                    Display Order
                  </label>
                  <input
                    className="form-input"
                    name="order"
                    type="number"
                    placeholder="1"
                    value={form.order}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px 14px" }}
                  />
                </div>
              </div>

              <div className="modal-foot" style={{ marginTop: 24 }}>
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
                  disabled={loading}
                  style={{
                    padding: "10px 26px",
                    background: "linear-gradient(135deg, #FF7A1A, #FF4500)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(255, 122, 26, 0.4)",
                  }}
                >
                  {loading
                    ? "Saving..."
                    : editId
                    ? "Save Changes"
                    : "Create Screen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Screen Mockup Preview Modal */}
      {previewScreen && (
        <div className="modal-overlay">
          <div
            className="modal-box"
            style={{
              maxWidth: 340,
              padding: 0,
              borderRadius: "28px",
              background: "#000",
              overflow: "hidden",
              border: "4px solid #222",
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
            }}
          >
            {/* Phone Top Notch */}
            <div
              style={{
                height: "28px",
                background: "#0b0f19",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "90px",
                  height: "10px",
                  background: "#1e293b",
                  borderRadius: "10px",
                }}
              />
              <button
                onClick={() => setPreviewScreen(null)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "4px",
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Screen Body */}
            <div
              style={{
                height: "520px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                background: "#0d1117",
              }}
            >
              {/* Full Image */}
              <img
                src={previewScreen.image}
                alt={previewScreen.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/340x520?text=Invalid+Image+URL";
                }}
              />

              {/* Title Banner Overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "24px 16px 28px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    color: "#fff",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  {previewScreen.title}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
