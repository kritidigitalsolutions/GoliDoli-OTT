import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Eye,
  Edit2,
  X,
  Save,
  ShieldCheck,
  Search,
  Plus,
  Globe,
  EyeOff,
  CheckCircle2,
  Info,
  Clock,
  BookOpen,
  Scale
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./LegalPage.css";

// ── Document Type Meta Map ──────────────────────────────────────────────────
const DOC_TYPES = {
  "privacy-policy": {
    label: "Privacy Policy",
    icon: ShieldCheck,
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.25)"
  },
  "terms-conditions": {
    label: "Terms & Conditions",
    icon: Scale,
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.25)"
  },
  "refund-policy": {
    label: "Refund Policy",
    icon: FileText,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)"
  },
  "about-app": {
    label: "About & Disclosures",
    icon: Info,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.25)"
  }
};

const DEFAULT_DOC = {
  type: "privacy-policy",
  title: "",
  content: "",
  isPublished: true
};

export default function LegalPage() {
  const [legal, setLegal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [toast, setToast] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // ── Toast Helper ────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch Legal Documents ────────────────────────────────────────────────
  const fetchLegal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/legal");
      setLegal(res.data.documents || []);
    } catch {
      showToast("Failed to load legal documents.", "error");
      setLegal([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLegal();
  }, [fetchLegal]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Save Document (Create or Update) ─────────────────────────────────────
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!selected.title?.trim() || !selected.content?.trim()) {
      showToast("Please provide both document title and content.", "error");
      return;
    }

    setSaving(true);
    try {
      await API.put(`/admin/legal/${selected.type}`, {
        type: selected.type,
        title: selected.title.trim(),
        content: selected.content.trim(),
        isPublished: selected.isPublished ?? true
      });

      showToast(`"${selected.title}" updated successfully! 🎉`);
      setSelected(null);
      fetchLegal();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save document.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Publish Status ────────────────────────────────────────────────
  const handleTogglePublish = async (doc) => {
    try {
      const res = await API.patch(`/admin/legal/${doc.type}/toggle-publish`);
      const newStatus = res.data?.page?.isPublished ?? !doc.isPublished;

      setLegal((prev) =>
        prev.map((item) => (item._id === doc._id ? { ...item, isPublished: newStatus } : item))
      );

      showToast(`Document "${doc.title}" ${newStatus ? "Published" : "Unpublished"}.`);
    } catch {
      showToast("Failed to toggle publish status.", "error");
    }
  };

  // ── Modal Opener ─────────────────────────────────────────────────────────
  const openModal = (doc, m = "view") => {
    setSelected({ ...doc });
    setMode(m);
  };

  const openCreateModal = () => {
    // Find first type that doesn't exist yet, or default to privacy-policy
    const existingTypes = legal.map((d) => d.type);
    const availableType = Object.keys(DOC_TYPES).find((t) => !existingTypes.includes(t)) || "privacy-policy";
    const typeInfo = DOC_TYPES[availableType];

    setSelected({
      ...DEFAULT_DOC,
      type: availableType,
      title: typeInfo ? typeInfo.label : "Legal Document"
    });
    setMode("create");
  };

  // ── Computed Filtered Documents ──────────────────────────────────────────
  const filteredLegal = legal.filter((doc) => {
    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const publishedCount = legal.filter((d) => d.isPublished).length;
  const draftCount = legal.length - publishedCount;

  // Word count calculator helper
  const getWordCount = (text = "") => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="page-section legal-page">
      {/* ── Toast Alert ── */}
      {toast && (
        <div className={`legal-toast ${toast.type}`}>
          <span className="legal-toast-icon">
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page Header Banner ── */}
      <div className="pg-header legal-header-banner">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon legal-title-icon">
              <Scale size={22} />
            </span>
            Legal & Compliance Hub
          </h1>
          <p className="pg-sub">Manage platform policies, terms of service, refund rules, and legal disclosures</p>
        </div>

        <div className="legal-stats-row">
          <div className="legal-stat-chip">
            <span className="legal-stat-val">{legal.length}</span>
            <span className="legal-stat-lbl">Total Documents</span>
          </div>
          <div className="legal-stat-chip s-green">
            <span className="legal-stat-val">{publishedCount}</span>
            <span className="legal-stat-lbl">Published</span>
          </div>
          <div className="legal-stat-chip s-amber">
            <span className="legal-stat-val">{draftCount}</span>
            <span className="legal-stat-lbl">Draft / Hidden</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & Add ── */}
      <div className="legal-toolbar">
        <div className="legal-search-wrap">
          <Search size={16} className="legal-search-icon" />
          <input
            type="text"
            className="legal-search-input"
            placeholder="Search legal documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="legal-search-clear"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="legal-filter-pills">
          {["ALL", ...Object.keys(DOC_TYPES)].map((t) => (
            <button
              key={t}
              type="button"
              className={`legal-filter-pill ${typeFilter === t ? "active" : ""}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === "ALL" ? "All Documents" : (DOC_TYPES[t]?.label || t)}
            </button>
          ))}
        </div>

        <button type="button" className="legal-add-btn" onClick={openCreateModal}>
          <Plus size={16} />
          Create Document
        </button>
      </div>

      {/* ── Document Grid ── */}
      {loading ? (
        <div className="legal-loading" style={{ padding: "60px 0" }}>
          <span className="legal-spinner brand-spinner" /> Loading legal documents...
        </div>
      ) : filteredLegal.length === 0 ? (
        <div className="legal-empty-box">
          <FileText size={40} opacity={0.3} />
          <p>No legal documents found matching your filter.</p>
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
        <div className="legal-grid">
          {filteredLegal.map((doc) => {
            const typeMeta = DOC_TYPES[doc.type] || {
              label: doc.title || "Legal Document",
              icon: FileText,
              color: "#FFD11A",
              bg: "rgba(255, 209, 26, 0.12)",
              border: "rgba(255, 209, 26, 0.25)"
            };
            const IconComp = typeMeta.icon;

            return (
              <div key={doc._id || doc.type} className="legal-card">
                <div>
                  <div className="legal-card-header">
                    <div className="legal-card-title-wrap">
                      <div
                        className="legal-card-icon-box"
                        style={{ background: typeMeta.bg, color: typeMeta.color }}
                      >
                        <IconComp size={18} />
                      </div>
                      <div>
                        <h3 className="legal-card-title">{doc.title}</h3>
                        <span className="legal-card-type-lbl">{typeMeta.label}</span>
                      </div>
                    </div>

                    <span className={`legal-pub-badge ${doc.isPublished ? "published" : "draft"}`}>
                      <span className="legal-badge-dot" />
                      {doc.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="legal-card-body" style={{ marginTop: "14px" }}>
                    <p className="legal-excerpt-text">{doc.content}</p>
                  </div>
                </div>

                <div className="legal-card-foot">
                  <div className="legal-meta-info">
                    <span className="legal-meta-item" title="Word count">
                      <BookOpen size={13} />
                      {getWordCount(doc.content)} words
                    </span>
                    {doc.updatedAt && (
                      <span className="legal-meta-item" title="Last updated">
                        <Clock size={13} />
                        {new Date(doc.updatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short"
                        })}
                      </span>
                    )}
                  </div>

                  <div className="legal-card-actions">
                    <button
                      type="button"
                      className={`legal-toggle-btn ${doc.isPublished ? "" : "hidden"}`}
                      title={doc.isPublished ? "Unpublish document" : "Publish document"}
                      onClick={() => handleTogglePublish(doc)}
                    >
                      {doc.isPublished ? <Globe size={13} /> : <EyeOff size={13} />}
                      <span>{doc.isPublished ? "Live" : "Hidden"}</span>
                    </button>

                    <button
                      type="button"
                      className="icon-btn view"
                      title="View document"
                      onClick={() => openModal(doc, "view")}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn edit"
                      title="Edit document"
                      onClick={() => openModal(doc, "edit")}
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View / Edit / Create Modal ── */}
      {selected && (
        <div className="legal-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="legal-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <div className="legal-modal-title">
                <span className="pg-title-icon legal-title-icon">
                  {mode === "view" ? <Eye size={18} /> : <Edit2 size={18} />}
                </span>
                <span>
                  {mode === "view"
                    ? "View Document Details"
                    : mode === "create"
                    ? "Create Legal Document"
                    : "Edit Legal Document"}
                </span>
              </div>
              <button
                type="button"
                className="legal-modal-close"
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="legal-modal-body">
              {/* Type Select */}
              <div className="legal-field-group">
                <label className="legal-field-label">Document Category</label>
                {mode === "create" ? (
                  <select
                    className="legal-input-field legal-select"
                    value={selected.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const info = DOC_TYPES[newType];
                      setSelected({
                        ...selected,
                        type: newType,
                        title: info ? info.label : selected.title
                      });
                    }}
                  >
                    {Object.entries(DOC_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="legal-input-field"
                    value={DOC_TYPES[selected.type]?.label || selected.type}
                    disabled
                  />
                )}
              </div>

              {/* Title Input */}
              <div className="legal-field-group">
                <label className="legal-field-label">Document Title</label>
                <input
                  className="legal-input-field"
                  placeholder="e.g. Privacy Policy & Data Usage Terms"
                  value={selected.title}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                />
              </div>

              {/* Content Textarea */}
              <div className="legal-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="legal-field-label">Document Content (Markdown / Plain Text)</label>
                  <span className="legal-footer-info">
                    {getWordCount(selected.content)} words • {selected.content?.length || 0} chars
                  </span>
                </div>
                <textarea
                  className="legal-input-field legal-textarea-field"
                  placeholder="Enter full legal document text here..."
                  rows={12}
                  value={selected.content}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                />
              </div>
            </form>

            <div className="legal-modal-footer">
              <div className="legal-footer-info">
                {selected.updatedAt
                  ? `Last updated: ${new Date(selected.updatedAt).toLocaleString("en-IN")}`
                  : "Draft Document"}
              </div>

              <div className="legal-footer-btns">
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
                    className="legal-add-btn"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? <span className="legal-spinner" /> : <Save size={16} />}
                    {saving ? "Saving Changes..." : "Save & Publish Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}