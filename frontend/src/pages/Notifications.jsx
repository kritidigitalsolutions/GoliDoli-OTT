import { useState, useEffect, useCallback } from "react";
import { Bell, Send, X, Trash2, Eye, RefreshCw, Film, Tv, Video, CreditCard } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";

// ── Type badge colours ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  GENERAL: { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  SYSTEM: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  PLAN: { bg: "rgba(139,92,246,0.15)", color: "#8b5cf6" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
};

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "GENERAL",
  sendTo: "All Users",
  userSearch: "",
  actionUrl: "",
  imageUrl: "",
};

// ── sendTo value → backend targetUserType mapping ─────────────────────────
const SEND_TO_MAP = {
  "All Users": "ALL",
  "Subscribers Only": "SUBSCRIBERS",
  "Non-Subscribers": "NON_SUBSCRIBERS",
  "Expiring Soon": "EXPIRING_SOON",
  "Specific User": "SPECIFIC_USER",
};

// ── Helper: resolve display target from a notification doc ─────────────────
const resolveTarget = (n) => {
  if (n.targetUser) return n.targetUser?.name || n.targetUser?.email || "Specific User";
  if (n.targetUserType) return n.targetUserType === "ALL" ? "All Users" : n.targetUserType;
  return "All Users";
};

export default function NotificationsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewNotif, setViewNotif] = useState(null); // the notification being viewed

  // ── Attachment state ──────────────────────────────────────────────────
  const [attachmentType, setAttachmentType] = useState("none"); // "none" | "content" | "plan"
  const [linkContentType, setLinkContentType] = useState("movie"); // "movie" | "series" | "microdrama"
  const [contentSearch, setContentSearch] = useState("");
  const [contentDropOpen, setContentDropOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ── Resource lists ───────────────────────────────────────────────────
  const [movies, setMovies] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [microdramas, setMicrodramas] = useState([]);
  const [plans, setPlans] = useState([]);

  // ── Toast helper ──────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch notifications from backend ──────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/notifications/");
      setNotifications(res.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load notifications.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Fetch users for searchable dropdown ───────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users || res.data.data || []);
    } catch {
      // Non-critical — fallback to empty list
    }
  }, []);

  // ── Fetch media content & plans for attachments ───────────────────────
  const fetchResources = useCallback(async () => {
    try {
      const [movRes, serRes, micRes, planRes] = await Promise.allSettled([
        API.get("/admin/movies?limit=1000"),
        API.get("/admin/series?limit=1000"),
        API.get("/admin/microdramas?limit=1000"),
        API.get("/admin/plan"),
      ]);

      if (movRes.status === "fulfilled") {
        setMovies(movRes.value.data.movies || []);
      }
      if (serRes.status === "fulfilled") {
        setSeriesList(serRes.value.data.series || []);
      }
      if (micRes.status === "fulfilled") {
        setMicrodramas(micRes.value.data.microdramas || micRes.value.data.tvShows || []);
      }
      if (planRes.status === "fulfilled") {
        setPlans(planRes.value.data.plans || planRes.value.data.data || []);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    fetchResources();
  }, [fetchNotifications, fetchUsers, fetchResources]);

  // ── Form input change ─────────────────────────────────────────────────
  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Filtered user list ────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.phone || "").includes(form.userSearch)
  );

  // ── Filtered content list based on linkContentType ────────────────────
  const getActiveContentList = () => {
    if (linkContentType === "movie") return movies;
    if (linkContentType === "series") return seriesList;
    if (linkContentType === "microdrama") return microdramas;
    return [];
  };

  const filteredContent = getActiveContentList().filter((item) =>
    (item.title || "").toLowerCase().includes(contentSearch.toLowerCase())
  );

  // ── Send notification ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Please fill in title and message.", "error");
      return;
    }
    if (form.sendTo === "Specific User" && !selectedUser) {
      showToast("Please select a specific user.", "error");
      return;
    }
    if (attachmentType === "content" && !selectedContent) {
      showToast("Please select the content to link.", "error");
      return;
    }
    if (attachmentType === "plan" && !selectedPlan) {
      showToast("Please select the subscription plan.", "error");
      return;
    }

    setLoading(true);
    try {
      let resolvedActionUrl = form.actionUrl.trim() || undefined;
      let resolvedImageUrl = form.imageUrl.trim() || undefined;

      if (attachmentType === "content" && selectedContent) {
        if (!resolvedActionUrl) {
          const prefix = linkContentType === "movie" ? "movies" : linkContentType === "series" ? "series" : "microdramas";
          resolvedActionUrl = `golidoli://${prefix}/id/${selectedContent._id}`;
        }
        if (!resolvedImageUrl) {
          resolvedImageUrl = selectedContent.poster || selectedContent.banner || undefined;
        }
      } else if (attachmentType === "plan" && selectedPlan) {
        if (!resolvedActionUrl) {
          resolvedActionUrl = `golidoli://plans/id/${selectedPlan._id}`;
        }
      }

      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        sendTo: SEND_TO_MAP[form.sendTo] || "ALL",
        actionUrl: resolvedActionUrl,
        imageUrl: resolvedImageUrl,
        attachmentType,
        contentType: attachmentType === "content" ? linkContentType : (attachmentType === "plan" ? "plan" : undefined),
        contentId: attachmentType === "content" && selectedContent ? selectedContent._id : undefined,
        planId: attachmentType === "plan" && selectedPlan ? selectedPlan._id : undefined,
        ...(form.sendTo === "Specific User" && selectedUser
          ? { targetUser: selectedUser._id || selectedUser.id }
          : {}),
      };

      await API.post("/admin/notifications/send", payload);

      showToast("Notification sent successfully! 🎉");
      handleClear();
      fetchNotifications(); // refresh table
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Clear form ────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelectedUser(null);
    setAttachmentType("none");
    setSelectedContent(null);
    setSelectedPlan(null);
    setContentSearch("");
    setContentDropOpen(false);
  };

  // ── Delete notification ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await API.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast("Notification deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed.", "error");
    }
  };

  // ── View notification & Mark as Read ───────────────────────────────────
  const handleView = async (notif) => {
    setViewNotif(notif);
    if (!notif.isRead) {
      try {
        await API.patch(`/admin/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="add-content-page notif-page">

      {/* ── Toast ── */}
      {toast && (
        <div className={`notif-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon"><Bell size={26} /></span>
            Notifications
          </h1>
          <p className="pg-sub">Send and manage user notifications</p>
        </div>

        <div className="notif-stats-row">
          <div className="notif-stat-chip">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Total Sent</span>
          </div>
          <div className="notif-stat-chip s-green">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Delivered</span>
          </div>
          <div className="notif-stat-chip s-red">
            <span className="notif-stat-val">0</span>
            <span className="notif-stat-lbl">Failed</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SEND FORM ═══════════════════════ */}
      <form onSubmit={handleSend}>
        <div className="form-card notif-card">
          <h3>
            <span className="notif-card-icon"><Send size={16} /></span>
            Send Notification
          </h3>

          {/* Title */}
          <div className="notif-field-group">
            <label className="notif-label">Notification Title</label>
            <input
              className="form-input-styled notif-input"
              name="title"
              placeholder="Enter notification title"
              value={form.title}
              onChange={ch}
            />
          </div>

          {/* Message */}
          <div className="notif-field-group">
            <label className="notif-label">Message</label>
            <textarea
              className="form-input-styled notif-input notif-textarea"
              name="message"
              placeholder="Write notification message..."
              value={form.message}
              onChange={ch}
              rows={4}
            />
          </div>

          {/* Image URL (Optional - Auto-resolved if Content attached) */}
          <div className="notif-field-group">
            <label className="notif-label">
              Image URL <span className="notif-optional">(Optional - Auto-resolved if Content attached)</span>
            </label>
            <input
              className="form-input-styled notif-input"
              name="imageUrl"
              placeholder="https://example.com/image.jpg or poster URL"
              value={form.imageUrl}
              onChange={ch}
            />
          </div>

          {/* Image Preview if provided or from selected content */}
          {(form.imageUrl || (selectedContent && (selectedContent.poster || selectedContent.banner))) && (
            <div className="notif-field-group" style={{ marginTop: "-6px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                {form.imageUrl ? "Custom Image Preview:" : "Auto-attached Content Poster:"}
              </div>
              <div style={{ maxWidth: "220px", maxHeight: "120px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
                <img
                  src={form.imageUrl || selectedContent.poster || selectedContent.banner}
                  alt="Notification Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {/* Type + Send To */}
          <div className="notif-2col">
            <div className="notif-field-group">
              <label className="notif-label">Type</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="type"
                value={form.type}
                onChange={ch}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="PLAN">PLAN</option>
                <option value="PROMOTIONAL">PROMOTIONAL</option>
              </select>
            </div>

            <div className="notif-field-group">
              <label className="notif-label">Send To</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="sendTo"
                value={form.sendTo}
                onChange={(e) => {
                  ch(e);
                  setSelectedUser(null);
                  setUserDropOpen(false);
                }}
              >
                <option value="All Users">All Users</option>
                <option value="Subscribers Only">Subscribers Only</option>
                <option value="Non-Subscribers">Non-Subscribers</option>
                <option value="Expiring Soon">Expiring Soon (Next 7 Days)</option>
                <option value="Specific User">Specific User</option>
              </select>
            </div>
          </div>

          {/* Specific User search (conditional) */}
          {form.sendTo === "Specific User" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Search User</label>
              <div className="notif-user-search-wrap">
                <input
                  className="form-input-styled notif-input"
                  name="userSearch"
                  placeholder="Search by name / email / phone"
                  value={selectedUser ? (selectedUser.name || selectedUser.email) : form.userSearch}
                  onChange={(e) => {
                    if (selectedUser) setSelectedUser(null);
                    setForm({ ...form, userSearch: e.target.value });
                    setUserDropOpen(true);
                  }}
                  onFocus={() => setUserDropOpen(true)}
                  autoComplete="off"
                />
                {selectedUser && (
                  <button
                    type="button"
                    className="notif-user-clear"
                    onClick={() => { setSelectedUser(null); setForm({ ...form, userSearch: "" }); }}
                  >
                    <X size={14} />
                  </button>
                )}

                {userDropOpen && !selectedUser && (
                  <div className="notif-user-dropdown">
                    {filteredUsers.length === 0 ? (
                      <div className="notif-user-empty">No users found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u._id || u.id}
                          className="notif-user-option"
                          onMouseDown={() => {
                            setSelectedUser(u);
                            setUserDropOpen(false);
                            setForm({ ...form, userSearch: u.name || u.email });
                          }}
                        >
                          <div className="notif-user-avatar">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="notif-user-name">{u.name || "—"}</div>
                            <div className="notif-user-meta">
                              {u.email}{u.phone ? ` · ${u.phone}` : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ ATTACHMENT TYPE ════════════ */}
          <div className="notif-field-group">
            <label className="notif-label">Attachment Type</label>
            <div className="notif-radio-row">
              <label className="notif-radio-label">
                <input
                  type="radio"
                  name="attachmentType"
                  value="none"
                  checked={attachmentType === "none"}
                  onChange={() => {
                    setAttachmentType("none");
                    setSelectedContent(null);
                    setSelectedPlan(null);
                  }}
                />
                None
              </label>

              <label className="notif-radio-label">
                <input
                  type="radio"
                  name="attachmentType"
                  value="content"
                  checked={attachmentType === "content"}
                  onChange={() => {
                    setAttachmentType("content");
                    setSelectedPlan(null);
                  }}
                />
                Content
              </label>

              <label className="notif-radio-label">
                <input
                  type="radio"
                  name="attachmentType"
                  value="plan"
                  checked={attachmentType === "plan"}
                  onChange={() => {
                    setAttachmentType("plan");
                    setSelectedContent(null);
                  }}
                />
                Subscription Plan
              </label>
            </div>
          </div>

          {/* ── Content Attachment Controls (When Content is chosen) ── */}
          {attachmentType === "content" && (
            <div className="notif-fade-in" style={{ marginBottom: "18px" }}>
              <div className="notif-field-group">
                <label className="notif-label">Link to Content</label>
                <select
                  className="form-input-styled notif-input notif-select"
                  value={linkContentType}
                  onChange={(e) => {
                    setLinkContentType(e.target.value);
                    setSelectedContent(null);
                    setContentSearch("");
                  }}
                >
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                  <option value="microdrama">Microdrama</option>
                </select>
              </div>

              {/* Search Movie / Series / Microdrama */}
              <div className="notif-field-group">
                <label className="notif-label">
                  Search {linkContentType === "movie" ? "Movie" : linkContentType === "series" ? "Series" : "Microdrama"}
                </label>
                <div className="notif-user-search-wrap">
                  <input
                    className="form-input-styled notif-input"
                    placeholder={`Search ${linkContentType} name...`}
                    value={selectedContent ? selectedContent.title : contentSearch}
                    onChange={(e) => {
                      if (selectedContent) setSelectedContent(null);
                      setContentSearch(e.target.value);
                      setContentDropOpen(true);
                    }}
                    onFocus={() => setContentDropOpen(true)}
                    autoComplete="off"
                  />
                  {selectedContent && (
                    <button
                      type="button"
                      className="notif-user-clear"
                      onClick={() => {
                        setSelectedContent(null);
                        setContentSearch("");
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}

                  {contentDropOpen && !selectedContent && (
                    <div className="notif-user-dropdown">
                      {filteredContent.length === 0 ? (
                        <div className="notif-user-empty">No matching {linkContentType} found</div>
                      ) : (
                        filteredContent.map((item) => (
                          <div
                            key={item._id}
                            className="notif-user-option"
                            onMouseDown={() => {
                              setSelectedContent(item);
                              setContentDropOpen(false);
                              setContentSearch(item.title);
                            }}
                          >
                            {item.poster || item.banner ? (
                              <img
                                src={item.poster || item.banner}
                                alt={item.title}
                                className="notif-content-thumb"
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            ) : (
                              <div className="notif-user-avatar">
                                {linkContentType === "movie" ? <Film size={16} /> : <Tv size={16} />}
                              </div>
                            )}
                            <div>
                              <div className="notif-user-name">{item.title}</div>
                              <div className="notif-user-meta">
                                {item.releaseYear ? `${item.releaseYear} · ` : ""}
                                {item.genre && Array.isArray(item.genre) ? item.genre.join(", ") : ""}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Plan Attachment Controls (When Plan is chosen) ── */}
          {attachmentType === "plan" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Select Subscription Plan</label>
              <select
                className="form-input-styled notif-input notif-select"
                value={selectedPlan ? selectedPlan._id : ""}
                onChange={(e) => {
                  const p = plans.find((pl) => pl._id === e.target.value);
                  setSelectedPlan(p || null);
                }}
              >
                <option value="">-- Choose Plan --</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (₹{p.price || 0} / {p.duration || "month"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="notif-btn-row">
            <button
              type="submit"
              className="btn-lg notif-send-btn"
              disabled={loading}
            >
              {loading ? <span className="notif-spinner" /> : <Send size={16} />}
              {loading ? "Sending..." : "Send Notification"}
            </button>

            <button
              type="button"
              className="btn notif-clear-btn"
              onClick={handleClear}
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════════════ RECENT TABLE ═══════════════════════ */}
      <div className="content-box">
        <h3>
          <span className="notif-card-icon" style={{ color: "var(--orange)" }}>
            <Bell size={16} />
          </span>
          Recent Notifications
          <span className="notif-count-badge">{notifications.length}</span>

          {/* Refresh button */}
          <button
            type="button"
            className="notif-refresh-btn"
            onClick={fetchNotifications}
            title="Refresh list"
            disabled={fetching}
          >
            <RefreshCw size={13} className={fetching ? "notif-spin" : ""} />
          </button>
        </h3>

        {fetching ? (
          <div className="notif-loading">
            <span className="notif-spinner" /> Loading notifications...
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                      No notifications sent yet.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => {
                    const badge = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;
                    return (
                      <tr key={n._id}>
                        <td>
                          <span className="notif-row-title">{n.title}</span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {n.type || "GENERAL"}
                          </span>
                        </td>
                        <td>
                          <span className="notif-target">{resolveTarget(n)}</span>
                        </td>
                        <td>
                          <span className="notif-date">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${n.isRead ? "b-green" : "b-yellow"}`}>
                            {n.isRead ? "READ" : "UNREAD"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="action-btn"
                              title="View details"
                              onClick={() => handleView(n)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="action-btn text-danger"
                              title="Delete notification"
                              onClick={() => handleDelete(n._id)}
                            >
                              <Trash2 size={15} />
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
        )}
      </div>

      {/* ═══════════════════════ VIEW MODAL ═══════════════════════ */}
      {viewNotif && (
        <div className="notif-modal-backdrop" onClick={() => setViewNotif(null)}>
          <div
            className="notif-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notif-modal-header">
              <h3>
                <span className="notif-card-icon"><Bell size={16} /></span>
                Notification Details
              </h3>
              <button
                className="notif-modal-close"
                onClick={() => setViewNotif(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="notif-modal-body">
              <div className="notif-modal-chip-row">
                <span
                  className="badge"
                  style={{
                    background: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).bg,
                    color: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).color,
                  }}
                >
                  {viewNotif.type}
                </span>
                {viewNotif.category && (
                  <span className="badge b-purple">{viewNotif.category}</span>
                )}
              </div>

              <h4 className="notif-modal-title">{viewNotif.title}</h4>
              <p className="notif-modal-date">
                Sent on{" "}
                {viewNotif.createdAt
                  ? new Date(viewNotif.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "—"}
              </p>

              {viewNotif.imageUrl && (
                <div className="notif-modal-img-wrap">
                  <img
                    src={viewNotif.imageUrl}
                    alt={viewNotif.title}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}

              <div className="notif-modal-msg">{viewNotif.message}</div>

              <div className="notif-modal-meta-grid">
                <div>
                  <label>TARGET USER(S)</label>
                  <span>{resolveTarget(viewNotif)}</span>
                </div>
                {viewNotif.metadata?.actionUrl && (
                  <div>
                    <label>ACTION URL</label>
                    <span className="notif-modal-url">{viewNotif.metadata.actionUrl}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="notif-modal-footer">
              <button
                className="btn btn-sm notif-clear-btn"
                onClick={() => setViewNotif(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
