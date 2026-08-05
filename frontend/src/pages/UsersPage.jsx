import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X, Lock, Unlock, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./Dashboard.css";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subFilter, setSubFilter] = useState(""); // "" | "subscribed" | "unsubscribed"
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const limit = 10;

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search input
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch users when page, debounced search, or subFilter changes
  useEffect(() => {
    fetchUsers(page, debouncedSearch, subFilter);
  }, [page, debouncedSearch, subFilter]);

  const fetchUsers = async (currentPage = page, currentSearch = debouncedSearch, currentSubFilter = subFilter) => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users", {
        params: {
          page: currentPage,
          limit,
          search: currentSearch,
          subFilter: currentSubFilter,
        },
      });
      setUsers(res.data.users || []);
      setSelectedUserIds(new Set());
      setTotalPages(res.data.pages || 1);
      setTotalUsers(res.data.total || 0);
      setActiveCount(res.data.active || 0);
      setBlockedCount(res.data.blocked || 0);
    } catch {
      setUsers([]);
      setSelectedUserIds(new Set());
      setTotalPages(1);
      setTotalUsers(0);
      setActiveCount(0);
      setBlockedCount(0);
    }
    setLoading(false);
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected = users.length > 0 && users.every(u => selectedUserIds.has(u._id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        users.forEach(u => next.delete(u._id));
        return next;
      });
    } else {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        users.forEach(u => next.add(u._id));
        return next;
      });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = selectedUserIds.size > 0 
      ? users.filter(u => selectedUserIds.has(u._id))
      : users;

    if (dataToExport.length === 0) {
      alert("No users to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map((u, i) => ({
      "S.No": i + 1,
      "Name": u.name,
      "Email": u.email,
      "Phone": u.phone || "N/A",
      "Joined Date": u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A",
      "Auth Method": u.authProvider || "N/A",
      "Subscription Plan": u.plan || "Free",
      "Status": u.status
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, `users-export-${Date.now()}.xlsx`);
  };

  const handleExportPDF = () => {
    const dataToExport = selectedUserIds.size > 0 
      ? users.filter(u => selectedUserIds.has(u._id))
      : users;

    if (dataToExport.length === 0) {
      alert("No users to export.");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("GoliDoli OTT - Users Management Report", 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);
    doc.text(`Export Type: ${selectedUserIds.size > 0 ? "Selected Users" : "All Page Users"} (${dataToExport.length} total)`, 14, 26);

    const tableColumn = ["S.No", "Name", "Email", "Phone", "Joined Date", "Auth Method", "Subscription", "Status"];
    const tableRows = dataToExport.map((u, i) => [
      i + 1,
      u.name,
      u.email,
      u.phone || "N/A",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A",
      u.authProvider || "N/A",
      u.plan || "Free",
      u.status
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    });

    doc.save(`users-report-${Date.now()}.pdf`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      fetchUsers(page, debouncedSearch);
    } catch { alert("Failed to delete"); }
  };

  const handleToggleBlock = async (user) => {
    const action = user.status === "Blocked" ? "unblock" : "block";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await API.patch(`/admin/users/${user._id}/block`);
      if (res.data.success) {
        // Optimistically update local list state
        setUsers(prev =>
          prev.map(u => (u._id === user._id ? { ...u, status: res.data.user.status } : u))
        );
        // Update stats counters
        if (res.data.user.status === "Blocked") {
          setActiveCount(prev => Math.max(0, prev - 1));
          setBlockedCount(prev => prev + 1);
        } else {
          setActiveCount(prev => prev + 1);
          setBlockedCount(prev => Math.max(0, prev - 1));
        }

        if (selected && selected._id === user._id) {
          setSelected(prev => ({ ...prev, status: res.data.user.status }));
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} user`);
    }
  };

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users</p>
        </div>
        <button className="btn btn-primary" onClick={() => fetchUsers(page, debouncedSearch)}><RefreshCw size={16} style={{ display: "inline-block", marginRight: 6 }} /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card s-green">
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{totalUsers}</div>
        </div>
        <div className="stat-card s-blue">
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat-card s-red">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{blockedCount}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            <div className="search-field" style={{ flex: 1, minWidth: "240px" }}>
              <Search size={18} />
              <input placeholder="Search by name, email or phone..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            
            <div className="sub-filter-toggle" style={{ display: "flex", gap: 6, background: "var(--bg3)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
              <button
                className={`btn ${subFilter === "" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
                onClick={() => { setSubFilter(""); setPage(1); }}
              >
                All Users
              </button>
              <button
                className={`btn ${subFilter === "subscribed" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
                onClick={() => { setSubFilter("subscribed"); setPage(1); }}
              >
                Subscribed
              </button>
              <button
                className={`btn ${subFilter === "unsubscribed" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
                onClick={() => { setSubFilter("unsubscribed"); setPage(1); }}
              >
                Unsubscribed
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {selectedUserIds.size > 0 && (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginRight: 4 }}>
                <strong>{selectedUserIds.size}</strong> selected
              </span>
            )}
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: "0.85rem", height: "auto", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}
              title={selectedUserIds.size > 0 ? "Export selected users to Excel" : "Export current page users to Excel"}
            >
              <FileSpreadsheet size={16} style={{ color: "#10b981" }} />
              {selectedUserIds.size > 0 ? "Export Excel" : "Export All Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: "0.85rem", height: "auto", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}
              title={selectedUserIds.size > 0 ? "Export selected users to PDF" : "Export current page users to PDF"}
            >
              <FileText size={16} style={{ color: "#ec4899" }} />
              {selectedUserIds.size > 0 ? "Export PDF" : "Export All PDF"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8 }} /> Loading users...</p></div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Method</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={9}>
                      <div className="empty-state"><p>No users found</p></div>
                    </td></tr>
                  ) : users.map((u, i) => {
                    const itemIndex = (page - 1) * limit + i + 1;
                    return (
                      <tr key={u._id || i}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u._id)}
                            onChange={() => handleToggleSelectUser(u._id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{itemIndex}</td>
                        <td>
                          <div className="user-cell">
                            <div className="u-avatar">
                              {u.profileImage ? (
                                <img src={getImageUrl(u.profileImage)} alt={u.name} />
                              ) : (
                                u.name ? u.name[0].toUpperCase() : "U"
                              )}
                            </div>
                            <span className="u-name">{u.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-soft)" }}>{u.email || "—"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span className="badge badge-ghost" style={{ textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 700 }}>
                            {u.authProvider || "PHONE"}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: !u.plan || u.plan === "Free" ? "rgba(255,255,255,0.05)" : "var(--primary-glow, rgba(79, 70, 229, 0.15))",
                            color: !u.plan || u.plan === "Free" ? "var(--text-muted)" : "var(--primary, #4f46e5)",
                            border: "1px solid " + (!u.plan || u.plan === "Free" ? "var(--border)" : "var(--primary)"),
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase"
                          }}>
                            {u.plan || "Free"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.status === "Blocked" ? "badge-blocked" : "badge-active"}`}>
                            {u.status === "Blocked" ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions">
                            <button className="icon-btn view" onClick={() => setSelected(u)} title="View Profile"><Eye size={16} /></button>
                            {u.status === "Blocked" ? (
                              <button className="icon-btn view" onClick={() => handleToggleBlock(u)} title="Unblock User" style={{ color: "#10b981" }}><Unlock size={16} /></button>
                            ) : (
                              <button className="icon-btn del" onClick={() => handleToggleBlock(u)} title="Block User" style={{ color: "#ef4444" }}><Lock size={16} /></button>
                            )}
                            <button className="icon-btn del" onClick={() => handleDelete(u._id)} title="Delete User"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <span className="pagination-info" style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  Showing Page {page} of {totalPages} ({totalUsers} total users)
                </span>
                <div className="pagination-btns" style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              {/* Profile Hero */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <p>{selected.email || "No Email"}</p>
                    <span className={`badge ${selected.status === "Blocked" ? "badge-blocked" : "badge-active"}`}>
                      {selected.status === "Blocked" ? "BLOCKED" : "ACTIVE ACCOUNT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Subscription Plan</span>
                  <span className="p-detail-value" style={{ fontWeight: 700, color: !selected.plan || selected.plan === "Free" ? "var(--text-soft)" : "var(--primary, #4f46e5)", textTransform: "uppercase" }}>
                    {selected.plan || "Free"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Status</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Sign-in Method</span>
                  <span className="p-detail-value text-primary" style={{ textTransform: "uppercase", fontWeight: 700 }}>{selected.authProvider || "PHONE"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt?.$date 
                      ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : selected.createdAt 
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                        : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}