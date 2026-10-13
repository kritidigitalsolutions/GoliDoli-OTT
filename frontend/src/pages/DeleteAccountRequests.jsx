import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MotionDiv = motion.div;
import {
  UserX,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../api/axios";
import { getInitialsAvatar } from "../utils/avatar";
import { useToast } from "../App";
import "./Dashboard.css";
import "./DeleteAccountRequests.css";

export default function DeleteAccountRequests() {
  const { showToast } = useToast() || {};
  const [, startTransition] = useTransition();

  // ── Server Data States ──
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Filters & Search ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Pending" | "Approved" | "Rejected"
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "this_week" | "this_month"
  const [reasonFilter, setReasonFilter] = useState("all");

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const limit = 10;

  // ── Selection & Clipboard ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedText, setCopiedText] = useState("");

  // ── Modals & Actions ──
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    item: null,
    actionType: "approve", // "approve" | "reject"
    remark: "",
    submitting: false,
  });

  // ── Debounce Search Input ──
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Fetch Requests from Backend ──
  const fetchRequests = useCallback(
    async (showSilentLoading = false) => {
      if (!showSilentLoading) {
        setLoading(true);
      }
      setApiError(null);

      try {
        const params = {
          page: currentPage,
          limit,
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter && statusFilter !== "All") params.status = statusFilter;
        if (dateFilter && dateFilter !== "all") params.dateFilter = dateFilter;
        if (reasonFilter && reasonFilter !== "all") params.reasonCategory = reasonFilter;

        const res = await API.get("/admin/delete-account-requests", { params });

        if (res.data?.success) {
          startTransition(() => {
            setRequests(res.data.requests || []);
            if (res.data.counts) {
              setCounts(res.data.counts);
            }
            if (res.data.pagination) {
              setTotalPages(res.data.pagination.totalPages || 1);
              setTotalFilteredCount(res.data.pagination.totalCount || 0);
            }
          });
        } else {
          setApiError(res.data?.message || "Failed to load requests from server.");
        }
      } catch (err) {
        console.error("Fetch Delete Account Requests Error:", err);
        const errMsg =
          err.response?.data?.message || "Unable to reach server. Please check your connection.";
        setApiError(errMsg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, debouncedSearch, statusFilter, dateFilter, reasonFilter]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRequests(true);
    if (showToast) showToast("Refreshing deletion requests...", "info");
  };

  // Clipboard Helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    if (showToast) showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Date Formatters
  const formatDate = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours < 1) return "Just now";
      return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  // Multi-Selection Logic
  const isAllSelected =
    requests.length > 0 && requests.every((item) => selectedIds.has(item._id));

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      requests.forEach((item) => next.delete(item._id));
    } else {
      requests.forEach((item) => next.add(item._id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Open Action Modal
  const handleOpenActionModal = (item, actionType) => {
    setConfirmModal({
      isOpen: true,
      item,
      actionType,
      remark: "",
      submitting: false,
    });
  };

  // Submit Approve / Reject API Request
  const handleConfirmAction = async () => {
    const { item, actionType, remark } = confirmModal;
    if (!item || !item._id) return;

    setConfirmModal((prev) => ({ ...prev, submitting: true }));

    try {
      const endpoint =
        actionType === "approve"
          ? `/admin/delete-account-requests/${item._id}/approve`
          : `/admin/delete-account-requests/${item._id}/reject`;

      const res = await API.patch(endpoint, {
        adminRemarks: remark.trim() || undefined,
      });

      if (res.data?.success) {
        if (showToast) {
          showToast(
            actionType === "approve"
              ? `Request approved and account data deleted for ${item.userName}.`
              : `Request rejected for ${item.userName}.`,
            actionType === "approve" ? "success" : "danger"
          );
        }

        // Close confirmation modal
        setConfirmModal({
          isOpen: false,
          item: null,
          actionType: "approve",
          remark: "",
          submitting: false,
        });

        // Close details modal if open for this item
        if (detailModalItem && detailModalItem._id === item._id) {
          setDetailModalItem(null);
        }

        // Refetch latest records & KPI summary counts
        fetchRequests(true);
      } else {
        if (showToast) showToast(res.data?.message || "Operation failed", "danger");
        setConfirmModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error(`Error during ${actionType}:`, err);
      const errMsg =
        err.response?.data?.message || `Failed to ${actionType} request. Please try again.`;
      if (showToast) showToast(errMsg, "danger");
      setConfirmModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const targetList =
      selectedIds.size > 0
        ? requests.filter((r) => selectedIds.has(r._id))
        : requests;

    if (targetList.length === 0) {
      if (showToast) showToast("No records to export", "info");
      return;
    }

    const exportData = targetList.map((r, i) => ({
      "#": (currentPage - 1) * limit + i + 1,
      "Request ID": r._id,
      "User ID": r.userId,
      "User Name": r.userName,
      "Email": r.userEmail || "—",
      "Phone": r.userPhone || "—",
      "Plan Tier": r.plan || "Free",
      "Auth Method": r.authProvider || "PHONE",
      "Submission Date": formatDate(r.createdAt),
      "Reason Category": r.reasonCategory || "Other",
      "Reason Details": r.reasonDetails || "—",
      "Status": r.status,
      "Reviewed By": r.reviewedByName || "—",
      "Reviewed Date": r.reviewedAt ? formatDate(r.reviewedAt) : "—",
      "Admin Remarks": r.adminRemarks || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Delete Requests");
    XLSX.writeFile(
      wb,
      `GoliDoli_Delete_Account_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Export to PDF
  const handleExportPDF = () => {
    const targetList =
      selectedIds.size > 0
        ? requests.filter((r) => selectedIds.has(r._id))
        : requests;

    if (targetList.length === 0) {
      if (showToast) showToast("No records to export", "info");
      return;
    }

    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("GoliDoli OTT — Delete Account Requests", 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 23);

    const tableRows = targetList.map((r, i) => [
      (currentPage - 1) * limit + i + 1,
      r.userName,
      r.userEmail || "—",
      r.userPhone || "—",
      formatDate(r.createdAt),
      r.reasonCategory || "Other",
      r.status,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["#", "User Name", "Email", "Phone", "Request Date", "Reason", "Status"]],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 122, 26] },
    });

    doc.save(
      `GoliDoli_Delete_Account_Requests_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="page-section">
      {/* ── Page Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <UserX className="pg-title-icon" size={22} style={{ color: "#f43f5e" }} />
            Delete Account Requests
          </h1>
          <p className="pg-sub">Manage and review user account deletion requests submitted via the mobile app.</p>
        </div>

        <button
          className="btn btn-ghost"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          title="Refresh requests list"
          style={{ padding: "6px 12px", fontSize: "0.78rem", height: "auto" }}
        >
          <RefreshCw size={14} className={isRefreshing ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {/* ── 4 Summary KPI Cards (Connected to live counts) ── */}
      <div className="kpi-grid">
        {/* Total Requests */}
        <div
          className={`kpi-card dar-kpi-card ${statusFilter === "All" ? "active-filter" : ""}`}
          onClick={() => {
            setStatusFilter("All");
            setCurrentPage(1);
          }}
          title="Click to view all requests"
        >
          <div className="kpi-header">
            <span className="kpi-label">Total Requests</span>
            <div
              className="kpi-icon-badge"
              style={{ background: "rgba(59, 130, 246, 0.14)", color: "#3b82f6" }}
            >
              <UserX size={15} />
            </div>
          </div>
          <div className="kpi-value">{counts.total.toLocaleString()}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            All-time deletion submissions
          </div>
        </div>

        {/* Pending Requests */}
        <div
          className={`kpi-card dar-kpi-card card-pending ${
            statusFilter === "Pending" ? "active-filter" : ""
          }`}
          onClick={() => {
            setStatusFilter("Pending");
            setCurrentPage(1);
          }}
          title="Click to filter by Pending requests"
        >
          <div className="kpi-header">
            <span className="kpi-label">Pending Requests</span>
            <div className="kpi-icon-badge icon-amber">
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#f59e0b" }}>
            {counts.pending.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#f59e0b" }}>
            Awaiting admin action
          </div>
        </div>

        {/* Approved Requests */}
        <div
          className={`kpi-card dar-kpi-card card-approved ${
            statusFilter === "Approved" ? "active-filter" : ""
          }`}
          onClick={() => {
            setStatusFilter("Approved");
            setCurrentPage(1);
          }}
          title="Click to filter by Approved requests"
        >
          <div className="kpi-header">
            <span className="kpi-label">Approved Requests</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {counts.approved.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            Account data erased
          </div>
        </div>

        {/* Rejected Requests */}
        <div
          className={`kpi-card dar-kpi-card card-rejected ${
            statusFilter === "Rejected" ? "active-filter" : ""
          }`}
          onClick={() => {
            setStatusFilter("Rejected");
            setCurrentPage(1);
          }}
          title="Click to filter by Rejected requests"
        >
          <div className="kpi-header">
            <span className="kpi-label">Rejected Requests</span>
            <div className="kpi-icon-badge icon-pink">
              <XCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#F43F5E" }}>
            {counts.rejected.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: "#F43F5E" }}>
            Declined / Canceled requests
          </div>
        </div>
      </div>

      {/* ── Main Content Box & Toolbar ── */}
      <div className="content-box">
        {/* Search & Filter Toolbar */}
        <div
          className="search-row"
          style={{
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 12,
          }}
        >
          {/* Left search & filters */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flex: 1,
              minWidth: "280px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div
              className="search-field"
              style={{ padding: "7px 12px", minWidth: "240px", flex: 1 }}
            >
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search user name, email, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "0.84rem" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Segmented Tabs */}
            <div className="segmented-switch">
              {[
                { value: "All", label: "All" },
                { value: "Pending", label: "Pending" },
                { value: "Approved", label: "Approved" },
                { value: "Rejected", label: "Rejected" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${statusFilter === opt.value ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setCurrentPage(1);
                  }}
                >
                  {statusFilter === opt.value && (
                    <MotionDiv
                      layoutId="activeDarStatusFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Date Filter Dropdown */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="btn btn-ghost"
              style={{
                fontSize: "0.8rem",
                padding: "6px 10px",
                height: "auto",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">Past 7 Days</option>
              <option value="this_month">This Month</option>
            </select>

            {/* Reason Filter Dropdown */}
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="btn btn-ghost"
              style={{
                fontSize: "0.8rem",
                padding: "6px 10px",
                height: "auto",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Reasons</option>
              <option value="Privacy Concerns">Privacy Concerns</option>
              <option value="No Longer Using">No Longer Using</option>
              <option value="Too Expensive">Too Expensive</option>
              <option value="Found Alternative">Found Alternative</option>
              <option value="Security Concerns">Security Concerns</option>
              <option value="Accidental Submission">Accidental</option>
              <option value="App Performance">App Performance</option>
              <option value="Billing Dispute">Billing Dispute</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Right Toolbar: Selected count & Export buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedIds.size > 0 && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginRight: 4,
                  fontWeight: 500,
                }}
              >
                <strong style={{ color: "var(--primary)" }}>{selectedIds.size}</strong> selected
              </span>
            )}

            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={
                selectedIds.size > 0
                  ? "Export selected requests to Excel"
                  : "Export current page requests to Excel"
              }
            >
              <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
              {selectedIds.size > 0 ? "Export Selected" : "Export Excel"}
            </button>

            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "5px 12px", height: "auto" }}
              title={
                selectedIds.size > 0
                  ? "Export selected requests to PDF"
                  : "Export current page requests to PDF"
              }
            >
              <FileText size={15} style={{ color: "#FF0F8A" }} />
              Export PDF
            </button>
          </div>
        </div>

        {/* ── Table & State Views ── */}
        {loading ? (
          /* Loading State */
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <Loader
              size={26}
              className="spin-icon"
              style={{ color: "var(--primary)", margin: "0 auto 12px auto" }}
            />
            <p
              style={{
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.92rem",
                marginBottom: 4,
              }}
            >
              Loading Delete Account Requests...
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Fetching latest submissions from database
            </p>
          </div>
        ) : apiError ? (
          /* Error State */
          <div className="dar-error-card">
            <AlertCircle size={32} style={{ color: "#f43f5e" }} />
            <div>
              <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                Failed to Load Delete Requests
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
                {apiError}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchRequests()}
              style={{ fontSize: "0.8rem", padding: "6px 16px", marginTop: 6 }}
            >
              <RefreshCw size={14} /> Retry Request
            </button>
          </div>
        ) : (
          /* Real Data Table */
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
                    <th>User Details</th>
                    <th>Email</th>
                    <th>Phone Number</th>
                    <th>Request Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center", width: "130px", minWidth: "130px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div
                          className="empty-state"
                          style={{ padding: "48px 20px", textAlign: "center" }}
                        >
                          <UserX
                            size={32}
                            style={{
                              color: "var(--text-muted)",
                              opacity: 0.4,
                              margin: "0 auto 10px auto",
                            }}
                          />
                          <p
                            style={{
                              fontSize: "0.92rem",
                              fontWeight: 600,
                              color: "var(--text)",
                              margin: 0,
                            }}
                          >
                            {debouncedSearch || statusFilter !== "All" || dateFilter !== "all" || reasonFilter !== "all"
                              ? "No matching deletion requests found"
                              : "No account deletion requests available"}
                          </p>
                          <p
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              marginTop: 4,
                              marginBottom: 12,
                            }}
                          >
                            {debouncedSearch || statusFilter !== "All" || dateFilter !== "all" || reasonFilter !== "all"
                              ? "Try adjusting your search criteria or resetting filters."
                              : "User deletion requests submitted via the Flutter mobile app will appear here."}
                          </p>
                          {(debouncedSearch || statusFilter !== "All" || dateFilter !== "all" || reasonFilter !== "all") && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => {
                                setSearch("");
                                setStatusFilter("All");
                                setDateFilter("all");
                                setReasonFilter("all");
                              }}
                              style={{ fontSize: "0.76rem", padding: "4px 12px" }}
                            >
                              Reset All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map((item, index) => {
                      const itemIndex = (currentPage - 1) * limit + index + 1;
                      const avatarSrc = item.userAvatar;
                      const fallbackAvatar = getInitialsAvatar(
                        item.userName || item.userEmail || "User"
                      );
                      const isPending = item.status === "Pending";
                      const isApproved = item.status === "Approved";

                      return (
                        <tr key={item._id}>
                          {/* Checkbox */}
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item._id)}
                              onChange={() => handleToggleSelectOne(item._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>

                          {/* Index */}
                          <td
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: 600,
                              fontSize: "0.78rem",
                            }}
                          >
                            {itemIndex}
                          </td>

                          {/* User Details */}
                          <td>
                            <div
                              className="user-cell"
                              style={{ display: "flex", alignItems: "center", gap: 10 }}
                            >
                              <div className="u-avatar">
                                <img
                                  src={avatarSrc || fallbackAvatar}
                                  alt={item.userName}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackAvatar;
                                  }}
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    color: "var(--text)",
                                  }}
                                >
                                  {item.userName}
                                </span>
                                <button
                                  type="button"
                                  className="dar-id-chip"
                                  onClick={() => handleCopy(item.userId, `uid_${item._id}`)}
                                  title="Click to copy User ID"
                                >
                                  <span>{item.userId}</span>
                                  {copiedText === `uid_${item._id}` ? (
                                    <Check size={11} style={{ color: "#10b981" }} />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>
                                {item.userEmail || "—"}
                              </span>
                              {item.userEmail && (
                                <button
                                  type="button"
                                  className="dar-id-chip"
                                  onClick={() => handleCopy(item.userEmail, `mail_${item._id}`)}
                                  title="Copy Email Address"
                                >
                                  {copiedText === `mail_${item._id}` ? (
                                    <Check size={12} style={{ color: "#10b981" }} />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Phone Number */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-soft)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.userPhone || "Not Provided"}
                              </span>
                              {item.userPhone && (
                                <button
                                  type="button"
                                  className="dar-id-chip"
                                  onClick={() => handleCopy(item.userPhone, `phone_${item._id}`)}
                                  title="Copy Phone Number"
                                >
                                  {copiedText === `phone_${item._id}` ? (
                                    <Check size={12} style={{ color: "#10b981" }} />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Request Date */}
                          <td>
                            <div className="dar-date-cell">
                              <span className="dar-date-primary">
                                {formatDate(item.createdAt)}
                              </span>
                              <span className="dar-date-relative">
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                          </td>

                          {/* Reason */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span className="dar-reason-pill" title={item.reasonCategory}>
                                {item.reasonCategory || "Other"}
                              </span>
                              {item.reasonDetails && (
                                <span className="dar-reason-snippet" title={item.reasonDetails}>
                                  {item.reasonDetails}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span
                              className={`dar-badge ${
                                isPending
                                  ? "dar-badge-pending"
                                  : isApproved
                                  ? "dar-badge-approved"
                                  : "dar-badge-rejected"
                              }`}
                            >
                              <span className="dar-badge-dot" />
                              {item.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="dar-actions-wrap">
                              {/* View Details */}
                              <button
                                type="button"
                                className="dar-btn-action view"
                                onClick={() => setDetailModalItem(item)}
                                title="View Request Details"
                                aria-label="View Details"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Quick Approve (Pending only) */}
                              <button
                                type="button"
                                className="dar-btn-action approve"
                                onClick={() => handleOpenActionModal(item, "approve")}
                                disabled={!isPending}
                                title={isPending ? "Approve Account Deletion" : "Already Reviewed"}
                                aria-label="Approve Request"
                              >
                                <Check size={15} />
                              </button>

                              {/* Quick Reject (Pending only) */}
                              <button
                                type="button"
                                className="dar-btn-action reject"
                                onClick={() => handleOpenActionModal(item, "reject")}
                                disabled={!isPending}
                                title={isPending ? "Reject Deletion Request" : "Already Reviewed"}
                                aria-label="Reject Request"
                              >
                                <X size={15} />
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

            {/* Pagination Controls */}
            {requests.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  Showing <strong>{(currentPage - 1) * limit + 1}</strong> to{" "}
                  <strong>{Math.min(totalFilteredCount, currentPage * limit)}</strong> of{" "}
                  <strong>{totalFilteredCount}</strong> requests
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: "4px 8px", height: "auto" }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span style={{ padding: "0 6px", fontWeight: 600, color: "var(--text)" }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: "4px 8px", height: "auto" }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Request Details Modal ── */}
      <AnimatePresence>
        {detailModalItem && (
          <div className="modal-overlay" onClick={() => setDetailModalItem(null)}>
            <div className="dar-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="dar-modal-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UserX size={18} style={{ color: "#f43f5e" }} />
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--text)",
                      }}
                    >
                      Account Deletion Request Details
                    </h3>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      ID: {detailModalItem._id}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`dar-badge ${
                      detailModalItem.status === "Pending"
                        ? "dar-badge-pending"
                        : detailModalItem.status === "Approved"
                        ? "dar-badge-approved"
                        : "dar-badge-rejected"
                    }`}
                  >
                    <span className="dar-badge-dot" />
                    {detailModalItem.status}
                  </span>

                  <button
                    className="up-min-close"
                    onClick={() => setDetailModalItem(null)}
                    title="Close"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="dar-modal-body">
                {/* User Card */}
                <div className="dar-user-profile-box">
                  <img
                    className="dar-user-avatar"
                    src={
                      detailModalItem.userAvatar ||
                      getInitialsAvatar(detailModalItem.userName || detailModalItem.userEmail)
                    }
                    alt={detailModalItem.userName}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: 700,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {detailModalItem.userName}
                      </h4>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(255, 209, 26, 0.14)",
                          color: "var(--primary)",
                          fontWeight: 700,
                          border: "1px solid rgba(255, 209, 26, 0.3)",
                        }}
                      >
                        {detailModalItem.plan || "Free"}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      {detailModalItem.userEmail || "No Email"}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Phone: {detailModalItem.userPhone || "Not Provided"}
                    </span>
                  </div>
                </div>

                {/* Request Reason Box */}
                <div className="dar-reason-box">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#f43f5e",
                        textTransform: "uppercase",
                      }}
                    >
                      Stated Deletion Reason
                    </span>
                    <span className="dar-reason-pill">
                      {detailModalItem.reasonCategory || "Other"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text)",
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    "{detailModalItem.reasonDetails || "No additional comments provided by user."}"
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="dar-details-grid">
                  <div className="dar-detail-item">
                    <span className="dar-detail-label">User Account ID</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="dar-detail-value" style={{ fontFamily: "monospace" }}>
                        {detailModalItem.userId}
                      </span>
                      <button
                        type="button"
                        className="dar-id-chip"
                        onClick={() => handleCopy(detailModalItem.userId, "modal_uid")}
                        title="Copy User ID"
                      >
                        {copiedText === "modal_uid" ? (
                          <Check size={12} color="#10b981" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="dar-detail-item">
                    <span className="dar-detail-label">Authentication Method</span>
                    <span className="dar-detail-value" style={{ textTransform: "uppercase" }}>
                      {detailModalItem.authProvider || "PHONE"}
                    </span>
                  </div>

                  <div className="dar-detail-item">
                    <span className="dar-detail-label">Submission Date</span>
                    <span className="dar-detail-value">
                      {formatDate(detailModalItem.createdAt)} at{" "}
                      {new Date(detailModalItem.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="dar-detail-item">
                    <span className="dar-detail-label">Platform Origin</span>
                    <span className="dar-detail-value">Flutter Mobile App (iOS / Android)</span>
                  </div>
                </div>

                {/* Review Audit Trail (if reviewed) */}
                {detailModalItem.reviewedAt && (
                  <div
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Review Audit Trail
                    </span>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span style={{ color: "var(--text-soft)" }}>Reviewed By:</span>
                      <strong style={{ color: "var(--text)" }}>
                        {detailModalItem.reviewedByName || "Admin"}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span style={{ color: "var(--text-soft)" }}>Review Timestamp:</span>
                      <span style={{ color: "var(--text)" }}>
                        {formatDate(detailModalItem.reviewedAt)} at{" "}
                        {new Date(detailModalItem.reviewedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {detailModalItem.adminRemarks && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <strong style={{ color: "var(--text)" }}>Admin Remarks:</strong>{" "}
                        {detailModalItem.adminRemarks}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="dar-modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDetailModalItem(null)}
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  Close
                </button>

                {detailModalItem.status === "Pending" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleOpenActionModal(detailModalItem, "reject")}
                      style={{
                        fontSize: "0.8rem",
                        padding: "6px 14px",
                        color: "#f43f5e",
                        borderColor: "rgba(244, 63, 94, 0.4)",
                      }}
                    >
                      <X size={14} /> Reject Request
                    </button>

                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleOpenActionModal(detailModalItem, "approve")}
                      style={{ fontSize: "0.8rem", padding: "6px 16px" }}
                    >
                      <Check size={14} /> Approve & Delete Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Dialog Modal ── */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div
            className="modal-overlay"
            onClick={() =>
              !confirmModal.submitting &&
              setConfirmModal((prev) => ({ ...prev, isOpen: false }))
            }
          >
            <div
              className="dar-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 460 }}
            >
              <div className="dar-modal-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {confirmModal.actionType === "approve" ? (
                    <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
                  ) : (
                    <XCircle size={20} style={{ color: "#f43f5e" }} />
                  )}
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--text)",
                    }}
                  >
                    {confirmModal.actionType === "approve"
                      ? "Approve Account Deletion?"
                      : "Reject Account Deletion?"}
                  </h3>
                </div>
                <button
                  className="up-min-close"
                  onClick={() =>
                    !confirmModal.submitting &&
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  disabled={confirmModal.submitting}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="dar-modal-body" style={{ gap: 12 }}>
                <p
                  style={{
                    fontSize: "0.84rem",
                    color: "var(--text-soft)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {confirmModal.actionType === "approve" ? (
                    <>
                      You are about to approve the account deletion request for{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {confirmModal.item?.userName}
                      </strong>{" "}
                      ({confirmModal.item?.userEmail || confirmModal.item?.userPhone}). This will
                      immediately purge the user profile and execute cascade deletion across all
                      subscriptions, watchlist, and activity history.
                    </>
                  ) : (
                    <>
                      You are rejecting the deletion request for{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {confirmModal.item?.userName}
                      </strong>
                      . The user's account will remain active.
                    </>
                  )}
                </p>

                {/* Admin Remarks Input */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    Admin Remarks / Reason (Optional):
                  </label>
                  <textarea
                    rows={3}
                    disabled={confirmModal.submitting}
                    placeholder={
                      confirmModal.actionType === "approve"
                        ? "e.g., Verified user identity; GDPR deletion executed."
                        : "e.g., User has active VIP subscription cycle; informed to cancel renewal first."
                    }
                    value={confirmModal.remark}
                    onChange={(e) =>
                      setConfirmModal((prev) => ({ ...prev, remark: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg3)",
                      color: "var(--text)",
                      padding: "8px 10px",
                      fontSize: "0.8rem",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div className="dar-modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={confirmModal.submitting}
                  onClick={() =>
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    confirmModal.actionType === "approve"
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                  disabled={confirmModal.submitting}
                  onClick={handleConfirmAction}
                  style={{ fontSize: "0.8rem", padding: "6px 16px" }}
                >
                  {confirmModal.submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader size={13} className="spin-icon" /> Processing...
                    </span>
                  ) : confirmModal.actionType === "approve" ? (
                    "Confirm & Delete"
                  ) : (
                    "Confirm Rejection"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
