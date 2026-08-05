import { useState, useEffect } from "react";
import { Pencil, Trash2, X, Layers, Loader, CheckCircle, AlertCircle, Search, Plus } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    priority: 0,
    isActive: true
  });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Success / Error Alerts
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await API.get("/admin/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch categories.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleOpenAddModal = () => {
    setMessage("");
    setError("");
    setForm({
      name: "",
      priority: 0,
      isActive: true
    });
    setEditId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (category) => {
    setMessage("");
    setError("");
    setForm({
      name: category.name,
      priority: category.priority || 0,
      isActive: category.isActive !== false
    });
    setEditId(category._id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      name: "",
      priority: 0,
      isActive: true
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        name: form.name,
        priority: Number(form.priority),
        isActive: form.isActive
      };

      if (editId) {
        const res = await API.patch(`/admin/categories/${editId}`, payload);
        setMessage(res.data.message || "Category updated successfully.");
      } else {
        const res = await API.post("/admin/categories", payload);
        setMessage(res.data.message || "Category created successfully.");
      }

      handleCloseModal();
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;

    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete category.");
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const updatedIsActive = category.isActive === false ? true : false;
      await API.patch(`/admin/categories/${category._id}`, { isActive: updatedIsActive });
      
      // Update state locally for immediate feedback
      setCategories(categories.map(c => c._id === category._id ? { ...c, isActive: updatedIsActive } : c));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle status");
    }
  };

  // Client-side filtering for Search Bar
  const filteredCategories = categories.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (fetching) {
    return (
      <div className="page-section" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <p>
          <Loader size={24} style={{ display: "inline-block", marginRight: 8 }} />
          Loading categories...
        </p>
      </div>
    );
  }

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="pg-title">
            <Layers size={28} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
            Categories Management
          </h1>
          <p className="pg-sub">Create, edit, and organize content categories and priorities</p>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table Section */}
      <div className="content-box">
        {/* Search Bar */}
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input
              placeholder="Search categories by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <p>No categories found 😕</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>{c.priority}</td>
                    <td className="u-name">{c.name}</td>
                    <td style={{ color: "var(--text-soft)" }}>{c.slug}</td>
                    <td>
                      <label className="switch-container" title={c.isActive !== false ? "Click to deactivate" : "Click to activate"}>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={c.isActive !== false}
                          onChange={() => handleToggleActive(c)}
                        />
                        <span className="switch-slider"></span>
                      </label>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button
                          className="icon-btn edit"
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Category"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(c._id)}
                          title="Delete Category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h3>{editId ? "✏️ Edit Category" : "➕ Add Category"}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <label className="form-label">Category Name</label>
                  <input
                    className="form-input"
                    name="name"
                    placeholder="e.g. Action, Trending, Recommended"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: 16 }}>
                  <label className="form-label">Priority Order</label>
                  <input
                    className="form-input"
                    name="priority"
                    type="number"
                    placeholder="Priority (e.g. 1, 2)"
                    value={form.priority}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    Active (Visible on user apps)
                  </label>
                </div>
              </div>

              <div className="modal-foot">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    marginRight: 10
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-lg"
                  type="submit"
                  disabled={loading}
                  style={{ padding: "10px 20px" }}
                >
                  {loading ? "Processing..." : editId ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
