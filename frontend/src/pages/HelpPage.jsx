import { useEffect, useState, useCallback } from "react";
import {
  HelpCircle,
  Eye,
  Edit2,
  X,
  Save,
  Trash2,
  Phone,
  Mail,
  Plus,
  Search,
  Globe,
  EyeOff,
  CheckCircle2,
  Info,
  Headphones,
  BookOpen,
  MessageSquare
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./HelpPage.css";

const FAQ_CATEGORIES = {
  faq: "General FAQ",
  "account-help": "Account & Profile",
  "cancel-subscription": "Subscription & Billing",
  "report-problem": "Technical & Playback"
};

const EMPTY_FAQ = {
  question: "",
  answer: "",
  category: "faq",
  supportNumber: "",
  supportEmail: "",
  isPublished: true
};

export default function HelpPage() {
  const [help, setHelp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "add"
  const [toast, setToast] = useState(null);

  // Support channel modal: { type: 'phone'|'email', item: obj, value: '' }
  const [supportModal, setSupportModal] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // ── Toast Helper ────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch Help Items ────────────────────────────────────────────────────
  const fetchHelp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/help");
      setHelp(res.data.data || []);
    } catch {
      showToast("Failed to load help center data.", "error");
      setHelp([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHelp();
  }, [fetchHelp]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setSupportModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Article Save (Create / Update) ──────────────────────────────────────
  const handleSaveArticle = async (e) => {
    if (e) e.preventDefault();

    if (!selected.question?.trim() || !selected.answer?.trim()) {
      showToast("Please fill in both question title and answer content.", "error");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit" && selected._id) {
        await API.put(`/admin/help/${selected._id}`, selected);
        showToast("Help article updated successfully! 🎉");
      } else {
        await API.post("/admin/help", {
          ...selected,
          category: selected.category || "faq",
          isPublished: selected.isPublished !== false
        });
        showToast("New help article created! 🎉");
      }
      setSelected(null);
      fetchHelp();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save article.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete FAQ Article ──────────────────────────────────────────────────
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title || "this article"}"?`)) return;
    try {
      await API.delete(`/admin/help/${id}`);
      showToast("Help article deleted.");
      fetchHelp();
    } catch {
      showToast("Failed to delete article.", "error");
    }
  };

  // ── Toggle Visibility ───────────────────────────────────────────────────
  const handleTogglePublish = async (id) => {
    try {
      await API.patch(`/admin/help/${id}/toggle`);
      setHelp((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isPublished: item.isPublished === false ? true : false } : item
        )
      );
      showToast("Publish status toggled.");
    } catch {
      showToast("Failed to toggle visibility.", "error");
    }
  };

  // ── Support Channel Modal Handlers ─────────────────────────────────────
  const handleSaveSupport = async (e) => {
    if (e) e.preventDefault();
    if (!supportModal) return;
    const { type, item, value } = supportModal;
    if (!value.trim()) {
      showToast("Support contact value cannot be empty.", "error");
      return;
    }

    setSaving(true);
    try {
      if (item) {
        const updatedItem = {
          ...item,
          question: type === "phone" ? "Support Number" : "Support Email",
          answer: type === "phone" ? `Support Number: ${value.trim()}` : `Support Email: ${value.trim()}`,
          supportNumber: type === "phone" ? value.trim() : "",
          supportEmail: type === "email" ? value.trim() : ""
        };
        await API.put(`/admin/help/${item._id}`, updatedItem);
        showToast(`Support ${type === "phone" ? "phone number" : "email address"} updated!`);
      } else {
        const newItem = {
          category: "contact-support",
          question: type === "phone" ? "Support Number" : "Support Email",
          answer: type === "phone" ? `Support Number: ${value.trim()}` : `Support Email: ${value.trim()}`,
          supportNumber: type === "phone" ? value.trim() : "",
          supportEmail: type === "email" ? value.trim() : "",
          isPublished: true
        };
        await API.post("/admin/help", newItem);
        showToast(`Support ${type === "phone" ? "phone number" : "email address"} added!`);
      }
      setSupportModal(null);
      fetchHelp();
    } catch {
      showToast("Failed to save support contact.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupport = async (id, label) => {
    if (!window.confirm(`Delete support ${label}?`)) return;
    try {
      await API.delete(`/admin/help/${id}`);
      showToast(`Support ${label} removed.`);
      fetchHelp();
    } catch {
      showToast("Failed to delete support contact.", "error");
    }
  };

  // ── Derived Data ────────────────────────────────────────────────────────
  const faqs = help.filter((item) => item.category !== "contact-support");
  const phoneSupport = help.find((item) => item.category === "contact-support" && item.supportNumber);
  const emailSupport = help.find((item) => item.category === "contact-support" && item.supportEmail);

  const filteredFaqs = faqs.filter((item) => {
    const matchesCat = categoryFilter === "ALL" || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      (item.question || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.answer || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const publishedFaqs = faqs.filter((f) => f.isPublished !== false).length;

  return (
    <div className="page-section help-page">
      {/* ── Toast Alert ── */}
      {toast && (
        <div className={`help-toast ${toast.type}`}>
          <span className="help-toast-icon">
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page Header Banner ── */}
      <div className="pg-header help-header-banner">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon help-title-icon">
              <HelpCircle size={22} />
            </span>
            Help Center & Support Hub
          </h1>
          <p className="pg-sub">Manage platform FAQs, help documentation, and customer support channels</p>
        </div>

        <div className="help-stats-row">
          <div className="help-stat-chip">
            <span className="help-stat-val">{faqs.length}</span>
            <span className="help-stat-lbl">Total Articles</span>
          </div>
          <div className="help-stat-chip s-green">
            <span className="help-stat-val">{publishedFaqs}</span>
            <span className="help-stat-lbl">Published</span>
          </div>
          <div className="help-stat-chip s-blue">
            <span className="help-stat-val">
              {(phoneSupport ? 1 : 0) + (emailSupport ? 1 : 0)} / 2
            </span>
            <span className="help-stat-lbl">Active Channels</span>
          </div>
        </div>
      </div>

      {/* ── Support Contact Channels Banner ── */}
      <div className="help-channels-section">
        <h2 className="help-section-title">
          <Headphones size={18} className="text-gold" /> Customer Support Channels
        </h2>

        <div className="help-channels-grid">
          {/* Phone Channel Card */}
          <div className="help-channel-card">
            <div>
              <div className="help-channel-head">
                <span className="help-channel-lbl">
                  <Phone size={14} style={{ color: "#25D366" }} />
                  WhatsApp Number
                  <span className="help-whatsapp-badge">WhatsApp Only</span>
                </span>

                {phoneSupport && (
                  <button
                    type="button"
                    className={`legal-toggle-btn ${phoneSupport.isPublished !== false ? "" : "hidden"}`}
                    title={phoneSupport.isPublished !== false ? "Unpublish phone channel" : "Publish phone channel"}
                    onClick={() => handleTogglePublish(phoneSupport._id)}
                  >
                    {phoneSupport.isPublished !== false ? <Globe size={12} /> : <EyeOff size={12} />}
                    <span>{phoneSupport.isPublished !== false ? "Live" : "Hidden"}</span>
                  </button>
                )}
              </div>

              <div className="help-channel-val">
                {phoneSupport ? (
                  phoneSupport.supportNumber
                ) : (
                  <span className="help-channel-empty">Not Configured</span>
                )}
              </div>
            </div>

            <div className="legal-card-actions">
              {phoneSupport ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setSupportModal({
                        type: "phone",
                        item: phoneSupport,
                        value: phoneSupport.supportNumber
                      })
                    }
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--vibrant-red)" }}
                    onClick={() => handleDeleteSupport(phoneSupport._id, "WhatsApp number")}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="help-add-btn"
                  style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                  onClick={() => setSupportModal({ type: "phone", item: null, value: "" })}
                >
                  <Plus size={14} /> Add WhatsApp Number
                </button>
              )}
            </div>
          </div>

          {/* Email Channel Card */}
          <div className="help-channel-card">
            <div>
              <div className="help-channel-head">
                <span className="help-channel-lbl">
                  <Mail size={14} style={{ color: "var(--blue)" }} /> Support Email Address
                </span>

                {emailSupport && (
                  <button
                    type="button"
                    className={`legal-toggle-btn ${emailSupport.isPublished !== false ? "" : "hidden"}`}
                    title={emailSupport.isPublished !== false ? "Unpublish email channel" : "Publish email channel"}
                    onClick={() => handleTogglePublish(emailSupport._id)}
                  >
                    {emailSupport.isPublished !== false ? <Globe size={12} /> : <EyeOff size={12} />}
                    <span>{emailSupport.isPublished !== false ? "Live" : "Hidden"}</span>
                  </button>
                )}
              </div>

              <div className="help-channel-val">
                {emailSupport ? (
                  emailSupport.supportEmail
                ) : (
                  <span className="help-channel-empty">Not Configured</span>
                )}
              </div>
            </div>

            <div className="legal-card-actions">
              {emailSupport ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setSupportModal({
                        type: "email",
                        item: emailSupport,
                        value: emailSupport.supportEmail
                      })
                    }
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--vibrant-red)" }}
                    onClick={() => handleDeleteSupport(emailSupport._id, "email address")}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="help-add-btn"
                  style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                  onClick={() => setSupportModal({ type: "email", item: null, value: "" })}
                >
                  <Plus size={14} /> Add Email Address
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Category Filter & Add Article ── */}
      <div className="help-toolbar">
        <div className="help-search-wrap">
          <Search size={16} className="help-search-icon" />
          <input
            type="text"
            className="help-search-input"
            placeholder="Search FAQ questions & answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="help-search-clear"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="help-filter-pills">
          {["ALL", ...Object.keys(FAQ_CATEGORIES)].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`help-filter-pill ${categoryFilter === cat ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === "ALL" ? "All Articles" : FAQ_CATEGORIES[cat]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="help-add-btn"
          onClick={() => {
            setSelected({ ...EMPTY_FAQ });
            setMode("add");
          }}
        >
          <Plus size={16} />
          Add Help Article
        </button>
      </div>

      {/* ── FAQ Articles Grid ── */}
      {loading ? (
        <div className="legal-loading" style={{ padding: "60px 0" }}>
          <span className="legal-spinner brand-spinner" /> Loading help center articles...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="legal-empty-box">
          <BookOpen size={40} opacity={0.3} />
          <p>No help articles found matching your filter.</p>
          {searchQuery && (
            <button
              type="button"
              className="legal-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="help-grid">
          {filteredFaqs.map((item) => {
            const isLive = item.isPublished !== false;
            return (
              <div key={item._id} className="help-card" style={{ opacity: isLive ? 1 : 0.8 }}>
                <div>
                  <div className="help-card-header">
                    <h3 className="help-card-title">{item.question}</h3>
                    <span className={`legal-pub-badge ${isLive ? "published" : "draft"}`}>
                      <span className="legal-badge-dot" />
                      {isLive ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="help-card-tags">
                    {item.category && (
                      <span className="help-cat-tag">
                        {FAQ_CATEGORIES[item.category] || item.category}
                      </span>
                    )}
                  </div>

                  <div className="help-card-body" style={{ marginTop: "12px" }}>
                    <p className="help-excerpt-text">{item.answer}</p>
                  </div>
                </div>

                <div className="help-card-foot">
                  <button
                    type="button"
                    className={`legal-toggle-btn ${isLive ? "" : "hidden"}`}
                    title={isLive ? "Unpublish article" : "Publish article"}
                    onClick={() => handleTogglePublish(item._id)}
                  >
                    {isLive ? <Globe size={13} /> : <EyeOff size={13} />}
                    <span>{isLive ? "Live" : "Hidden"}</span>
                  </button>

                  <div className="help-actions-wrap">
                    <button
                      type="button"
                      className="icon-btn view"
                      title="View article details"
                      onClick={() => {
                        setSelected(item);
                        setMode("view");
                      }}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn edit"
                      title="Edit article"
                      onClick={() => {
                        setSelected(item);
                        setMode("edit");
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn del"
                      title="Delete article"
                      onClick={() => handleDelete(item._id, item.question)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAQ Add / Edit / View Modal ── */}
      {selected && (
        <div className="help-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="help-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <div className="help-modal-title">
                <span className="pg-title-icon help-title-icon">
                  {mode === "view" ? <Eye size={18} /> : mode === "edit" ? <Edit2 size={18} /> : <Plus size={18} />}
                </span>
                <span>
                  {mode === "view"
                    ? "View Article Details"
                    : mode === "edit"
                    ? "Edit Article"
                    : "Add New Article"}
                </span>
              </div>
              <button
                type="button"
                className="help-modal-close"
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="help-modal-body">
              {/* Question */}
              <div className="help-field-group">
                <label className="help-field-label">Question / Article Title</label>
                <input
                  className="help-input-field"
                  placeholder="e.g. How do I cancel or upgrade my subscription?"
                  value={selected.question || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, question: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="help-field-group">
                <label className="help-field-label">Category</label>
                <select
                  className="help-input-field help-select-field"
                  value={selected.category || "faq"}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, category: e.target.value })}
                >
                  {Object.entries(FAQ_CATEGORIES).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Answer */}
              <div className="help-field-group">
                <label className="help-field-label">Answer / Article Content</label>
                <textarea
                  className="help-input-field help-textarea-field"
                  placeholder="Write a clear, detailed answer to guide users..."
                  rows={6}
                  value={selected.answer || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, answer: e.target.value })}
                />
              </div>

              {/* Publish Switch */}
              {mode !== "view" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--bg3)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)"
                  }}
                >
                  <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text)" }}>
                    Publish Article (Visible to users immediately)
                  </span>
                  <label className="switch-container switch-sm">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={selected.isPublished !== false}
                      onChange={(e) => setSelected({ ...selected, isPublished: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              )}
            </form>

            <div className="help-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelected(null)}
              >
                {mode === "view" ? "Close" : "Cancel"}
              </button>

              {mode !== "view" && (
                <button
                  type="button"
                  className="help-add-btn"
                  disabled={saving}
                  onClick={handleSaveArticle}
                >
                  {saving ? <span className="legal-spinner" /> : <Save size={16} />}
                  {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Article"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Support Channel Add/Edit Modal ── */}
      {supportModal && (
        <div className="help-modal-backdrop" onClick={() => setSupportModal(null)}>
          <div className="help-modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <div className="help-modal-title">
                <span className="pg-title-icon help-title-icon">
                  {supportModal.type === "phone" ? <Phone size={18} /> : <Mail size={18} />}
                </span>
                <span>
                  {supportModal.item ? "Edit Support Contact" : "Add Support Contact"}
                </span>
              </div>
              <button
                type="button"
                className="help-modal-close"
                onClick={() => setSupportModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSupport} className="help-modal-body">
              <div className="help-field-group">
                <label className="help-field-label">
                  {supportModal.type === "phone" ? "WhatsApp Number (WhatsApp Only)" : "Support Email Address"}
                </label>
                {supportModal.type === "phone" && (
                  <p style={{ fontSize: "0.78rem", color: "#25D366", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={13} /> This number will be shown as a WhatsApp contact only — not a call number.
                  </p>
                )}
                <input
                  className="help-input-field"
                  type={supportModal.type === "phone" ? "tel" : "email"}
                  placeholder={
                    supportModal.type === "phone" ? "e.g. +91 9876543210 (WhatsApp only)" : "e.g. support@golidoli.com"
                  }
                  value={supportModal.value}
                  onChange={(e) => setSupportModal({ ...supportModal, value: e.target.value })}
                  autoFocus
                />
              </div>
            </form>

            <div className="help-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSupportModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="help-add-btn"
                disabled={saving}
                onClick={handleSaveSupport}
              >
                {saving ? <span className="legal-spinner" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Contact Info"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
