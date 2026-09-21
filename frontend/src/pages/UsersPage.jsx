import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import API, { API_BASE_URL } from "../api/axios";
import { 
  Users, RefreshCw, User, CheckCircle, AlertCircle, Search, 
  Loader, Eye, Trash2, X, Lock, Unlock, FileSpreadsheet, 
  FileText, Shield, Mail, Phone, Calendar, Sparkles, Check, ChevronLeft, ChevronRight,
  Copy, Crown, Key, CheckCheck, Pencil
} from "lucide-react";
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
  const [copiedText, setCopiedText] = useState("");

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", status: "Active", authProvider: "PHONE", plan: "Free" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);

  // Custom Confirmation & Alert Modal State
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

  const formatPhone = (phone) => {
    if (!phone) return "Not Provided";
    if (phone.startsWith("google_") || phone.startsWith("facebook_") || phone.startsWith("apple_") || phone.length > 20) {
      return "Not Provided";
    }
    return phone;
  };

  const capitalizeName = (name) => {
    if (!name) return "Unnamed User";
    return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plans");
      if (res.data.success) {
        setAvailablePlans(res.data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: formatPhone(user.phone) === "Not Provided" ? "" : (user.phone || ""),
      status: user.status || "Active",
      authProvider: user.authProvider || "PHONE",
      plan: user.plan || "Free",
    });
    fetchPlans();
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const res = await API.patch(`/admin/users/${editingUser._id}`, editForm);
      if (res.data.success) {
        const updated = res.data.user;
        setUsers(prev => prev.map(u => u._id === updated._id ? { ...u, ...updated } : u));
        if (selected && selected._id === updated._id) {
          setSelected(prev => ({ ...prev, ...updated }));
        }
        setEditingUser(null);
        showAlert("Success", "User account updated successfully.");
      }
    } catch (err) {
      console.error(err);
      showAlert("Update Error", err.response?.data?.message || "Failed to update user account details.");
    }
    setSavingEdit(false);
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
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
    } catch (err) {
      console.error(err);
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
      showAlert("No Users Selected", "There are no user accounts to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map((u, i) => ({
      "S.No": i + 1,
      "Name": u.name || "N/A",
      "Email": u.email || "N/A",
      "Phone": u.phone || "N/A",
      "Joined Date": u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A",
      "Auth Method": u.authProvider || "PHONE",
      "Subscription Plan": u.plan || "Free",
      "Status": u.status || "Active"
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, `golidoli-users-${Date.now()}.xlsx`);
  };

  const handleExportPDF = () => {
    const dataToExport = selectedUserIds.size > 0 
      ? users.filter(u => selectedUserIds.has(u._id))
      : users;

    if (dataToExport.length === 0) {
      showAlert("No Users Selected", "There are no user accounts to export.");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("GoliDoli OTT - Users Management Report", 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 21);
    doc.text(`Export Type: ${selectedUserIds.size > 0 ? "Selected Users" : "All Page Users"} (${dataToExport.length} total)`, 14, 26);

    const tableColumn = ["#", "Name", "Email", "Phone", "Joined Date", "Method", "Subscription", "Status"];
    const tableRows = dataToExport.map((u, i) => [
      i + 1,
      u.name || "N/A",
      u.email || "N/A",
      u.phone || "N/A",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A",
      u.authProvider || "PHONE",
      u.plan || "Free",
      u.status || "Active"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: "striped",
      headStyles: { fillColor: [255, 209, 26], textColor: [0, 0, 0] },
      styles: { fontSize: 8 }
    });

    doc.save(`golidoli-users-${Date.now()}.pdf`);
  };

  const handleDelete = (id, userName) => {
    showConfirm({
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete ${userName ? `"${userName}"` : "this user account"}? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete User",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await API.delete(`/admin/users/${id}`);
          fetchUsers(page, debouncedSearch);
        } catch { 
          showAlert("Error", "Failed to delete user account."); 
        }
      }
    });
  };

  const handleToggleBlock = (user) => {
    const isBlocked = user.status === "Blocked";
    const actionTitle = isBlocked ? "Unblock Account" : "Block Account";
    const messageText = isBlocked 
      ? `Are you sure you want to unblock ${capitalizeName(user.name)}? This will restore platform access.`
      : `Are you sure you want to block ${capitalizeName(user.name)}? This will restrict user access immediately.`;

    showConfirm({
      title: actionTitle,
      message: messageText,
      type: isBlocked ? "warning" : "danger",
      confirmText: actionTitle,
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await API.patch(`/admin/users/${user._id}/block`);
          if (res.data.success) {
            setUsers(prev =>
              prev.map(u => (u._id === user._id ? { ...u, status: res.data.user.status } : u))
            );
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
          showAlert("Error", `Failed to ${isBlocked ? "unblock" : "block"} user account.`);
        }
      }
    });
  };

  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Users className="pg-title-icon" size={20} /> 
            User Management
          </h1>
          <p className="pg-sub">View, filter, and manage platform user accounts</p>
        </div>
        <button 
          className="btn btn-ghost"
          onClick={() => fetchUsers(page, debouncedSearch)}
          disabled={loading}
          title="Refresh Users List"
          style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
        >
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {/* 3-Card Symmetrical KPI Grid */}
      <div className="kpi-grid kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Registered</span>
            <div className="kpi-icon-badge icon-amber">
              <User size={15} />
            </div>
          </div>
          <div className="kpi-value">{totalUsers.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Total user accounts on platform
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Users</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>{activeCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Accounts in good standing
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Blocked Accounts</span>
            <div className="kpi-icon-badge icon-pink">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#F43F5E" }}>{blockedCount.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "#F43F5E" }}>
            Restricted / Banned accounts
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "260px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input 
                placeholder="Search by name, email or phone..." 
                value={search}
                onChange={e => setSearch(e.target.value)} 
                style={{ fontSize: "0.84rem" }}
              />
            </div>
            
            {/* Subscription Filter Segmented Toggle Switch */}
            <div className="segmented-switch">
              {[
                { value: "", label: "All Users" },
                { value: "subscribed", label: "Subscribed" },
                { value: "unsubscribed", label: "Free / Unsubscribed" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${subFilter === opt.value ? "active" : ""}`}
                  onClick={() => { setSubFilter(opt.value); setPage(1); }}
                >
                  {subFilter === opt.value && (
                    <motion.div
                      layoutId="activeUsersSubFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export & Actions Group */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedUserIds.size > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 4, fontWeight: 500 }}>
                <strong style={{ color: "var(--primary)" }}>{selectedUserIds.size}</strong> selected
              </span>
            )}
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedUserIds.size > 0 ? "Export selected users to Excel" : "Export current page users to Excel"}
            >
              <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
              {selectedUserIds.size > 0 ? "Export Selected" : "Export Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedUserIds.size > 0 ? "Export selected users to PDF" : "Export current page users to PDF"}
            >
              <FileText size={15} style={{ color: "#FF0F8A" }} />
              Export PDF
            </button>
          </div>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="empty-state" style={{ padding: "36px 0" }}>
            <Loader size={20} className="spin-icon" style={{ color: "var(--primary)", margin: "0 auto 8px auto" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading user accounts...</p>
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "32px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ width: "36px" }}>#</th>
                    <th>User</th>
                    <th>Email / Phone</th>
                    <th>Joined Date</th>
                    <th>Auth Provider</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state" style={{ padding: "36px 0" }}>
                          <User size={28} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 6 }} />
                          <p style={{ fontSize: "0.85rem" }}>No user accounts found matching criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((u, i) => {
                      const itemIndex = (page - 1) * limit + i + 1;
                      const avatarSrc = u.profileImage || u.profilePic || u.avatar || u.photo;
                      const fallbackAvatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(u._id || u.email || u.name || i)}`;
                      const isSubscribed = u.plan && u.plan !== "Free";

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
                          <td style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.78rem" }}>
                            {itemIndex}
                          </td>
                          <td>
                            <div className="user-cell">
                              <div className="u-avatar">
                                <img
                                  src={avatarSrc ? getImageUrl(avatarSrc) : fallbackAvatar}
                                  alt={u.name || "User"}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackAvatar;
                                  }}
                                />
                              </div>
                              <span className="u-name">{u.name || "Unnamed User"}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ color: "var(--text-soft)", fontSize: "0.82rem" }}>{u.email || "—"}</span>
                              {u.phone && <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{u.phone}</span>}
                            </div>
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                          </td>
                          <td>
                            <span className="badge" style={{ 
                              background: "var(--bg3)", 
                              color: "var(--text-soft)", 
                              border: "1px solid var(--border)", 
                              textTransform: "uppercase", 
                              fontSize: "0.68rem",
                              fontWeight: 600
                            }}>
                              {u.authProvider || "PHONE"}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: isSubscribed ? "rgba(255, 209, 26, 0.18)" : "var(--bg3)",
                              color: isSubscribed ? (document.body.classList.contains("light") ? "#b45309" : "#ffd11a") : "var(--text-muted)",
                              border: "1px solid " + (isSubscribed ? "rgba(255, 209, 26, 0.5)" : "var(--border)"),
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
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
                            <div className="tbl-actions" style={{ justifyContent: "flex-end" }}>
                              <button 
                                className="icon-btn view" 
                                onClick={() => setSelected(u)} 
                                title="View User Profile"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                className="icon-btn edit" 
                                onClick={() => handleOpenEditModal(u)} 
                                title="Edit User Details"
                              >
                                <Pencil size={14} />
                              </button>
                              {u.status === "Blocked" ? (
                                <button 
                                  className="icon-btn view" 
                                  onClick={() => handleToggleBlock(u)} 
                                  title="Unblock User" 
                                  style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}
                                >
                                  <Unlock size={14} />
                                </button>
                              ) : (
                                <button 
                                  className="icon-btn del" 
                                  onClick={() => handleToggleBlock(u)} 
                                  title="Block User" 
                                  style={{ color: "#F43F5E", borderColor: "rgba(244, 63, 94, 0.3)" }}
                                >
                                  <Lock size={14} />
                                </button>
                              )}
                              <button 
                                className="icon-btn del" 
                                onClick={() => handleDelete(u._id, u.name)} 
                                title="Delete User Permanently"
                              >
                                <Trash2 size={14} />
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

            {/* Symmetrical Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                <span className="pagination-info" style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  Showing page <strong style={{ color: "var(--text)" }}>{page}</strong> of {totalPages} ({totalUsers} total users)
                </span>
                <div className="pagination-btns" style={{ display: "flex", gap: "4px" }}>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    style={{ opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "not-allowed" : "pointer", padding: "4px 10px", fontSize: "0.76rem" }}
                  >
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    style={{ opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "not-allowed" : "pointer", padding: "4px 10px", fontSize: "0.76rem" }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Minimal, Professional & Clean User Profile Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div 
            className="user-profile-modal" 
            onClick={e => e.stopPropagation()}
          >
            {/* Minimal Header */}
            <div className="up-min-head">
              <h3 className="up-min-title">
                <User size={16} style={{ color: "var(--primary)" }} /> User Profile
              </h3>
              <button className="up-min-close" onClick={() => setSelected(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Profile Brief Info Row */}
            <div className="up-min-user-card">
              <img 
                className="up-min-avatar"
                src={
                  selected.profileImage || selected.profilePic || selected.avatar || selected.photo
                    ? getImageUrl(selected.profileImage || selected.profilePic || selected.avatar || selected.photo)
                    : `https://i.pravatar.cc/150?u=${encodeURIComponent(selected._id || selected.email || selected.name)}`
                } 
                alt={selected.name || "User Profile"} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(selected._id || selected.email || selected.name)}`;
                }}
              />
              <div className="up-min-user-meta">
                <div className="up-min-name-row">
                  <h4 className="up-min-name">{capitalizeName(selected.name)}</h4>
                  <span className={`badge ${selected.status === "Blocked" ? "badge-blocked" : "badge-active"}`}>
                    {selected.status === "Blocked" ? "Blocked" : "Active"}
                  </span>
                </div>
                <p className="up-min-email">{selected.email || "No Email Provided"}</p>
              </div>
            </div>

            {/* Clean Key-Value Details (No Cards, No Heavy Borders) */}
            <div className="up-min-list">
              <div className="up-min-row">
                <span className="up-min-label">Phone Number</span>
                <span className="up-min-val">{formatPhone(selected.phone)}</span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Subscription Tier</span>
                <span className="up-min-val" style={{ color: selected.plan && selected.plan !== "Free" ? "var(--primary)" : "inherit" }}>
                  {selected.plan || "Free"}
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Auth Method</span>
                <span className="up-min-val" style={{ textTransform: "uppercase" }}>{selected.authProvider || "PHONE"}</span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Email Address</span>
                <span className="up-min-val">
                  {selected.email || "—"}
                  {selected.email && (
                    <button 
                      onClick={() => handleCopy(selected.email, "email")} 
                      className="up-min-copy-btn"
                      title="Copy Email"
                    >
                      {copiedText === "email" ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
                    </button>
                  )}
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Account ID</span>
                <span className="up-min-val mono">
                  {selected._id}
                  <button 
                    onClick={() => handleCopy(selected._id, "id")} 
                    className="up-min-copy-btn"
                    title="Copy Account ID"
                  >
                    {copiedText === "id" ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
                  </button>
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Joined Date</span>
                <span className="up-min-val">
                  {selected.createdAt?.$date 
                    ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
                    : selected.createdAt 
                      ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
                      : "—"}
                </span>
              </div>
            </div>

            {/* Minimal Action Footer */}
            <div className="up-min-foot">
              <div className="up-min-actions">
                <button 
                  className="up-min-btn-edit" 
                  onClick={() => {
                    const targetUser = selected;
                    setSelected(null);
                    handleOpenEditModal(targetUser);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "var(--orange, #f59e0b)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Pencil size={13} /> Edit
                </button>
                {selected.status === "Blocked" ? (
                  <button 
                    className="up-min-btn-unblock" 
                    onClick={() => handleToggleBlock(selected)}
                  >
                    <Unlock size={13} /> Unblock
                  </button>
                ) : (
                  <button 
                    className="up-min-btn-block" 
                    onClick={() => handleToggleBlock(selected)}
                  >
                    <Lock size={13} /> Block
                  </button>
                )}
                <button 
                  className="up-min-btn-del" 
                  onClick={() => {
                    const targetId = selected._id;
                    const targetName = selected.name;
                    setSelected(null);
                    handleDelete(targetId, targetName);
                  }}
                >
                  <Trash2 size={13} /> Delete User
                </button>
              </div>
              <button 
                className="up-min-btn-close" 
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit User Details Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="user-profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 510, padding: 24 }}>
            {/* Header */}
            <div className="up-min-head" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(255, 209, 26, 0.15)",
                  border: "1px solid rgba(255, 209, 26, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)"
                }}>
                  <Pencil size={17} />
                </div>
                <div>
                  <h3 className="up-min-title" style={{ fontSize: "1.05rem", fontWeight: 700 }}>Edit User Profile</h3>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>Update account details and subscription plan</p>
                </div>
              </div>
              <button className="up-min-close" onClick={() => setEditingUser(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Mini User Preview Card */}
            <div className="up-min-user-card" style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16 }}>
              <img 
                className="up-min-avatar"
                style={{ width: 38, height: 38 }}
                src={
                  editingUser.profileImage || editingUser.profilePic || editingUser.avatar || editingUser.photo
                    ? getImageUrl(editingUser.profileImage || editingUser.profilePic || editingUser.avatar || editingUser.photo)
                    : `https://i.pravatar.cc/150?u=${encodeURIComponent(editingUser._id || editingUser.email || editingUser.name)}`
                } 
                alt={editingUser.name || "User"} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(editingUser._id || editingUser.email || editingUser.name)}`;
                }}
              />
              <div className="up-min-user-meta">
                <div className="up-min-name-row" style={{ gap: 8, alignItems: "center" }}>
                  <h4 className="up-min-name" style={{ fontSize: "0.88rem" }}>{capitalizeName(editingUser.name)}</h4>
                  <span className="badge" style={{
                    background: editForm.plan && editForm.plan !== "Free" ? "rgba(255, 209, 26, 0.18)" : "var(--bg3)",
                    color: editForm.plan && editForm.plan !== "Free" ? "var(--primary)" : "var(--text-muted)",
                    border: "1px solid " + (editForm.plan && editForm.plan !== "Free" ? "rgba(255, 209, 26, 0.5)" : "var(--border)"),
                    fontSize: "0.65rem",
                    fontWeight: 700
                  }}>
                    {editForm.plan || "Free"}
                  </span>
                </div>
                <p className="up-min-email" style={{ fontSize: "0.75rem", marginTop: 2 }}>{editingUser.email || editingUser.phone || ("ID: " + editingUser._id)}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Full Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter user's name"
                  required
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              {/* Email Address */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="e.g. user@example.com"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              {/* Phone Number */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +919876543210"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              {/* Subscription Plan Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Crown size={14} style={{ color: "#ffd11a" }} /> Subscription Plan
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Current: <strong style={{ color: "var(--primary)" }}>{editingUser?.plan || "Free"}</strong>
                  </span>
                </div>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                  style={{ 
                    width: "100%", 
                    padding: "9px 12px", 
                    borderRadius: 8, 
                    background: "var(--bg3)", 
                    border: "1px solid var(--border)", 
                    color: "var(--text)", 
                    fontSize: "0.85rem", 
                    outline: "none", 
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  <option value="Free">Free Tier (No Subscription)</option>
                  {availablePlans.map(p => (
                    <option key={p._id || p.name} value={p.name}>
                      {p.name} — ₹{p.price} ({p.duration} days)
                    </option>
                  ))}
                  {editForm.plan && editForm.plan !== "Free" && !availablePlans.some(p => p.name === editForm.plan) && (
                    <option value={editForm.plan}>{editForm.plan}</option>
                  )}
                </select>
              </div>

              {/* Status & Auth Provider Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", outline: "none", cursor: "pointer" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-soft)" }}>Auth Provider</label>
                  <select
                    value={editForm.authProvider}
                    onChange={e => setEditForm({ ...editForm, authProvider: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", outline: "none", cursor: "pointer" }}
                  >
                    <option value="PHONE">PHONE</option>
                    <option value="GOOGLE">GOOGLE</option>
                    <option value="FACEBOOK">FACEBOOK</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{ padding: "8px 22px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                >
                  {savingEdit ? <Loader size={14} className="spin-icon" /> : <Check size={14} />}
                  {savingEdit ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Sleek Confirmation / Alert Dialog Popup */}
      {dialog.isOpen && (
        <div className="modal-overlay confirm-overlay" onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="confirm-modal-box" onClick={e => e.stopPropagation()}>
            <div className={`confirm-icon-badge ${dialog.type}`}>
              {dialog.type === "danger" ? <AlertCircle size={24} /> : dialog.type === "warning" ? <Shield size={24} /> : <CheckCircle size={24} />}
            </div>
            <h3 className="confirm-title">{dialog.title}</h3>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              {dialog.showCancel && (
                <button 
                  className="confirm-btn-cancel"
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  {dialog.cancelText || "Cancel"}
                </button>
              )}
              <button 
                className={dialog.type === "danger" ? "confirm-btn-danger" : "btn btn-primary"}
                style={{ flex: 1, padding: "9px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600 }}
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