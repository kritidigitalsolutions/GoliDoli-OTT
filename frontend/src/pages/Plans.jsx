import { useState, useEffect } from "react";
import { Pencil, Trash2, Eye, X } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function PlansPage() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    features: "",
    planType: "monthly",
    sortOrder: 0,
    isRecommended: false,
    isActive: true
  });

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);

  // =========================
  // 🧠 INPUT CHANGE
  // =========================
  const ch = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const chEdit = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setEditForm({ ...editForm, [e.target.name]: value });
  };

  // =========================
  // 📥 FETCH PLANS
  // =========================
  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plan");
      setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================
  // ➕ CREATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        planType: form.planType,
        sortOrder: Number(form.sortOrder),
        isRecommended: form.isRecommended,
        isActive: form.isActive
      };

      await API.post("/admin/plan", payload);
      alert("Plan created successfully.");

      setForm({
        name: "",
        price: "", 
        duration: "",
        features: "",
        planType: "monthly",
        sortOrder: 0,
        isRecommended: false,
        isActive: true
      });

      fetchPlans();

    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    }

    setLoading(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: editForm.name,
        price: Number(editForm.price),
        duration: Number(editForm.duration),
        features: typeof editForm.features === 'string'
          ? editForm.features.split(",").map((f) => f.trim()).filter(Boolean)
          : [],
        planType: editForm.planType,
        sortOrder: Number(editForm.sortOrder),
        isRecommended: editForm.isRecommended,
        isActive: editForm.isActive
      };

      await API.patch(`/admin/plan/${editForm._id}`, payload);
      alert("Plan updated successfully.");

      setEditForm(null);
      fetchPlans();

    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    }

    setLoading(false);
  };

  // =========================
  // ❌ DELETE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await API.delete(`/admin/plan/${id}`);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // ✏️ EDIT
  // =========================
  const handleEdit = (plan) => {
    setEditForm({
      _id: plan._id,
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      planType: ["monthly", "yearly"].includes(plan.planType)
        ? plan.planType
        : "monthly",
      sortOrder: plan.sortOrder || 0,
      isRecommended: plan.isRecommended || false,
      isActive: plan.isActive !== false
    });
  };

  // =========================
  // 🔄 TOGGLE STATUS
  // =========================
  const handleToggleActive = async (plan) => {
    try {
      const updatedIsActive = plan.isActive === false ? true : false;
      await API.patch(`/admin/plan/${plan._id}`, { isActive: updatedIsActive });
      setPlans(plans.map(p => p._id === plan._id ? { ...p, isActive: updatedIsActive } : p));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle status");
    }
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">💳 Subscription Plans</h1>
        <p className="pg-sub">Create and manage plans</p>
      </div>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>Create New Plan</h3>

          <div className="form-2col">
            <div className="form-row">
              <label className="form-label">Plan Name *</label>
              <input
                className="form-input-styled"
                name="name"
                placeholder="Plan Name (Basic, Premium)"
                value={form.name}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row">
              <label className="form-label">Price (₹) *</label>
              <input
                className="form-input-styled"
                name="price"
                type="number"
                placeholder="Price (₹)"
                value={form.price}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row">
              <label className="form-label">Duration (days) *</label>
              <input
                className="form-input-styled"
                name="duration"
                type="number"
                placeholder="Duration (days)"
                value={form.duration}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row form-full">
              <label className="form-label">Features</label>
              <input
                className="form-input-styled"
                name="features"
                placeholder="Features (comma separated)"
                value={form.features}
                onChange={ch}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Billing Cycle</label>
              <select
                className="form-input-styled"
                name="planType"
                value={form.planType}
                onChange={ch}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Sort Order</label>
              <input
                className="form-input-styled"
                name="sortOrder"
                type="number"
                placeholder="Sort Order (e.g. 1)"
                value={form.sortOrder}
                onChange={ch}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                name="isRecommended"
                checked={form.isRecommended}
                onChange={ch}
              />
              Recommended Plan
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={ch}
              />
              Active (Visible to users)
            </label>
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading ? "Processing..." : "Create Plan"}
          </button>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="content-box" style={{ marginTop: 24 }}>
        <h3>All Plans</h3>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Status</th>
                <th>Recommended</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="5">No plans found</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>₹{p.price}</td>
                    <td>{p.duration} days</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.planType || "Monthly"}</td>
                    <td>
                      <label className="switch-container" title={p.isActive !== false ? "Click to disable" : "Click to enable"}>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={p.isActive !== false}
                          onChange={() => handleToggleActive(p)}
                        />
                        <span className="switch-slider"></span>
                      </label>
                    </td>
                    <td>{p.isRecommended ? "Yes" : "No"}</td>

                    {/* <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-sm"
                        onClick={() => handleEdit(p)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="btn-sm danger"
                        onClick={() => handleDelete(p._id)}
                      >
                        ❌ Delete
                      </button>
                    </td> */}
                    <td className="actions">
                      <button
                        className="icon-btn view"
                        onClick={() => setViewPlan(p)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="icon-btn edit"
                        onClick={() => handleEdit(p)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

  <button
    className="icon-btn delete"
    onClick={() => handleDelete(p._id)}
    title="Delete"
  >
    <Trash2 size={16} />
  </button>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ================= VIEW MODAL ================= */}
      {viewPlan && (
        <div className="modal-overlay" onClick={() => setViewPlan(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>💳 Plan Details</h3>
              <button className="modal-close" onClick={() => setViewPlan(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              <div className="profile-details-grid" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan Name</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.name}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Price</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{viewPlan.price}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.duration} days</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Type</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{viewPlan.planType || 'Monthly'}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    <span className={viewPlan.isActive !== false ? "status active" : "status expired"}>
                      {viewPlan.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Recommended</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.isRecommended ? 'Yes' : 'No'}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: "1 / -1" }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Features</span>
                  <span className="p-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewPlan.features && viewPlan.features.length > 0 
                      ? viewPlan.features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: 'var(--primary-color)' }}>✓</span> {f}
                          </div>
                        )) 
                      : "No features added"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editForm && (
        <div className="modal-overlay" onClick={() => setEditForm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>✏️ Edit Plan</h3>
              <button className="modal-close" onClick={() => setEditForm(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              <form onSubmit={handleEditSubmit} style={{ padding: 24 }}>
                <div className="form-2col">
                  <div className="form-row">
                    <label className="form-label">Plan Name *</label>
                    <input
                      className="form-input-styled"
                      name="name"
                      placeholder="Plan Name (Basic, Premium)"
                      value={editForm.name}
                      onChange={chEdit}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label className="form-label">Price (₹) *</label>
                    <input
                      className="form-input-styled"
                      name="price"
                      type="number"
                      placeholder="Price (₹)"
                      value={editForm.price}
                      onChange={chEdit}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label className="form-label">Duration (days) *</label>
                    <input
                      className="form-input-styled"
                      name="duration"
                      type="number"
                      placeholder="Duration (days)"
                      value={editForm.duration}
                      onChange={chEdit}
                      required
                    />
                  </div>

                  <div className="form-row form-full">
                    <label className="form-label">Features</label>
                    <input
                      className="form-input-styled"
                      name="features"
                      placeholder="Features (comma separated)"
                      value={editForm.features}
                      onChange={chEdit}
                    />
                  </div>

                  <div className="form-row">
                    <label className="form-label">Billing Cycle</label>
                    <select
                      className="form-input-styled"
                      name="planType"
                      value={editForm.planType}
                      onChange={chEdit}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label className="form-label">Sort Order</label>
                    <input
                      className="form-input-styled"
                      name="sortOrder"
                      type="number"
                      placeholder="Sort Order (e.g. 1)"
                      value={editForm.sortOrder}
                      onChange={chEdit}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input
                      type="checkbox"
                      name="isRecommended"
                      checked={editForm.isRecommended}
                      onChange={chEdit}
                    />
                    Recommended Plan
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={editForm.isActive}
                      onChange={chEdit}
                    />
                    Active (Visible to users)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn-lg" style={{ background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setEditForm(null)}>Cancel</button>
                  <button
                    className="btn-lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Update Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
