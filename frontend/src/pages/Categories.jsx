import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { 
  Layers, Plus, Search, Edit2, Trash2, X, Check, RefreshCw, 
  Eye, EyeOff, LayoutGrid, AlertCircle, CheckCircle, ArrowUpDown, Sparkles
} from "lucide-react";
import "./Dashboard.css";
import "./Category.css";
import "./WebpageLayout.css";

const HideArrowsStyle = () => (
  <style>{`
    .pos-input-no-arrows::-webkit-outer-spin-button,
    .pos-input-no-arrows::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .pos-input-no-arrows {
      -moz-appearance: textfield;
    }
  `}</style>
);

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [priority, setPriority] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All"); // All, Active, Inactive

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

  // Inline Curation State
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [curatedMap, setCuratedMap] = useState({});
  const [contentList, setContentList] = useState([]);
  const [sectionSearches, setSectionSearches] = useState({});
  const [savingLayout, setSavingLayout] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [catRes, contentRes] = await Promise.all([
        API.get("/admin/categories"),
        API.get("/admin/content/all")
      ]);
      const cats = catRes.data?.data || [];
      setCategories(cats);

      const map = {};
      cats.forEach(cat => {
        if (cat.curatedContent && cat.curatedContent.length > 0) {
          map[cat._id] = cat.curatedContent;
        }
      });
      
      if (contentRes.data?.success) {
        const cList = (contentRes.data.content || []).filter(
          i => i.isPublished !== false && i.isHide !== true
        );
        setContentList(cList);

        cats.forEach(cat => {
          if (!cat.curatedContent || cat.curatedContent.length === 0) {
            const connected = cList.filter(i => {
              if (!Array.isArray(i.category)) return false;
              return i.category.includes(cat.slug) || i.category.includes(cat.name) || i.category.includes(cat._id);
            });
            if (connected.length > 0) {
              map[cat._id] = connected.map(c => ({
                contentType: c.contentType === "movie" ? "Movie" : "Series",
                contentId: c
              }));
            }
          }
        });
      }
      
      setCuratedMap(map);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setPriority("0");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setIsEditing(true);
    setEditId(cat._id);
    setName(cat.name);
    setPriority(cat.priority?.toString() || "0");
    setIsActive(cat.isActive !== false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setName("");
    setPriority("0");
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return showAlert("Validation Error", "Category name is required.");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        isActive
      };
      if (priority) payload.priority = priority;

      if (isEditing) {
        await API.put(`/admin/categories/${editId}`, payload);
      } else {
        await API.post("/admin/categories", payload);
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      showAlert("Error", err?.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, catName) => {
    showConfirm({
      title: "Delete Category",
      message: `Are you sure you want to permanently delete category "${catName}"? Content tagged with this category may lose layout grouping.`,
      type: "danger",
      confirmText: "Delete Category",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await API.delete(`/admin/categories/${id}`);
          fetchCategories();
        } catch (err) {
          showAlert("Error", err?.response?.data?.message || "Failed to delete category");
        }
      }
    });
  };

  const updatePriority = async (id, value) => {
    const newPriority = parseInt(value, 10);
    if (isNaN(newPriority) || newPriority < 0) return;

    const cat = categories.find(c => c._id === id);
    if (!cat) return;
    if (cat.priority === newPriority) return;

    // Optimistically update priority locally to prevent table re-layout lag
    setCategories(prev =>
      prev.map(c => (c._id === id ? { ...c, priority: newPriority } : c))
    );

    try {
      await API.put(`/admin/categories/${id}`, {
        name: cat.name,
        priority: newPriority,
        isActive: cat.isActive
      });
    } catch (err) {
      // Rollback on failure
      setCategories(prev =>
        prev.map(c => (c._id === id ? { ...c, priority: cat.priority } : c))
      );
      showAlert("Error", err?.response?.data?.message || "Failed to update priority");
    }
  };

  const handleToggleActive = async (id, currentActive, name) => {
    // Optimistically toggle active state locally to eliminate shaking & re-fetch flickering
    setCategories(prev =>
      prev.map(c => (c._id === id ? { ...c, isActive: !currentActive } : c))
    );

    try {
      await API.put(`/admin/categories/${id}`, {
        name,
        isActive: !currentActive
      });
    } catch (err) {
      // Rollback on failure
      setCategories(prev =>
        prev.map(c => (c._id === id ? { ...c, isActive: currentActive } : c))
      );
      showAlert("Error", err?.response?.data?.message || "Failed to update status");
    }
  };

  const totalCount = categories.length;
  const activeCount = categories.filter(c => c.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;

  const filteredCategories = categories.filter(c => {
    if (activeTab === "Active" && c.isActive === false) return false;
    if (activeTab === "Inactive" && c.isActive !== false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (c.name || "").toLowerCase().includes(q) || (c.slug || "").toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ── Inline Curation Helpers ── */
  const saveCuratedContent = async (catId, items) => {
    setSavingLayout(true);
    try {
      await API.put(`/admin/categories/${catId}/content`, {
        items: items.map(i => ({
          contentType: i.contentType,
          contentId: i.contentId?._id || i.contentId,
        }))
      });
      setCuratedMap(prev => ({ ...prev, [catId]: items }));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save content";
      showAlert("Curation Error", msg);
    } finally {
      setSavingLayout(false);
    }
  };

  const toggleCarouselItem = (catId, slug, item, removing) => {
    const currentItems = [...(curatedMap[catId] || [])];
    let nextItems;
    if (removing) {
      nextItems = currentItems.filter(
        x => String(x.contentId?._id || x.contentId) !== String(item._id)
      );
    } else {
      nextItems = [...currentItems, {
        contentType: item.contentType === "movie" ? "Movie" : "Series",
        contentId: item,
      }];
    }
    setCuratedMap(prev => ({ ...prev, [catId]: nextItems }));
    saveCuratedContent(catId, nextItems);
  };

  const moveToPos = (catId, currentIdx, newPosVal) => {
    let newPos = parseInt(newPosVal, 10) - 1;
    if (isNaN(newPos)) return;

    const currentItems = [...(curatedMap[catId] || [])];
    if (newPos < 0) newPos = 0;
    if (newPos >= currentItems.length) newPos = currentItems.length - 1;
    if (currentIdx === newPos) return;

    const [movedItem] = currentItems.splice(currentIdx, 1);
    currentItems.splice(newPos, 0, movedItem);

    setCuratedMap(prev => ({ ...prev, [catId]: currentItems }));
    saveCuratedContent(catId, currentItems);
  };

  const toggleExpand = (slug) => {
    setExpandedCategory(prev => (prev === slug ? null : slug));
  };

  const renderInlineCarousel = (catId, slug) => {
    const catObj = categories.find(c => c._id === catId);
    const curatedItems = curatedMap[catId] || [];
    const searchQ = sectionSearches[slug] || "";

    let connected = contentList.filter(i => {
      if (!Array.isArray(i.category)) return false;
      return i.category.includes(slug) ||
             (catObj && i.category.includes(catObj.name)) ||
             (catObj && i.category.includes(catObj._id));
    });

    if (connected.length === 0) {
      return (
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, color: "#eab308", background: "rgba(234, 179, 8, 0.1)", borderRadius: 10, border: "1px solid rgba(234, 179, 8, 0.2)", fontSize: "0.84rem" }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>No published content tagged with <strong>{catObj ? catObj.name : slug}</strong> yet. Tag items in Content Library first.</span>
        </div>
      );
    }

    const selectedIds = new Set(curatedItems.map(x => String(x.contentId?._id || x.contentId)));
    const selectedList = curatedItems
      .map(x => connected.find(c => String(c._id) === String(x.contentId?._id || x.contentId)))
      .filter(Boolean);
    let unselected = connected.filter(c => !selectedIds.has(String(c._id)));
    if (searchQ.trim()) {
      unselected = unselected.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase()));
    }

    const imgUrl = (url) => (!url ? "" : url);

    return (
      <div className="wl-curator" style={{ margin: 0, border: "none", background: "transparent", padding: 0 }}>
        <div className="wl-curator-toolbar" style={{ marginTop: 0 }}>
          <span className="wl-count-label">{selectedList.length} items active in homepage carousel</span>
          <div className="search-field wl-mini-search" style={{ margin: 0, padding: "5px 12px" }}>
            <Search size={13} className="search-icon" />
            <input className="search-input" placeholder="Filter available content…"
              value={searchQ}
              onChange={e => setSectionSearches(p => ({ ...p, [slug]: e.target.value }))} />
            {searchQ && <button className="search-clear" onClick={() => setSectionSearches(p => ({ ...p, [slug]: "" }))}><X size={12} /></button>}
          </div>
        </div>

        {savingLayout && (
          <div style={{ fontSize: "12px", color: "var(--primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <RefreshCw size={12} className="spin-icon" /> Saving homepage ordering...
          </div>
        )}

        <div className="wl-grid">
          {/* Selected Items */}
          {selectedList.map((item, idx) => (
            <div key={item._id} className="wl-card wl-card--selected">
              <div className="wl-card-media" onClick={() => toggleCarouselItem(catId, slug, item, true)} title="Click to remove from homepage row">
                <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                <div className="wl-card-badge wl-card-badge--check"><Check size={10} /></div>
                <label className="wl-card-pos" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', padding: '3px 7px', borderRadius: '6px', cursor: 'text', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} title="Type number to reorder">
                  <span style={{ marginRight: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000' }}>Pos</span>
                  <input 
                    className="pos-input-no-arrows"
                    key={`pos-${catId}-${item._id}-${idx}`}
                    type="number" 
                    defaultValue={idx + 1}
                    onBlur={e => {
                      moveToPos(catId, idx, e.target.value);
                      e.target.value = idx + 1;
                    }}
                    onKeyDown={e => {
                      if(e.key === 'Enter') e.target.blur();
                    }}
                    style={{
                      width: "32px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px dashed rgba(0,0,0,0.4)",
                      color: "#000",
                      fontWeight: "bold",
                      fontSize: "12px",
                      outline: "none",
                      textAlign: "center",
                      padding: "1px 0",
                      borderRadius: "4px"
                    }}
                    min="1"
                    max={selectedList.length}
                  />
                  <Edit2 size={11} style={{ marginLeft: '4px', opacity: 0.8, color: '#000' }} />
                </label>
              </div>
              <div className="wl-card-body">
                <p className="wl-card-title">{item.title}</p>
                <div className="wl-card-foot">
                  <span className={`wl-type ${item.contentType}`}>{item.contentType}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Unselected Items */}
          {unselected.map(item => (
            <div key={item._id} className="wl-card wl-card--dim">
              <div className="wl-card-media" onClick={() => toggleCarouselItem(catId, slug, item, false)} title="Click to add to homepage row">
                <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                <div className="wl-card-badge wl-card-badge--add"><Plus size={10} /></div>
              </div>
              <div className="wl-card-body">
                <p className="wl-card-title">{item.title}</p>
                <div className="wl-card-foot">
                  <span className={`wl-type ${item.contentType}`}>{item.contentType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-section">
      <HideArrowsStyle />

      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Layers className="pg-title-icon" size={20} /> 
            Categories Management
          </h1>
          <p className="pg-sub">Organize content categories and curate homepage showcase rows</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            className="btn btn-ghost" 
            onClick={fetchCategories} 
            disabled={loading}
            title="Refresh Categories"
            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={openAddModal}
            style={{ padding: "6px 14px", fontSize: "0.78rem" }}
          >
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* 3-Card Symmetrical KPI Grid */}
      <div className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Categories</span>
            <div className="kpi-icon-badge icon-indigo">
              <Layers size={15} />
            </div>
          </div>
          <div className="kpi-value">{totalCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Registered content genres & tags
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Categories</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>{activeCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Visible across OTT platform
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Inactive Categories</span>
            <div className="kpi-icon-badge icon-pink">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#F43F5E" }}>{inactiveCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#F43F5E" }}>
            Hidden / Draft categories
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            {/* Search Field */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search categories by name or slug..."
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

            {/* Segmented Filter Switch */}
            <div className="segmented-switch">
              {["All", "Active", "Inactive"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`segmented-switch-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeCategoryFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="tbl-wrap">
          <table className="tbl tbl-categories" style={{ tableLayout: "fixed", minWidth: "760px" }}>
            <thead>
              <tr>
                <th style={{ width: '45px' }}>#</th>
                <th style={{ width: '220px' }}>CATEGORY</th>
                <th style={{ width: '160px' }}>SLUG</th>
                <th style={{ width: '95px', textAlign: 'center' }}>PRIORITY</th>
                <th style={{ width: '110px', textAlign: 'center' }}>STATUS</th>
                <th style={{ width: '125px' }}>CREATED</th>
                <th style={{ width: '150px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((c, index) => (
                <React.Fragment key={c._id}>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{index + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="cat-avatar">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="u-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="cat-slug-badge" title={c.slug}>
                        {c.slug}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        key={`priority-${c._id}-${c.priority}`}
                        type="number"
                        className="cat-priority-input"
                        defaultValue={c.priority || 0}
                        onBlur={(e) => updatePriority(c._id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                        min="0"
                        title="Type & press Enter or Blur to save priority order"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-status-wrap ${c.isActive !== false ? "badge-active" : "badge-blocked"}`}>
                        {c.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="tbl-actions" style={{ justifyContent: "center", gap: "6px" }}>
                        {/* Interactive Toggle Switch */}
                        <div style={{ display: "flex", alignItems: "center", marginRight: "4px" }} title={c.isActive !== false ? "Click to Deactivate (Red)" : "Click to Activate (Green)"}>
                          <label className="switch-label">
                            <input
                              type="checkbox"
                              className="switch-input"
                              checked={c.isActive !== false}
                              onChange={() => handleToggleActive(c._id, c.isActive !== false, c.name)}
                            />
                            <div className={`switch-track ${c.isActive !== false ? "active" : ""}`}>
                              <div className="switch-thumb" />
                            </div>
                          </label>
                        </div>

                        {/* Carousel Curation Expand Icon */}
                        <button 
                          className="icon-btn" 
                          onClick={() => toggleExpand(c.slug)} 
                          title="Manage Homepage Carousel Row"
                          style={{
                            borderColor: expandedCategory === c.slug ? "var(--primary)" : undefined,
                            color: expandedCategory === c.slug ? "var(--primary)" : undefined,
                            background: expandedCategory === c.slug ? "rgba(255,209,26,0.08)" : undefined
                          }}
                        >
                          <LayoutGrid size={14} />
                        </button>

                        {/* Edit Button */}
                        <button className="icon-btn edit" onClick={() => openEditModal(c)} title="Edit Category">
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button className="icon-btn del" onClick={() => handleDelete(c._id, c.name)} title="Delete Category">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Inline Carousel Curation */}
                  {expandedCategory === c.slug && (
                    <tr className="expanded-row">
                      <td colSpan={7}>
                        <div className="cat-curation-panel">
                          <div className="cat-curation-header">
                            <div className="cat-curation-title">
                              <LayoutGrid size={16} style={{ color: "var(--primary)" }} />
                              <span>Homepage Curation Row: <strong>{c.name}</strong></span>
                            </div>
                            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                              Click items to toggle row visibility, type numbers to change sequence
                            </span>
                          </div>
                          {renderInlineCarousel(c._id, c.slug)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="7" className="tbl-placeholder">
                    {searchQuery ? `No categories matching "${searchQuery}"` : "No categories found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={18} style={{ color: "var(--primary)" }} /> 
                {isEditing ? "Edit Category" : "Add New Category"}
              </h3>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label className="form-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Category Name <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Trending, Action, Romance..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  style={{ fontSize: "0.88rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label className="form-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Display Priority
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                  style={{ fontSize: "0.88rem" }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Higher priority values appear first on platform listings.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>Active Status</h4>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)" }}>Visible to end-users across OTT apps</p>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    className="switch-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <div className={`switch-track ${isActive ? "active" : ""}`}>
                    <div className="switch-thumb" />
                  </div>
                </label>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? "Saving..." : (isEditing ? "Update Category" : "Create Category")}
              </button>
            </div>
          </div>
        </div>
      )}

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
