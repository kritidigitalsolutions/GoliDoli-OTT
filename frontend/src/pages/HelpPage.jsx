import { useEffect, useState } from "react";
import API from "../api/axios";
import { HelpCircle, Eye, Edit2, X, Save, Trash2, Phone, Mail, Plus } from "lucide-react";
import "./Dashboard.css";

export default function HelpPage() {
  const [help, setHelp] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const [isAdding, setIsAdding] = useState(false);
  const [supportModal, setSupportModal] = useState(null); // { type: 'phone'|'email', item: obj, value: '' }

  useEffect(() => {
    fetchHelp();
  }, []);

  const fetchHelp = async () => {
    try {
      const res = await API.get("/admin/help");
      setHelp(res.data.data || []);
    } catch (error) {
      console.error("Fetch Help Error:", error);
      setHelp([]);
    }
  };

  const handleSave = async () => {
    try {
      await API.put(`/admin/help/${selected._id}`, selected);
      setSelected(null);
      fetchHelp();
    } catch (error) {
      alert("Update failed");
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      await API.post("/admin/help", selected);
      setSelected(null);
      setIsAdding(false);
      fetchHelp();
    } catch (error) {
      alert("Create failed");
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      await API.delete(`/admin/help/${id}`);
      fetchHelp();
    } catch (error) {
      alert("Delete failed");
      console.error(error);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      await API.patch(`/admin/help/${id}/toggle`);
      fetchHelp();
    } catch (error) {
      alert("Toggle visibility failed");
      console.error(error);
    }
  };

  const handleSaveSupport = async () => {
    if (!supportModal) return;
    const { type, item, value } = supportModal;
    if (!value.trim()) {
      alert("Value cannot be empty");
      return;
    }

    try {
      if (item) {
        // Edit mode
        const updatedItem = {
          ...item,
          question: type === "phone" ? "Support Number" : "Support Email",
          answer: type === "phone" ? `Support Number: ${value}` : `Support Email: ${value}`,
          supportNumber: type === "phone" ? value : "",
          supportEmail: type === "email" ? value : ""
        };
        await API.put(`/admin/help/${item._id}`, updatedItem);
      } else {
        // Add mode
        const newItem = {
          category: "contact-support",
          question: type === "phone" ? "Support Number" : "Support Email",
          answer: type === "phone" ? `Support Number: ${value}` : `Support Email: ${value}`,
          supportNumber: type === "phone" ? value : "",
          supportEmail: type === "email" ? value : "",
          isPublished: true
        };
        await API.post("/admin/help", newItem);
      }
      setSupportModal(null);
      fetchHelp();
    } catch (error) {
      alert("Operation failed");
      console.error(error);
    }
  };

  const handleDeleteSupport = async (id, label) => {
    if (!window.confirm(`Delete support ${label}?`)) return;
    try {
      await API.delete(`/admin/help/${id}`);
      fetchHelp();
    } catch (error) {
      alert("Delete failed");
      console.error(error);
    }
  };

  const handleToggleSupport = async (id) => {
    try {
      await API.patch(`/admin/help/${id}/toggle`);
      fetchHelp();
    } catch (error) {
      alert("Toggle visibility failed");
      console.error(error);
    }
  };

  const open = (item, m) => {
    setSelected(item);
    setMode(m);
  };

  // Filter FAQs and Support Channels
  const faqs = help.filter((item) => item.category !== "contact-support");
  const phoneSupport = help.find((item) => item.category === "contact-support" && item.supportNumber);
  const emailSupport = help.find((item) => item.category === "contact-support" && item.supportEmail);

  return (
    <div className="page-section">
      <div className="pg-header">
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelected({ question: "", answer: "", category: "", supportNumber: "", supportEmail: "", isPublished: true });
              setMode("add");
              setIsAdding(true);
            }}
          >
            ➕ Add Help Card
          </button>
        </div>
        <div>
          <h1 className="pg-title">
            <HelpCircle size={28} style={{ display: "inline-block", marginRight: 8 }} /> Help Center
          </h1>
          <p className="pg-sub">Manage your platform's FAQ and support articles</p>
        </div>
      </div>

      {/* ── Support Contact Channels Section ── */}
      <div className="content-box" style={{ marginBottom: 28, padding: "24px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          📞 Support Channels
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          
          {/* Support Phone Number */}
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone size={14} /> Phone Support
                </span>
                {phoneSupport && (
                  <span
                    className={`badge ${phoneSupport.isPublished !== false ? "badge-pub" : "badge-draft"}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleToggleSupport(phoneSupport._id)}
                    title="Click to toggle visibility"
                  >
                    {phoneSupport.isPublished !== false ? "👁️ Published" : "👁️‍🗨️ Draft"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-main)", margin: "8px 0" }}>
                {phoneSupport ? phoneSupport.supportNumber : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: "normal" }}>Not Configured</span>}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              {phoneSupport ? (
                <>
                  <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.85rem" }} onClick={() => setSupportModal({ type: "phone", item: phoneSupport, value: phoneSupport.supportNumber })}>
                    <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.85rem", color: "var(--red)" }} onClick={() => handleDeleteSupport(phoneSupport._id, "phone number")}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.85rem" }} onClick={() => setSupportModal({ type: "phone", item: null, value: "" })}>
                  <Plus size={14} style={{ marginRight: 6 }} /> Add Phone Number
                </button>
              )}
            </div>
          </div>

          {/* Support Email */}
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Mail size={14} /> Email Support
                </span>
                {emailSupport && (
                  <span
                    className={`badge ${emailSupport.isPublished !== false ? "badge-pub" : "badge-draft"}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleToggleSupport(emailSupport._id)}
                    title="Click to toggle visibility"
                  >
                    {emailSupport.isPublished !== false ? "👁️ Published" : "👁️‍🗨️ Draft"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-main)", margin: "8px 0", wordBreak: "break-all" }}>
                {emailSupport ? emailSupport.supportEmail : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: "normal" }}>Not Configured</span>}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              {emailSupport ? (
                <>
                  <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.85rem" }} onClick={() => setSupportModal({ type: "email", item: emailSupport, value: emailSupport.supportEmail })}>
                    <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.85rem", color: "var(--red)" }} onClick={() => handleDeleteSupport(emailSupport._id, "email address")}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.85rem" }} onClick={() => setSupportModal({ type: "email", item: null, value: "" })}>
                  <Plus size={14} style={{ marginRight: 6 }} /> Add Email Address
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "16px" }}>📚 FAQ & Support Articles</h2>

      {faqs.length === 0 ? (
        <div className="content-box">
          <div className="empty-state">
            <p>No help articles found.</p>
          </div>
        </div>
      ) : (
        <div className="doc-grid">
          {faqs.map((item, i) => (
            <div key={item._id || i} className="doc-card" style={{ opacity: item.isPublished === false ? 0.75 : 1 }}>
              <div className="doc-card-head">
                <h3>{item.question}</h3>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => open(item, "view")} title="View">
                    <Eye size={16} />
                  </button>
                  <button className="icon-btn edit" onClick={() => open(item, "edit")} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn del" onClick={() => handleDelete(item._id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: 4, marginBottom: 8 }}>
                {item.category && <span className="badge badge-active">{item.category}</span>}
                <span
                  className={`badge ${item.isPublished !== false ? "badge-pub" : "badge-draft"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTogglePublish(item._id)}
                  title="Click to toggle visibility"
                >
                  {item.isPublished !== false ? "👁️ Published" : "👁️‍🗨️ Draft"}
                </span>
              </div>

              <p className="doc-excerpt">{item.answer}</p>
            </div>
          ))}
        </div>
      )}

      {(selected || isAdding) && selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>
                {mode === "view" ? (
                  <>👁️ View FAQ</>
                ) : mode === "edit" ? (
                  <>✏️ Edit FAQ</>
                ) : (
                  <>➕ Add FAQ</>
                )}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setSelected(null);
                  setIsAdding(false);
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Question</label>
                <input
                  className="form-input"
                  value={selected.question || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, question: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={selected.category || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="faq">FAQ</option>
                  <option value="account-help">Account Help</option>
                  <option value="cancel-subscription">Cancel Subscription</option>
                  <option value="report-problem">Report Problem</option>
                </select>
              </div>
              <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={selected.isPublished !== false}
                  disabled={mode === "view"}
                  style={{ width: 18, height: 18, cursor: mode === "view" ? "not-allowed" : "pointer" }}
                  onChange={(e) => setSelected({ ...selected, isPublished: e.target.checked })}
                />
                <label htmlFor="isPublished" className="form-label" style={{ margin: 0, cursor: mode === "view" ? "not-allowed" : "pointer" }}>
                  Publish Article (Visible to users)
                </label>
              </div>
              <div className="form-row">
                <label className="form-label">Answer</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={selected.answer || ""}
                  disabled={mode === "view"}
                  style={{ resize: "vertical" }}
                  onChange={(e) => setSelected({ ...selected, answer: e.target.value })}
                />
              </div>
            </div>
            {(mode === "edit" || mode === "add") && (
              <div className="modal-foot">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSelected(null);
                    setIsAdding(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={mode === "edit" ? handleSave : handleCreate}
                >
                  <Save size={16} style={{ marginRight: 6 }} />
                  {mode === "edit" ? "Save Changes" : "Create"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Support Channel Add/Edit Modal */}
      {supportModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 450 }}>
            <div className="modal-head">
              <h3>
                {supportModal.item ? "✏️ Edit" : "➕ Add"}{" "}
                {supportModal.type === "phone" ? "Support Number" : "Support Email"}
              </h3>
              <button className="modal-close" onClick={() => setSupportModal(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">
                  {supportModal.type === "phone" ? "Phone Number" : "Email Address"}
                </label>
                <input
                  className="form-input"
                  type={supportModal.type === "phone" ? "tel" : "email"}
                  value={supportModal.value}
                  placeholder={supportModal.type === "phone" ? "e.g. +91 9876543210" : "e.g. support@golidoli.com"}
                  onChange={(e) => setSupportModal({ ...supportModal, value: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setSupportModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveSupport}>
                <Save size={16} style={{ marginRight: 6 }} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
