import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { Layers, Plus, Search, ChevronUp, ChevronDown, Edit2, Trash2, X, Check, RefreshCw, Eye, EyeOff, LayoutGrid, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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

  // Inline Curation State
  const [expandedCategory, setExpandedCategory] = useState(null);
  // curatedMap: { [categoryId]: [{ contentType, contentId (full object or id) }] }
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
    if (!name.trim()) return alert("Name is required");
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
      alert(err?.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete category");
    }
  };

  const updatePriority = async (id, value) => {
    const newPriority = parseInt(value, 10);
    if (isNaN(newPriority) || newPriority < 0) return;

    const cat = categories.find(c => c._id === id);
    if (!cat) return;
    if (cat.priority === newPriority) return; // No change needed

    try {
      await API.put(`/admin/categories/${id}`, {
        name: cat.name,
        priority: newPriority,
        isActive: cat.isActive
      });
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update priority");
    }
  };

  const handleToggleActive = async (id, currentActive, name) => {
    try {
      await API.put(`/admin/categories/${id}`, {
        name,
        isActive: !currentActive
      });
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  const totalCount = categories.length;
  const activeCount = categories.filter(c => c.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;

  const filteredCategories = categories.filter(c => {
    if (activeTab === "Active" && c.isActive === false) return false;
    if (activeTab === "Inactive" && c.isActive !== false) return false;
    if (searchQuery) {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ── Inline Curation Helpers ── */

  // Save curated items for a category directly to the category model
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
      alert(msg);
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

    // All content tagged with this category (slug, name, or id)
    let connected = contentList.filter(i => {
      if (!Array.isArray(i.category)) return false;
      return i.category.includes(slug) ||
             (catObj && i.category.includes(catObj.name)) ||
             (catObj && i.category.includes(catObj._id));
    });

    if (connected.length === 0) {
      return (
        <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 10, color: "var(--orange)", background: "rgba(255,140,0,0.1)", borderRadius: 12, margin: 10 }}>
          <AlertCircle size={18} />
          <span>No published content tagged with <strong>{catObj ? catObj.name : slug}</strong>. Tag content from the Content Library first.</span>
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
      <div className="wl-curator" style={{ margin: 0, border: "none", background: "transparent" }}>
        <div className="wl-curator-toolbar" style={{ marginTop: 0 }}>
          <span className="wl-count-label">{selectedList.length} selected for this row</span>
          <div className="search-bar wl-mini-search" style={{ margin: 0 }}>
            <Search size={13} className="search-icon" />
            <input className="search-input" placeholder="Filter available content…"
              value={searchQ}
              onChange={e => setSectionSearches(p => ({ ...p, [slug]: e.target.value }))} />
            {searchQ && <button className="search-clear" onClick={() => setSectionSearches(p => ({ ...p, [slug]: "" }))}><X size={12} /></button>}
          </div>
        </div>

        {savingLayout && <div style={{ fontSize: "12px", color: "var(--primary)", marginBottom: 10 }}>Saving to homepage...</div>}

        <div className="wl-grid">
          {/* Selected Items */}
          {selectedList.map((item, idx) => (
            <div key={item._id} className="wl-card wl-card--selected">
              <div className="wl-card-media" onClick={() => toggleCarouselItem(catId, slug, item, true)} title="Click to remove from row">
                <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                <div className="wl-card-badge wl-card-badge--check"><Check size={10} /></div>
                <label className="wl-card-pos" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', cursor: 'text', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} title="Type to change order">
                  <span style={{ marginRight: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pos</span>
                  <input 
                    className="pos-input-no-arrows"
                    key={`pos-${catId}-${item._id}-${idx}`}
                    type="number" 
                    defaultValue={idx + 1}
                    onBlur={e => {
                      moveToPos(catId, idx, e.target.value);
                      e.target.value = idx + 1; // Force visual reset to bounded value
                    }}
                    onKeyDown={e => {
                      if(e.key === 'Enter') e.target.blur();
                    }}
                    style={{
                      width: "36px",
                      background: "rgba(255,255,255,0.2)",
                      border: "1px dashed rgba(255,255,255,0.6)",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "13px",
                      outline: "none",
                      textAlign: "center",
                      padding: "2px 0",
                      borderRadius: "4px"
                    }}
                    min="1"
                    max={selectedList.length}
                  />
                  <Edit2 size={12} style={{ marginLeft: '6px', opacity: 0.9 }} />
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
              <div className="wl-card-media" onClick={() => toggleCarouselItem(catId, slug, item, false)} title="Click to add to row">
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
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Layers size={28} style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} /> Categories</h1>
          <p className="pg-sub">Manage content categories displayed across the platform</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-ghost" onClick={fetchCategories}>
            <RefreshCw size={16} style={{ marginRight: 6 }} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} style={{ marginRight: 6 }} /> Add Category
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "25px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--primary)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>{totalCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--success)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>{activeCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>ACTIVE</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--danger)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", marginBottom: "4px" }}>{inactiveCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>INACTIVE</div>
        </div>
      </div>

      <div className="content-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ position: "relative", width: "300px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "40px", borderRadius: "20px" }}
            />
          </div>

          <div style={{ display: "flex", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "20px", padding: "4px" }}>
            {["All", "Active", "Inactive"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "var(--primary)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-muted)",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>CATEGORY</th>
                <th>SLUG</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((c, index) => (
                <React.Fragment key={c._id}>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", fontWeight: "500" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        background: "rgba(229, 9, 20, 0.1)", color: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "700", marginRight: "12px"
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td>
                    <span style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {c.slug}
                    </span>
                  </td>
                  <td>
                    <input
                      key={`priority-${c._id}-${c.priority}`}
                      type="number"
                      defaultValue={c.priority || 0}
                      onBlur={(e) => updatePriority(c._id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      style={{
                        width: "70px",
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        color: "var(--primary)",
                        fontWeight: "700",
                        fontSize: "14px",
                        padding: "6px",
                        borderRadius: "8px",
                        textAlign: "center",
                        outline: "none"
                      }}
                      min="0"
                    />
                  </td>
                  <td>
                    <span className={`badge ${c.isActive !== false ? "badge-active" : "badge-blocked"}`}>
                      {c.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(c.createdAt)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="tbl-actions" style={{ justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", marginRight: "8px" }} title={c.isActive !== false ? "Deactivate" : "Activate"}>
                        <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={c.isActive !== false}
                            onChange={() => handleToggleActive(c._id, c.isActive !== false, c.name)}
                            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                          />
                          <div style={{
                            width: "34px", height: "20px",
                            backgroundColor: c.isActive !== false ? "#10b981" : "#3f3f46",
                            borderRadius: "20px", position: "relative", transition: "background-color 0.2s"
                          }}>
                            <div style={{
                              position: "absolute", top: "2px", left: "2px",
                              width: "16px", height: "16px", backgroundColor: "#fff",
                              borderRadius: "50%", transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              transform: c.isActive !== false ? "translateX(14px)" : "translateX(0)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                            }} />
                          </div>
                        </label>
                      </div>
                      <button className="icon-btn" onClick={() => toggleExpand(c.slug)} title="Manage Homepage Carousel Row">
                        <LayoutGrid size={16} style={{ color: expandedCategory === c.slug ? "var(--primary)" : "inherit" }} />
                      </button>
                      <button className="icon-btn" onClick={() => openEditModal(c)}><Edit2 size={16} /></button>
                      <button className="icon-btn del" onClick={() => handleDelete(c._id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
                {expandedCategory === c.slug && (
                  <tr className="expanded-row" style={{ background: "var(--surface)" }}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div style={{ borderLeft: "3px solid var(--primary)", borderBottom: "1px solid var(--border)", background: "var(--background)", padding: "24px" }}>
                        {renderInlineCarousel(c._id, c.slug)}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-head">
              <h3><Layers size={18} style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} /> {isEditing ? "Edit Category" : "Add New Category"}</h3>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>CATEGORY NAME <span style={{ color: "var(--primary)" }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Trending, Action, Romance..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}># PRIORITY</label>
                <input
                  type="number"
                  className="form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                  Higher value = appears first in category listings
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "var(--text)" }}>Active Category</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Visible to users across the platform</p>
                </div>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                  <div style={{
                    width: "44px", height: "24px",
                    backgroundColor: isActive ? "#10b981" : "#3f3f46",
                    borderRadius: "24px", position: "relative", transition: "background-color 0.2s"
                  }}>
                    <div style={{
                      position: "absolute", top: "3px", left: "3px",
                      width: "18px", height: "18px", backgroundColor: "#fff",
                      borderRadius: "50%", transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: isActive ? "translateX(20px)" : "translateX(0)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }} />
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
    </div>
  );
}
