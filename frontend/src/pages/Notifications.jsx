import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Send,
  X,
  Trash2,
  Eye,
  RefreshCw,
  Film,
  Tv,
  CreditCard,
  Search,
  Sparkles,
  Filter,
  CheckCircle2,
  Users,
  UserCheck,
  ExternalLink,
  Layers,
  Info
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";

// ── Type badge colours (using website color scheme tokens) ─────────────────
const TYPE_COLORS = {
  GENERAL: { bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.25)" },
  SYSTEM: { bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.25)" },
  PLAN: { bg: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6", border: "rgba(139, 92, 246, 0.25)" },
  PROMOTIONAL: { bg: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", border: "rgba(244, 63, 94, 0.25)" },
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
  if (n.targetUserType) {
    if (n.targetUserType === "ALL") return "All Users";
    if (n.targetUserType === "SUBSCRIBERS") return "Subscribers Only";
    if (n.targetUserType === "NON_SUBSCRIBERS") return "Non-Subscribers";
    if (n.targetUserType === "EXPIRING_SOON") return "Expiring Soon";
    return n.targetUserType;
  }
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
  const [viewNotif, setViewNotif] = useState(null);

  // ── Filters & Search for history ─────────────────────────────────────
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
      showToast("Please fill in notification title and message.", "error");
      return;
    }
    if (form.sendTo === "Specific User" && !selectedUser) {
      showToast("Please select a specific target user.", "error");
      return;
    }
    if (attachmentType === "content" && !selectedContent) {
      showToast("Please select the media content to attach.", "error");
      return;
    }
    if (attachmentType === "plan" && !selectedPlan) {
      showToast("Please select a subscription plan.", "error");
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

      showToast("Notification broadcast sent successfully! 🎉");
      handleClear();
      fetchNotifications();
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
    setUserDropOpen(false);
  };

  // ── Delete notification ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification history record?")) return;
    try {
      await API.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast("Notification record deleted.");
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

  // ── Filtered Notifications for History List ─────────────────────────
  const displayedNotifications = notifications.filter((n) => {
    const matchesType = filterType === "ALL" || n.type === filterType;
    const matchesSearch =
      !searchQuery.trim() ||
      (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.message || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      resolveTarget(n).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="add-content-page notif-page">

      {/* ── Toast Alert ── */}
      {toast && (
        <div className={`notif-toast ${toast.type}`}>
          <span className="notif-toast-icon">
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Header Section ── */}
      <div className="pg-header notif-header-banner">
        <div className="notif-header-left">
          <h1 className="pg-title">
            <span className="pg-title-icon brand-gold-icon">
              <Bell size={24} />
            </span>
            Notifications Hub
          </h1>
          <p className="pg-sub">Broadcast targeted announcements, push alerts, and promotion updates to users</p>
        </div>

        <div className="notif-stats-row">
          <div className="notif-stat-chip">
            <span className="notif-stat-val">{notifications.length}</span>
            <span className="notif-stat-lbl">Total Broadcasts</span>
          </div>
          <div className="notif-stat-chip s-green">
            <span className="notif-stat-val">{notifications.length - unreadCount}</span>
            <span className="notif-stat-lbl">Read / Opened</span>
          </div>
          <div className="notif-stat-chip s-gold">
            <span className="notif-stat-val">{unreadCount}</span>
            <span className="notif-stat-lbl">Pending / Unread</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SEND FORM CARD ═══════════════════════ */}
      <form onSubmit={handleSend} className="notif-form-wrap">
        <div className="form-card notif-card">
          <div className="notif-card-header">
            <div>
              <h3 className="notif-card-title">
                <span className="notif-card-icon brand-accent">
                  <Send size={16} />
                </span>
                Create & Broadcast Notification
              </h3>
              <p className="notif-card-subtitle">Fill in the details below to dispatch notification alerts</p>
            </div>
          </div>

          <div className="notif-form-grid">
            {/* Title */}
            <div className="notif-field-group notif-col-12">
              <label className="notif-label">
                Notification Title <span className="req-star">*</span>
              </label>
              <input
                className="form-input-styled notif-input"
                name="title"
                placeholder="e.g. New Movie Release: Pathaan HD Now Available!"
                value={form.title}
                onChange={ch}
                maxLength={120}
              />
            </div>

            {/* Message */}
            <div className="notif-field-group notif-col-12">
              <label className="notif-label">
                Notification Message <span className="req-star">*</span>
              </label>
              <textarea
                className="form-input-styled notif-input notif-textarea"
                name="message"
                placeholder="Write clear, engaging notification message for your audience..."
                value={form.message}
                onChange={ch}
                rows={3}
              />
            </div>

            {/* Notification Type Segmented Toggle */}
            <div className="notif-field-group notif-col-12">
              <label className="notif-label">Notification Type</label>
              <div className="segmented-control">
                {[
                  { id: "GENERAL", label: "General" },
                  { id: "SYSTEM", label: "System" },
                  { id: "PLAN", label: "Subscription / Offer" },
                  { id: "PROMOTIONAL", label: "Promotional" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`segmented-item ${form.type === opt.id ? "active" : ""}`}
                    onClick={() => setForm({ ...form, type: opt.id })}
                  >
                    {form.type === opt.id && (
                      <motion.div
                        layoutId="activeNotifTypePill"
                        className="segmented-active-bg"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="segmented-text">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience Segmented Toggle */}
            <div className="notif-field-group notif-col-12">
              <label className="notif-label">Target Audience</label>
              <div className="segmented-control">
                {[
                  { id: "All Users", label: "All Users" },
                  { id: "Subscribers Only", label: "Subscribed" },
                  { id: "Non-Subscribers", label: "Free / Unsubscribed" },
                  { id: "Expiring Soon", label: "Expiring Soon" },
                  { id: "Specific User", label: "Specific User" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`segmented-item ${form.sendTo === opt.id ? "active" : ""}`}
                    onClick={() => {
                      setForm({ ...form, sendTo: opt.id });
                      setSelectedUser(null);
                      setUserDropOpen(false);
                    }}
                  >
                    {form.sendTo === opt.id && (
                      <motion.div
                        layoutId="activeSendToPill"
                        className="segmented-active-bg"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="segmented-text">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="notif-field-group notif-col-6">
              <label className="notif-label">Notification Type</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="type"
                value={form.type}
                onChange={ch}
              >
                <option value="GENERAL">📢 GENERAL (Standard Broadcast)</option>
                <option value="SYSTEM">⚙️ SYSTEM (Maintenance & Updates)</option>
                <option value="PLAN">💎 PLAN (Subscription & Offers)</option>
                <option value="PROMOTIONAL">🔥 PROMOTIONAL (Content Alert)</option>
              </select>
            </div>

            <div className="notif-field-group notif-col-6">
              <label className="notif-label">Target Audience</label>
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
                <option value="All Users">👥 All Users (Entire Audience)</option>
                <option value="Subscribers Only">⭐ Subscribers Only (Active VIPs)</option>
                <option value="Non-Subscribers">🆓 Non-Subscribers (Free Tier)</option>
                <option value="Expiring Soon">⏳ Expiring Soon (Next 7 Days)</option>
                <option value="Specific User">👤 Specific User (Individual Account)</option>
              </select>
            </div>

            {/* Specific User Search */}
            {form.sendTo === "Specific User" && (
              <div className="notif-field-group notif-col-12 notif-fade-in">
                <label className="notif-label">Search Target Account</label>
                <div className="notif-user-search-wrap">
                  <input
                    className="form-input-styled notif-input"
                    name="userSearch"
                    placeholder="Search by name, email or phone number..."
                    value={selectedUser ? `${selectedUser.name || "User"} (${selectedUser.email || selectedUser.phone})` : form.userSearch}
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
                      title="Clear selected user"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {userDropOpen && !selectedUser && (
                    <div className="notif-user-dropdown">
                      {filteredUsers.length === 0 ? (
                        <div className="notif-user-empty">No matching users found</div>
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
                            <div className="notif-user-info">
                              <div className="notif-user-name">{u.name || "Unnamed User"}</div>
                              <div className="notif-user-meta">
                                {u.email}{u.phone ? ` • ${u.phone}` : ""}
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

            {/* ════════════ ATTACHMENT SECTION ════════════ */}
            <div className="notif-col-12 notif-attachment-box">
              <label className="notif-label">
                <Layers size={14} style={{ display: "inline-block", marginRight: "4px", verticalAlign: "-2px" }} />
                Notification Attachment & Deep-Link
              </label>

              <div className="segmented-switch" style={{ marginTop: "8px", marginBottom: "12px" }}>
                {[
                  { id: "none", label: "None" },
                  { id: "content", label: "Link Media Content", icon: Film },
                  { id: "plan", label: "Link Subscription Plan", icon: CreditCard },
                ].map((att) => {
                  const IconComp = att.icon;
                  return (
                    <button
                      key={att.id}
                      type="button"
                      className={`segmented-switch-btn ${attachmentType === att.id ? "active" : ""}`}
                      onClick={() => {
                        setAttachmentType(att.id);
                        if (att.id === "none") {
                          setSelectedContent(null);
                          setSelectedPlan(null);
                        } else if (att.id === "content") {
                          setSelectedPlan(null);
                        } else if (att.id === "plan") {
                          setSelectedContent(null);
                        }
                      }}
                    >
                      {attachmentType === att.id && (
                        <motion.div
                          layoutId="activeNotifAttachmentPill"
                          className="segmented-switch-active-bg"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="segmented-switch-btn-text" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {IconComp && <IconComp size={14} />} {att.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Content Link Picker */}
              {attachmentType === "content" && (
                <div className="notif-fade-in notif-attach-subgroup">
                  <div className="notif-attach-2col">
                    <div className="notif-field-group">
                      <label className="notif-label">Content Category</label>
                      <select
                        className="form-input-styled notif-input notif-select"
                        value={linkContentType}
                        onChange={(e) => {
                          setLinkContentType(e.target.value);
                          setSelectedContent(null);
                          setContentSearch("");
                        }}
                      >
                        <option value="movie">🎬 Movie</option>
                        <option value="series">📺 Series</option>
                        <option value="microdrama">⚡ Microdrama</option>
                      </select>
                    </div>

                    <div className="notif-field-group">
                      <label className="notif-label">Search {linkContentType.toUpperCase()}</label>
                      <div className="notif-user-search-wrap">
                        <input
                          className="form-input-styled notif-input"
                          placeholder={`Type title to search ${linkContentType}...`}
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
                              <div className="notif-user-empty">No matching {linkContentType}s found</div>
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
                                      {linkContentType === "movie" ? <Film size={15} /> : <Tv size={15} />}
                                    </div>
                                  )}
                                  <div>
                                    <div className="notif-user-name">{item.title}</div>
                                    <div className="notif-user-meta">
                                      {item.releaseYear ? `${item.releaseYear} • ` : ""}
                                      {Array.isArray(item.genre) ? item.genre.join(", ") : item.genre || "Media"}
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
                </div>
              )}

              {/* Plan Link Picker */}
              {attachmentType === "plan" && (
                <div className="notif-fade-in notif-attach-subgroup">
                  <div className="notif-field-group">
                    <label className="notif-label">Select Subscription Plan Target</label>
                    <select
                      className="form-input-styled notif-input notif-select"
                      value={selectedPlan ? selectedPlan._id : ""}
                      onChange={(e) => {
                        const p = plans.find((pl) => pl._id === e.target.value);
                        setSelectedPlan(p || null);
                      }}
                    >
                      <option value="">-- Choose Subscription Plan --</option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          💎 {p.name} (₹{p.price || 0} / {p.duration || "month"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Image URL Input & Preview */}
              <div className="notif-attach-subgroup" style={{ marginTop: "12px" }}>
                <div className="notif-field-group" style={{ marginBottom: "6px" }}>
                  <label className="notif-label">
                    Image Banner URL <span className="notif-optional">(Optional - Custom Banner or Auto-resolved from Content)</span>
                  </label>
                  <input
                    className="form-input-styled notif-input"
                    name="imageUrl"
                    placeholder="https://example.com/banner-image.jpg"
                    value={form.imageUrl}
                    onChange={ch}
                  />
                </div>

                {/* Preview Box if image exists */}
                {(form.imageUrl || (selectedContent && (selectedContent.poster || selectedContent.banner))) && (
                  <div className="notif-preview-chip">
                    <span className="notif-preview-lbl">
                      {form.imageUrl ? "Custom Banner Preview:" : "Auto-attached Media Banner:"}
                    </span>
                    <div className="notif-preview-img-frame">
                      <img
                        src={form.imageUrl || selectedContent.poster || selectedContent.banner}
                        alt="Notification Preview"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buttons Row */}
            <div className="notif-col-12 notif-btn-row">
              <button
                type="submit"
                className="btn-lg notif-send-btn"
                disabled={loading}
              >
                {loading ? <span className="notif-spinner" /> : <Send size={17} />}
                {loading ? "Sending Broadcast..." : "Send Notification Now"}
              </button>

              <button
                type="button"
                className="btn notif-clear-btn"
                onClick={handleClear}
              >
                <X size={15} />
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ═══════════════════════ RECENT NOTIFICATIONS TABLE ═══════════════════════ */}
      <div className="content-box notif-history-card">
        <div className="notif-history-header">
          <div className="notif-history-title-wrap">
            <h3 className="notif-history-title">
              <span className="notif-card-icon notif-amber-icon">
                <Bell size={16} />
              </span>
              Broadcast History
              <span className="notif-count-badge">{displayedNotifications.length}</span>
            </h3>
            <p className="notif-history-sub">View, inspect, and delete previously broadcasted notifications</p>
          </div>

          <div className="notif-history-actions">
            {/* Search input */}
            <div className="notif-history-search">
              <Search size={15} className="notif-history-search-ico" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="notif-history-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Refresh button */}
            <button
              type="button"
              className="notif-refresh-btn"
              onClick={fetchNotifications}
              title="Refresh notification list"
              disabled={fetching}
            >
              <RefreshCw size={14} className={fetching ? "notif-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="notif-filter-pills">
          {["ALL", "GENERAL", "SYSTEM", "PLAN", "PROMOTIONAL"].map((t) => (
            <button
              key={t}
              type="button"
              className={`notif-filter-pill ${filterType === t ? "active" : ""}`}
              onClick={() => setFilterType(t)}
            >
              {t === "ALL" ? "All Types" : t}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="notif-loading">
            <span className="notif-spinner brand-spinner" /> Loading notifications history...
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table notif-table">
              <thead>
                <tr>
                  <th>Notification Details</th>
                  <th>Type</th>
                  <th>Target Audience</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedNotifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="notif-empty-td">
                      <div className="notif-empty-state">
                        <Bell size={32} opacity={0.3} />
                        <p>No notification records found.</p>
                        {searchQuery && (
                          <button
                            type="button"
                            className="btn btn-sm notif-clear-btn"
                            onClick={() => setSearchQuery("")}
                            style={{ marginTop: "8px" }}
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedNotifications.map((n) => {
                    const badge = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;
                    return (
                      <tr key={n._id} className="notif-tr">
                        <td>
                          <div className="notif-cell-info">
                            <span className="notif-row-title">{n.title}</span>
                            <span className="notif-row-msg">{n.message}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge notif-type-badge"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {n.type || "GENERAL"}
                          </span>
                        </td>
                        <td>
                          <span className="notif-target-pill">
                            <Users size={12} />
                            {resolveTarget(n)}
                          </span>
                        </td>
                        <td>
                          <span className="notif-date">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`notif-status-badge ${n.isRead ? "read" : "unread"}`}>
                            <span className="notif-status-dot" />
                            {n.isRead ? "Read" : "Unread"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="notif-actions-wrap">
                            <button
                              className="action-btn notif-action-eye"
                              title="View full details"
                              onClick={() => handleView(n)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="action-btn notif-action-del"
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

      {/* ═══════════════════════ VIEW NOTIFICATION MODAL ═══════════════════════ */}
      {viewNotif && (
        <div className="notif-modal-backdrop" onClick={() => setViewNotif(null)}>
          <div
            className="notif-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notif-modal-header">
              <div className="notif-modal-header-title">
                <span className="notif-card-icon brand-gold-icon">
                  <Bell size={18} />
                </span>
                <h3>Notification Details</h3>
              </div>
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
                  className="badge notif-type-badge"
                  style={{
                    background: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).bg,
                    color: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).color,
                    border: `1px solid ${(TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).border}`,
                  }}
                >
                  {viewNotif.type}
                </span>
                <span className={`notif-status-badge ${viewNotif.isRead ? "read" : "unread"}`}>
                  <span className="notif-status-dot" />
                  {viewNotif.isRead ? "Read Status" : "Unread"}
                </span>
              </div>

              <h4 className="notif-modal-title">{viewNotif.title}</h4>

              <p className="notif-modal-date">
                Sent:{" "}
                {viewNotif.createdAt
                  ? new Date(viewNotif.createdAt).toLocaleString("en-IN", {
                    weekday: "short",
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
                <div className="notif-meta-card">
                  <label>TARGET AUDIENCE</label>
                  <span>{resolveTarget(viewNotif)}</span>
                </div>
                {viewNotif.actionUrl && (
                  <div className="notif-meta-card">
                    <label>ACTION DEEP-LINK</label>
                    <span className="notif-modal-url">{viewNotif.actionUrl}</span>
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

