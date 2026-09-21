import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, RefreshCw, Search, Loader, Eye, Trash2, Ban, X, 
  Calendar, TrendingUp, Users, Clock, FileSpreadsheet, FileText, 
  Copy, CheckCheck, Shield, AlertCircle, CheckCircle, 
  ChevronLeft, ChevronRight, Sparkles, ArrowUpRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API, { API_BASE_URL } from "../api/axios";
import { useToast } from "../App";
import "./Dashboard.css";
import "./Subscription.css";

export default function SubscriptionPage() {
  const { showToast } = useToast() || {};

  // Core Data States
  const [subs, setSubs] = useState([]);
  const [incomeStats, setIncomeStats] = useState({
    todayIncome: { total: 0, subsCount: 0, usersCount: 0 },
    yesterdayIncome: { total: 0, subsCount: 0, usersCount: 0 },
    totalIncome: { total: 0, subsCount: 0, usersCount: 0 },
    monthlyIncome: { total: 0, subsCount: 0, usersCount: 0 },
  });
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "expired" | "cancelled"
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "yesterday" | "this_month"

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Multi-selection
  const [selectedSubIds, setSelectedSubIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState("");

  // Modals
  const [viewSub, setViewSub] = useState(null);

  // Custom Confirmation & Alert Dialog
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

  const showAlert = (title, message, type = "info") => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText: "OK",
      showCancel: false,
      onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedSubIds(new Set());
  }, [searchQuery, statusFilter, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSubs, resIncome] = await Promise.all([
        API.get("/admin/subscription/all"),
        API.get("/admin/subscription/income-stats")
      ]);
      setSubs(resSubs.data.subscriptions || []);
      setIncomeStats(resIncome.data.data || {});
    } catch (err) {
      console.error("Failed to fetch subscriptions data:", err);
      if (showToast) showToast("Failed to load subscriptions", "error");
    }
    setLoading(false);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  // Helper for computing active, expired, cancelled counts
  const calculatedStats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let expired = 0;
    let cancelled = 0;

    subs.forEach(s => {
      const isAct = s.status === "active" && new Date(s.endDate) > now;
      const isCan = s.status === "cancelled";
      if (isAct) active++;
      else if (isCan) cancelled++;
      else expired++;
    });

    return { active, expired, cancelled, total: subs.length };
  }, [subs]);

  // Cancel subscription action
  const handleCancelSubscription = (sub) => {
    showConfirm({
      title: "Cancel Subscription",
      message: `Are you sure you want to cancel ${sub.user?.name || "this user"}'s subscription? The subscriber will immediately lose premium access.`,
      type: "danger",
      confirmText: "Yes, Cancel Subscription",
      onConfirm: async () => {
        try {
          const res = await API.patch(`/admin/subscription/${sub._id}/cancel`);
          if (res.data?.success) {
            if (showToast) showToast("Subscription cancelled successfully", "success");
            fetchData();
            if (viewSub && viewSub._id === sub._id) {
              setViewSub(prev => ({ ...prev, status: "cancelled" }));
            }
          }
        } catch (err) {
          console.error(err);
          showAlert("Error", err.response?.data?.message || "Failed to cancel subscription.");
        }
      }
    });
  };

  // Delete subscription record
  const handleDeleteSubscription = (sub) => {
    showConfirm({
      title: "Delete Subscription Record",
      message: "Are you sure you want to permanently delete this subscription record? This action cannot be undone.",
      type: "danger",
      confirmText: "Delete Record",
      onConfirm: async () => {
        try {
          const res = await API.delete(`/admin/subscription/${sub._id}`);
          if (res.data?.success) {
            if (showToast) showToast("Subscription record deleted", "success");
            fetchData();
            if (viewSub && viewSub._id === sub._id) setViewSub(null);
          }
        } catch (err) {
          console.error(err);
          showAlert("Error", err.response?.data?.message || "Failed to delete subscription.");
        }
      }
    });
  };


  // Filter & Search Logic
  const filteredSubs = useMemo(() => {
    const now = new Date();

    return subs.filter((sub) => {
      const isActive = sub.status === "active" && new Date(sub.endDate) > now;
      const isCancelled = sub.status === "cancelled";
      const isExpired = sub.status === "expired" || (sub.status === "active" && new Date(sub.endDate) <= now);

      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "cancelled" && !isCancelled) return false;
      if (statusFilter === "expired" && !isExpired) return false;

      // Date Filtering
      if (dateFilter !== "all") {
        const targetDate = sub.createdAt || sub.startDate ? new Date(sub.createdAt || sub.startDate) : null;
        if (!targetDate || isNaN(targetDate.getTime())) return false;

        if (dateFilter === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          if (targetDate < startOfToday || targetDate > endOfToday) return false;
        } else if (dateFilter === "yesterday") {
          const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          if (targetDate < startOfYesterday || targetDate > endOfYesterday) return false;
        } else if (dateFilter === "this_month") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          if (targetDate < startOfMonth || targetDate > endOfMonth) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (sub.user?.name || "").toLowerCase();
        const userEmail = (sub.user?.email || "").toLowerCase();
        const userPhone = (sub.user?.phone || "").toLowerCase();
        const planName = (sub.plan?.name || sub.plan || "").toLowerCase();
        const subId = (sub.subscriptionId || "").toLowerCase();
        const payId = (sub.paymentId || "").toLowerCase();
        const voucher = (sub.voucherCode || "").toLowerCase();
        const promo = (sub.promoCode || "").toLowerCase();

        return (
          userName.includes(q) ||
          userEmail.includes(q) ||
          userPhone.includes(q) ||
          planName.includes(q) ||
          subId.includes(q) ||
          payId.includes(q) ||
          voucher.includes(q) ||
          promo.includes(q)
        );
      }

      return true;
    });
  }, [subs, statusFilter, dateFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE) || 1;
  const paginatedSubs = useMemo(() => {
    return filteredSubs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredSubs, currentPage]);

  // Selection handlers
  const isAllSelected = paginatedSubs.length > 0 && paginatedSubs.every(s => selectedSubIds.has(s._id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSubIds(new Set());
    } else {
      const next = new Set(selectedSubIds);
      paginatedSubs.forEach(s => next.add(s._id));
      setSelectedSubIds(next);
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedSubIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSubIds(next);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataset = selectedSubIds.size > 0 
      ? subs.filter(s => selectedSubIds.has(s._id))
      : paginatedSubs;

    if (dataset.length === 0) {
      showAlert("Export", "No subscription records available to export.");
      return;
    }

    const data = dataset.map((s, idx) => ({
      "#": idx + 1,
      "Subscriber Name": s.user?.name || "Unnamed",
      "Email": s.user?.email || "N/A",
      "Phone": s.user?.phone || "N/A",
      "Plan": s.plan?.name || s.plan || "Free",
      "Amount Paid": `₹${s.amount || 0}`,
      "Status": s.status === "active" && new Date(s.endDate) > new Date() ? "Active" : s.status === "cancelled" ? "Cancelled" : "Expired",
      "Start Date": s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN") : "N/A",
      "End Date": s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "N/A",
      "Order ID": s.subscriptionId || "N/A",
      "Payment ID": s.paymentId || "N/A",
      "Promo / Voucher": s.voucherCode || s.promoCode || "None"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subscriptions");
    XLSX.writeFile(workbook, `Subscriptions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const dataset = selectedSubIds.size > 0 
      ? subs.filter(s => selectedSubIds.has(s._id))
      : paginatedSubs;

    if (dataset.length === 0) {
      showAlert("Export", "No subscription records available to export.");
      return;
    }

    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("GoliDoli OTT - Subscription Records", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString("en-IN")} | Total Records: ${dataset.length}`, 14, 25);

    const tableRows = dataset.map((s, idx) => [
      idx + 1,
      s.user?.name || "Unnamed",
      s.user?.email || s.user?.phone || "—",
      s.plan?.name || s.plan || "Free",
      `Rs. ${s.amount || 0}`,
      s.status === "active" && new Date(s.endDate) > new Date() ? "Active" : s.status === "cancelled" ? "Cancelled" : "Expired",
      s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN") : "—",
      s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "—",
      s.paymentId || s.subscriptionId || "—"
    ]);

    autoTable(doc, {
      head: [["#", "Subscriber", "Contact", "Plan", "Amount", "Status", "Start Date", "Expiry", "Ref ID"]],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 26, 30], textColor: [255, 209, 26] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`Subscriptions_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <CreditCard className="pg-title-icon" size={20} />
            Subscription Management
          </h1>
          <p className="pg-sub">Monitor platform revenue streams, subscriber validity, and access plans</p>
        </div>

        <button 
          className="btn btn-ghost" 
          onClick={fetchData} 
          disabled={loading}
          title="Refresh Subscriptions List"
          style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
        >
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {/* Symmetrical 4-Card Executive KPI Grid */}
      <div className="kpi-grid">
        {/* Total Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Revenue</span>
            <div className="kpi-icon-badge icon-amber">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="kpi-value">₹{(incomeStats.totalIncome?.total || 0).toLocaleString("en-IN")}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{incomeStats.totalIncome?.subsCount || 0}</span> total subscriptions
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Today's Revenue</span>
            <div className="kpi-icon-badge icon-emerald">
              <Calendar size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            ₹{(incomeStats.todayIncome?.total || 0).toLocaleString("en-IN")}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            {incomeStats.todayIncome?.subsCount || 0} subs ({incomeStats.todayIncome?.usersCount || 0} users) today
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Subscribers</span>
            <div className="kpi-icon-badge icon-blue">
              <Users size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#3B82F6" }}>
            {calculatedStats.active.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#3B82F6" }}>
            Currently active paid access
          </div>
        </div>

        {/* Expired / Cancelled */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Expired / Cancelled</span>
            <div className="kpi-icon-badge icon-pink">
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#F43F5E" }}>
            {(calculatedStats.expired + calculatedStats.cancelled).toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#F43F5E" }}>
            {calculatedStats.cancelled} cancelled • {calculatedStats.expired} expired
          </div>
        </div>
      </div>

      {/* Main Content Box & Toolbar */}
      <div className="content-box">
        {/* Toolbar Row */}
        <div className="search-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          {/* Left Toolbar Items: Search, Status Segmented Switch, Date Filter */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: "280px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div className="search-field" style={{ padding: "7px 12px", minWidth: "220px", flex: "1 1 220px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input 
                placeholder="Search subscriber, email, phone, plan or ID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} 
                style={{ fontSize: "0.84rem" }}
              />
            </div>

            {/* Status Segmented Toggle Switch */}
            <div className="segmented-switch">
              {[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "expired", label: "Expired" },
                { value: "cancelled", label: "Cancelled" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${statusFilter === opt.value ? "active" : ""}`}
                  onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
                >
                  {statusFilter === opt.value && (
                    <motion.div
                      layoutId="activeSubStatusPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Timeframe Select */}
            <select
              className="sub-filter-select"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          {/* Right Toolbar Items: Selected Count & Exports */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedSubIds.size > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 4, fontWeight: 500 }}>
                <strong style={{ color: "var(--primary)" }}>{selectedSubIds.size}</strong> selected
              </span>
            )}
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedSubIds.size > 0 ? "Export selected subscriptions to Excel" : "Export current page subscriptions to Excel"}
            >
              <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
              {selectedSubIds.size > 0 ? "Export Selected" : "Export Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={selectedSubIds.size > 0 ? "Export selected subscriptions to PDF" : "Export current page subscriptions to PDF"}
            >
              <FileText size={15} style={{ color: "#FF0F8A" }} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Subscriptions Table */}
        {loading ? (
          <div className="empty-state" style={{ padding: "36px 0" }}>
            <Loader size={20} className="spin-icon" style={{ color: "var(--primary)", margin: "0 auto 8px auto" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading subscription records...</p>
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
                    <th>Subscriber</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Validity Period</th>
                    <th>Status</th>
                    <th>Payment Ref</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center" }}>
                        <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 20px" }}>
                          <CreditCard size={32} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 10 }} />
                          <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>No subscription records found</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                            {searchQuery ? "Try refining your search query or filter criteria" : "Active and historical subscriptions will appear here"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubs.map((sub, i) => {
                      const itemIndex = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                      const avatarSrc = sub.user?.profileImage || sub.user?.profilePic || sub.user?.avatar;
                      const fallbackAvatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(sub.user?._id || sub.user?.email || sub._id)}`;
                      const now = new Date();
                      const endDate = sub.endDate ? new Date(sub.endDate) : null;
                      const isActive = sub.status === "active" && endDate && endDate > now;
                      const isCancelled = sub.status === "cancelled";
                      const daysRemaining = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

                      return (
                        <tr key={sub._id}>
                          {/* Checkbox */}
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedSubIds.has(sub._id)}
                              onChange={() => handleToggleSelect(sub._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>

                          {/* Index */}
                          <td style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.78rem" }}>
                            {itemIndex}
                          </td>

                          {/* Subscriber Cell */}
                          <td>
                            <div className="user-cell">
                              <div className="u-avatar">
                                <img
                                  src={avatarSrc ? getImageUrl(avatarSrc) : fallbackAvatar}
                                  alt={sub.user?.name || "Subscriber"}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackAvatar;
                                  }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span className="u-name">{sub.user?.name || "Unnamed Subscriber"}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.73rem" }}>
                                  {sub.user?.email || sub.user?.phone || "No contact info"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Plan Badge */}
                          <td>
                            <span className="sub-plan-badge">
                              {sub.plan?.name || sub.plan || "Custom"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td>
                            <span className="sub-amount-cell">
                              ₹{(sub.amount || 0).toLocaleString("en-IN")}
                            </span>
                          </td>

                          {/* Validity Period */}
                          <td>
                            <div className="sub-date-info">
                              <span className="sub-date-primary">
                                {endDate ? endDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                              </span>
                              {isActive ? (
                                <span className={`sub-days-tag ${daysRemaining <= 5 ? "active-soon" : "active-good"}`}>
                                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                                </span>
                              ) : (
                                <span className="sub-date-meta">
                                  Start: {sub.startDate ? new Date(sub.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`badge ${isActive ? "badge-active" : isCancelled ? "badge-cancelled" : "badge-expired"}`}>
                              {isActive ? "Active" : isCancelled ? "Cancelled" : "Expired"}
                            </span>
                          </td>

                          {/* Payment Reference Chip */}
                          <td>
                            {sub.paymentId || sub.subscriptionId ? (
                              <button
                                type="button"
                                className="sub-copy-chip"
                                onClick={() => handleCopy(sub.paymentId || sub.subscriptionId, sub._id)}
                                title="Click to copy Transaction / Reference ID"
                              >
                                <span className="sub-copy-text">
                                  {sub.paymentId || sub.subscriptionId}
                                </span>
                                {copiedKey === sub._id ? (
                                  <CheckCheck size={12} style={{ color: "var(--green)" }} />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                              {/* View Details */}
                              <button
                                className="icon-btn view"
                                onClick={() => setViewSub(sub)}
                                title="View Subscription Details"
                              >
                                <Eye size={15} />
                              </button>


                              {/* Cancel Subscription if active, else delete */}
                              {isActive ? (
                                <button
                                  className="icon-btn del"
                                  onClick={() => handleCancelSubscription(sub)}
                                  title="Cancel Subscription"
                                >
                                  <Ban size={15} />
                                </button>
                              ) : (
                                <button
                                  className="icon-btn del"
                                  onClick={() => handleDeleteSubscription(sub)}
                                  title="Delete Subscription Record"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="sub-pagination-bar">
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Showing <strong style={{ color: "var(--text)" }}>{paginatedSubs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> to <strong style={{ color: "var(--text)" }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredSubs.length)}</strong> of <strong style={{ color: "var(--text)" }}>{filteredSubs.length}</strong> subscriptions
              </span>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn btn-ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span style={{ fontSize: "0.8rem", color: "var(--text-soft)", padding: "0 4px" }}>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          VIEW SUBSCRIPTION DETAILS MODAL (Consistent .user-profile-modal layout)
          ========================================================================= */}
      {viewSub && (
        <div className="modal-overlay" onClick={() => setViewSub(null)}>
          <div className="user-profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 0 }}>
            {/* Modal Header */}
            <div className="up-min-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255, 209, 26, 0.14)",
                  border: "1px solid rgba(255, 209, 26, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)"
                }}>
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="up-min-title">Subscription Overview</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                    Ref: {viewSub._id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button className="up-min-close" onClick={() => setViewSub(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Subscriber Preview Card */}
            <div className="up-min-user-card">
              <img 
                className="up-min-avatar"
                src={
                  viewSub.user?.profileImage || viewSub.user?.profilePic || viewSub.user?.avatar
                    ? getImageUrl(viewSub.user?.profileImage || viewSub.user?.profilePic || viewSub.user?.avatar)
                    : `https://i.pravatar.cc/150?u=${encodeURIComponent(viewSub.user?._id || viewSub._id)}`
                } 
                alt={viewSub.user?.name || "Subscriber"}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(viewSub.user?._id || viewSub._id)}`;
                }}
              />
              <div className="up-min-user-meta">
                <div className="up-min-name-row">
                  <h4 className="up-min-name">{viewSub.user?.name || "Unnamed Subscriber"}</h4>
                  <span className="sub-plan-badge" style={{ fontSize: "0.68rem" }}>
                    {viewSub.plan?.name || viewSub.plan || "Plan"}
                  </span>
                </div>
                <p className="up-min-email">{viewSub.user?.email || viewSub.user?.phone || "No contact info"}</p>
              </div>
            </div>

            {/* Details List */}
            <div className="up-min-list">
              <div className="up-min-row">
                <span className="up-min-label">Access Status</span>
                <span className="up-min-val">
                  <span className={`badge ${viewSub.status === "active" && new Date(viewSub.endDate) > new Date() ? "badge-active" : viewSub.status === "cancelled" ? "badge-cancelled" : "badge-expired"}`}>
                    {viewSub.status === "active" && new Date(viewSub.endDate) > new Date() ? "Active" : viewSub.status === "cancelled" ? "Cancelled" : "Expired"}
                  </span>
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Amount Paid</span>
                <span className="up-min-val" style={{ color: "var(--primary)", fontWeight: 700 }}>
                  ₹{(viewSub.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Start Date</span>
                <span className="up-min-val">
                  {viewSub.startDate ? new Date(viewSub.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                </span>
              </div>

              <div className="up-min-row">
                <span className="up-min-label">Expiry Date</span>
                <span className="up-min-val">
                  {viewSub.endDate ? new Date(viewSub.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                </span>
              </div>

              {(viewSub.voucherCode || viewSub.promoCode) && (
                <div className="up-min-row">
                  <span className="up-min-label">Promo / Voucher</span>
                  <span className="up-min-val mono">
                    {viewSub.voucherCode ? `🎟️ ${viewSub.voucherCode}` : `🏷️ ${viewSub.promoCode}`}
                  </span>
                </div>
              )}

              {viewSub.subscriptionId && (
                <div className="up-min-row">
                  <span className="up-min-label">Order ID</span>
                  <span className="up-min-val mono">
                    {viewSub.subscriptionId}
                    <button 
                      className="up-min-copy-btn" 
                      onClick={() => handleCopy(viewSub.subscriptionId, "modal-order")}
                      title="Copy Order ID"
                    >
                      {copiedKey === "modal-order" ? <CheckCheck size={13} style={{ color: "var(--green)" }} /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
              )}

              {viewSub.paymentId && (
                <div className="up-min-row">
                  <span className="up-min-label">Payment ID</span>
                  <span className="up-min-val mono">
                    {viewSub.paymentId}
                    <button 
                      className="up-min-copy-btn" 
                      onClick={() => handleCopy(viewSub.paymentId, "modal-pay")}
                      title="Copy Payment ID"
                    >
                      {copiedKey === "modal-pay" ? <CheckCheck size={13} style={{ color: "var(--green)" }} /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="up-min-foot">
              <div className="up-min-actions">
                {viewSub.status === "active" && new Date(viewSub.endDate) > new Date() && (
                  <button
                    type="button"
                    className="up-min-btn-del"
                    onClick={() => handleCancelSubscription(viewSub)}
                  >
                    <Ban size={13} /> Cancel Sub
                  </button>
                )}
              </div>

              <button 
                type="button" 
                className="up-min-btn-close"
                onClick={() => setViewSub(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOM SLEEK CONFIRMATION / ALERT DIALOG POPUP
          ========================================================================= */}
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