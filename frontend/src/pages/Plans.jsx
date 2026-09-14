import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  Crown,
  Check,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  ListFilter,
  Clock,
  Copy,
  CheckCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API from "../api/axios";
import { useToast } from "../App";
import "./Dashboard.css";
import "./Plans.css";

// Duration preset options for convenience
const DURATION_PRESETS = [
  { label: "30 Days (1 Mo)", days: 30, type: "monthly" },
  { label: "90 Days (3 Mo)", days: 90, type: "monthly" },
  { label: "180 Days (6 Mo)", days: 180, type: "monthly" },
  { label: "365 Days (1 Yr)", days: 365, type: "yearly" },
];

// Quick suggestions for OTT streaming features
const FEATURE_SUGGESTIONS = [
  "Ad-Free Streaming",
  "Ultra HD (4K) Video",
  "Full HD (1080p)",
  "4 Screens Simultaneously",
  "2 Screens Simultaneously",
  "Offline Downloads",
  "Dolby Atmos Surround",
  "VIP Early Access",
  "Audio Stories Unlimited",
];

export default function PlansPage() {
  const { showToast } = useToast();

  // Core Data
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search, Filter & Sort
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "active" | "inactive" | "monthly" | "yearly"
  const [sortBy, setSortBy] = useState("recommended"); // "recommended" | "price_asc" | "price_desc" | "duration_asc" | "duration_desc" | "order" | "name"
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Multi-selection
  const [selectedPlanIds, setSelectedPlanIds] = useState(new Set());

  // Modals state
  const [viewPlan, setViewPlan] = useState(null);
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [editingPlanId, setEditingPlanId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "30",
    features: [],
    planType: "monthly",
    sortOrder: 0,
    isRecommended: false,
    isActive: true,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState("");

  // Custom Confirm / Alert Modal
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

  const showConfirm = ({
    title,
    message,
    type = "danger",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
  }) => {
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

  // ==========================================
  // 📥 FETCH PLANS
  // ==========================================
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/plan");
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
      showToast?.("Failed to fetch subscription plans", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterType, sortBy, pageSize]);

  // ==========================================
  // 📊 CALCULATED KPI STATS
  // ==========================================
  const kpis = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.isActive !== false).length;
    const inactive = total - active;
    const monthly = plans.filter((p) => (p.planType || "monthly") === "monthly").length;
    const yearly = plans.filter((p) => p.planType === "yearly").length;
    const recommended = plans.find((p) => p.isRecommended);

    return {
      total,
      active,
      inactive,
      monthly,
      yearly,
      recommendedName: recommended ? recommended.name : "None",
    };
  }, [plans]);

  // ==========================================
  // 🔍 FILTERED, SEARCHED & SORTED PLANS
  // ==========================================
  const filteredAndSortedPlans = useMemo(() => {
    let result = plans.filter((p) => {
      // Filter switch
      if (filterType === "active" && p.isActive === false) return false;
      if (filterType === "inactive" && p.isActive !== false) return false;
      if (filterType === "monthly" && (p.planType || "monthly") !== "monthly") return false;
      if (filterType === "yearly" && p.planType !== "yearly") return false;

      // Search match
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchPrice = String(p.price || "").includes(q);
        const matchDuration = String(p.duration || "").includes(q);
        const matchFeatures =
          Array.isArray(p.features) && p.features.some((f) => f.toLowerCase().includes(q));
        return matchName || matchPrice || matchDuration || matchFeatures;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "recommended") {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "duration_asc") return (a.duration || 0) - (b.duration || 0);
      if (sortBy === "duration_desc") return (b.duration || 0) - (a.duration || 0);
      if (sortBy === "order") return (a.sortOrder || 0) - (b.sortOrder || 0);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

    return result;
  }, [plans, filterType, search, sortBy]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedPlans.length / pageSize));
  const paginatedPlans = useMemo(() => {
    if (pageSize === 9999) return filteredAndSortedPlans;
    const start = (page - 1) * pageSize;
    return filteredAndSortedPlans.slice(start, start + pageSize);
  }, [filteredAndSortedPlans, page, pageSize]);

  // ==========================================
  // 🎛️ SELECTION HANDLERS
  // ==========================================
  const isAllSelected =
    filteredAndSortedPlans.length > 0 &&
    filteredAndSortedPlans.every((p) => selectedPlanIds.has(p._id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPlanIds(new Set());
    } else {
      const next = new Set(selectedPlanIds);
      filteredAndSortedPlans.forEach((p) => next.add(p._id));
      setSelectedPlanIds(next);
    }
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedPlanIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlanIds(next);
  };

  // ==========================================
  // ➕ MODAL OPENERS
  // ==========================================
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingPlanId(null);
    setForm({
      name: "",
      price: "",
      duration: "30",
      features: ["HD Streaming", "Ad-Free Content"],
      planType: "monthly",
      sortOrder: plans.length + 1,
      isRecommended: false,
      isActive: true,
    });
    setFeatureInput("");
  };

  const handleOpenEdit = (plan) => {
    setModalMode("edit");
    setEditingPlanId(plan._id);
    setForm({
      name: plan.name || "",
      price: plan.price ?? "",
      duration: plan.duration ?? "",
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      planType: ["monthly", "yearly"].includes(plan.planType) ? plan.planType : "monthly",
      sortOrder: plan.sortOrder || 0,
      isRecommended: plan.isRecommended || false,
      isActive: plan.isActive !== false,
    });
    setFeatureInput("");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditingPlanId(null);
    setFeatureInput("");
  };

  // ==========================================
  // 🏷️ FEATURE TAGS BUILDER
  // ==========================================
  const handleAddFeature = (featToAdd) => {
    const text = (featToAdd !== undefined ? featToAdd : featureInput).trim();
    if (!text) return;

    // Support comma-separated strings
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    setForm((prev) => {
      const newFeatures = [...prev.features];
      parts.forEach((p) => {
        if (!newFeatures.includes(p)) {
          newFeatures.push(p);
        }
      });
      return { ...prev, features: newFeatures };
    });
    setFeatureInput("");
  };

  const handleRemoveFeature = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleApplyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      duration: preset.days,
      planType: preset.type,
    }));
  };

  // ==========================================
  // 💾 SAVE (CREATE / UPDATE)
  // ==========================================
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast?.("Please enter a valid plan name", "error");
      return;
    }
    if (form.price === "" || Number(form.price) < 0) {
      showToast?.("Please enter a valid price", "error");
      return;
    }
    if (!form.duration || Number(form.duration) < 1) {
      showToast?.("Duration must be at least 1 day", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        features: form.features,
        planType: form.planType,
        sortOrder: Number(form.sortOrder) || 0,
        isRecommended: Boolean(form.isRecommended),
        isActive: Boolean(form.isActive),
      };

      if (modalMode === "create") {
        await API.post("/admin/plan", payload);
        showToast?.("Subscription plan created successfully", "success");
      } else {
        await API.patch(`/admin/plan/${editingPlanId}`, payload);
        showToast?.("Subscription plan updated successfully", "success");
      }

      handleCloseModal();
      fetchPlans();
    } catch (err) {
      console.error("Save plan error:", err);
      const msg = err.response?.data?.message || "Failed to save subscription plan";
      showToast?.(msg, "error");
    }
    setSaving(false);
  };

  // ==========================================
  // 🔄 TOGGLE ACTIVE STATUS
  // ==========================================
  const handleToggleStatus = async (plan) => {
    const nextStatus = plan.isActive === false;
    try {
      await API.patch(`/admin/plan/${plan._id}`, { isActive: nextStatus });
      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, isActive: nextStatus } : p))
      );
      showToast?.(
        `Plan "${plan.name}" is now ${nextStatus ? "Active" : "Inactive"}`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast?.("Failed to toggle status", "error");
    }
  };

  // ==========================================
  // ❌ DELETE PLAN
  // ==========================================
  const handleDeletePlan = (plan) => {
    showConfirm({
      title: "Delete Subscription Plan?",
      message: `Are you sure you want to delete "${plan.name}"? Existing subscribers won't be deleted, but new signups cannot select this plan.`,
      type: "danger",
      confirmText: "Delete Plan",
      onConfirm: async () => {
        try {
          await API.delete(`/admin/plan/${plan._id}`);
          setPlans((prev) => prev.filter((p) => p._id !== plan._id));
          setSelectedPlanIds((prev) => {
            const copy = new Set(prev);
            copy.delete(plan._id);
            return copy;
          });
          showToast?.("Plan deleted successfully", "success");
        } catch (err) {
          console.error(err);
          showToast?.("Failed to delete plan", "error");
        }
      },
    });
  };

  // ==========================================
  // ⚡ BULK ACTIONS
  // ==========================================
  const handleBulkActivate = async (activate = true) => {
    try {
      const ids = Array.from(selectedPlanIds);
      await Promise.all(
        ids.map((id) => API.patch(`/admin/plan/${id}`, { isActive: activate }))
      );
      setPlans((prev) =>
        prev.map((p) => (selectedPlanIds.has(p._id) ? { ...p, isActive: activate } : p))
      );
      showToast?.(`Selected plans set to ${activate ? "Active" : "Inactive"}`, "success");
      setSelectedPlanIds(new Set());
    } catch (err) {
      console.error(err);
      showToast?.("Failed to update selected plans", "error");
    }
  };

  const handleBulkDelete = () => {
    showConfirm({
      title: `Delete ${selectedPlanIds.size} Plans?`,
      message: "This will permanently remove all selected subscription tiers. This action cannot be undone.",
      type: "danger",
      confirmText: "Delete Selected",
      onConfirm: async () => {
        try {
          const ids = Array.from(selectedPlanIds);
          await Promise.all(ids.map((id) => API.delete(`/admin/plan/${id}`)));
          setPlans((prev) => prev.filter((p) => !selectedPlanIds.has(p._id)));
          setSelectedPlanIds(new Set());
          showToast?.("Selected plans deleted successfully", "success");
        } catch (err) {
          console.error(err);
          showToast?.("Failed to delete selected plans", "error");
        }
      },
    });
  };

  // ==========================================
  // 📋 COPY HELPER
  // ==========================================
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(""), 2000);
  };

  // ==========================================
  // 📑 EXPORT EXCEL & PDF
  // ==========================================
  const handleExportExcel = () => {
    const listToExport =
      selectedPlanIds.size > 0
        ? plans.filter((p) => selectedPlanIds.has(p._id))
        : filteredAndSortedPlans;

    if (listToExport.length === 0) {
      showToast?.("No plans to export", "error");
      return;
    }

    const data = listToExport.map((p, index) => ({
      "S.No": index + 1,
      "Plan Name": p.name || "N/A",
      "Billing Cycle": (p.planType || "Monthly").toUpperCase(),
      "Duration (Days)": p.duration || 0,
      "Price (INR)": p.price || 0,
      Status: p.isActive !== false ? "Active" : "Inactive",
      Recommended: p.isRecommended ? "Yes" : "No",
      Features: Array.isArray(p.features) ? p.features.join(", ") : "",
      "Sort Order": p.sortOrder || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscription Plans");
    XLSX.writeFile(wb, `GoliDoli_Subscription_Plans_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast?.("Exported to Excel successfully", "success");
  };

  const handleExportPDF = () => {
    const listToExport =
      selectedPlanIds.size > 0
        ? plans.filter((p) => selectedPlanIds.has(p._id))
        : filteredAndSortedPlans;

    if (listToExport.length === 0) {
      showToast?.("No plans to export", "error");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("GoliDoli OTT - Subscription Plans Report", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 25);

    const tableRows = listToExport.map((p, index) => [
      index + 1,
      p.name || "N/A",
      (p.planType || "monthly").toUpperCase(),
      `${p.duration} days`,
      `₹${p.price}`,
      p.isActive !== false ? "Active" : "Inactive",
      p.isRecommended ? "Yes" : "No",
      Array.isArray(p.features) ? p.features.slice(0, 3).join(", ") : "",
    ]);

    autoTable(doc, {
      head: [["#", "Plan Name", "Type", "Duration", "Price", "Status", "Featured", "Key Features"]],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [18, 24, 39], textColor: [255, 209, 26], fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`GoliDoli_Subscription_Plans_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast?.("Exported to PDF successfully", "success");
  };

  return (
    <div className="page-section">
      {/* ── Page Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <CreditCard className="pg-title-icon" size={20} />
            Subscription Plans
          </h1>
          <p className="pg-sub">Configure membership tiers, pricing models, and subscriber benefits</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={fetchPlans}
            disabled={loading}
            title="Refresh Plans"
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreate}
          >
            <Plus size={15} /> Create Plan
          </button>
        </div>
      </div>

      {/* ── Symmetrical 4-Card KPI Grid (Dashboard Style) ── */}
      <div className="kpi-grid">
        {/* KPI 1: Total Plans */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Plans</span>
            <div className="kpi-icon-badge icon-amber">
              <CreditCard size={15} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : kpis.total}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Configured membership tiers
          </div>
        </div>

        {/* KPI 2: Active Tiers */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Tiers</span>
            <div className="kpi-icon-badge icon-emerald">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {loading ? "..." : kpis.active}
          </div>
          <div className="kpi-footer" style={{ color: "#10B981" }}>
            {kpis.total > 0
              ? `${Math.round((kpis.active / kpis.total) * 100)}% available on checkout`
              : "Live on platform"}
          </div>
        </div>

        {/* KPI 3: Monthly Tiers */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Monthly Plans</span>
            <div className="kpi-icon-badge icon-blue">
              <Calendar size={15} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : kpis.monthly}</div>
          <div className="kpi-footer" style={{ color: "var(--text-muted)" }}>
            Short-term recurring tiers
          </div>
        </div>

        {/* KPI 4: Yearly Tiers */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Yearly Plans</span>
            <div className="kpi-icon-badge icon-pink">
              <Crown size={15} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : kpis.yearly}</div>
          <div className="kpi-footer" style={{ color: "var(--primary)" }}>
            <Sparkles size={12} />
            <span>High-retention tiers</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Box ── */}
      <div className="content-box">
        {/* Bulk Action Bar when items selected */}
        {selectedPlanIds.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-actions-info">
              <Shield size={16} style={{ color: "var(--primary)" }} />
              <span>
                <strong>{selectedPlanIds.size}</strong> of {filteredAndSortedPlans.length} plans selected
              </span>
            </div>
            <div className="bulk-actions-btns">
              <button
                className="btn btn-ghost"
                style={{ fontSize: "0.74rem", padding: "5px 10px", height: "auto" }}
                onClick={() => handleBulkActivate(true)}
              >
                Set Active
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "0.74rem", padding: "5px 10px", height: "auto" }}
                onClick={() => handleBulkActivate(false)}
              >
                Set Inactive
              </button>
              <button
                className="bulk-delete-btn"
                onClick={handleBulkDelete}
              >
                <Trash2 size={13} /> Delete Selected
              </button>
              <button
                className="icon-btn"
                onClick={() => setSelectedPlanIds(new Set())}
                title="Clear selection"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar Row */}
        <div className="plans-toolbar">
          {/* Left: Search & Filter Segmented Switch */}
          <div className="plans-toolbar-left">
            {/* Search Field */}
            <div className="search-field" style={{ padding: "7px 12px" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search plans by name, perks, price..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "0.84rem" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segmented Filter Switch */}
            <div className="segmented-switch">
              {[
                { value: "all", label: "All Plans" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-switch-btn ${filterType === opt.value ? "active" : ""}`}
                  onClick={() => setFilterType(opt.value)}
                >
                  {filterType === opt.value && (
                    <motion.div
                      layoutId="activePlanFilterPill"
                      className="segmented-switch-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="segmented-switch-btn-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Sort, View Toggle & Export Utilities */}
          <div className="plans-toolbar-right">
            {/* Sort Dropdown */}
            <select
              className="plans-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort subscription plans"
            >
              <option value="recommended">⭐ Recommended First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="duration_asc">Duration: Shortest</option>
              <option value="duration_desc">Duration: Longest</option>
              <option value="order">Display Order (#)</option>
              <option value="name">Name (A - Z)</option>
            </select>

            {/* View Mode Switcher: Cards vs Table */}
            <div className="plans-view-toggle">
              <button
                type="button"
                className={`plans-view-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Card Grid View"
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`plans-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Data Table View"
              >
                <ListFilter size={14} />
                <span>Table</span>
              </button>
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              title="Export to Excel"
            >
              <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              title="Export to PDF"
            >
              <FileText size={15} style={{ color: "#FF0F8A" }} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* ── Content View Area ── */}
        {loading ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid rgba(255, 209, 26, 0.2)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px auto",
              }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading subscription plans...</p>
          </div>
        ) : filteredAndSortedPlans.length === 0 ? (
          <div className="empty-state" style={{ padding: "56px 0" }}>
            <CreditCard size={36} style={{ color: "var(--text-muted)", opacity: 0.4, margin: "0 auto 8px auto" }} />
            <h4 style={{ color: "var(--text)", fontSize: "1rem", fontWeight: 600, marginTop: 6 }}>
              {search || filterType !== "all" ? "No plans match your filter" : "No subscription plans found"}
            </h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", maxWidth: "340px", margin: "4px auto 16px auto" }}>
              {search || filterType !== "all"
                ? "Try adjusting your search query or switching to another filter category."
                : "Create your first subscription tier to start offering memberships to your subscribers."}
            </p>
            {search || filterType !== "all" ? (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setFilterType("all");
                }}
                style={{ fontSize: "0.8rem", padding: "6px 14px", height: "auto" }}
              >
                Reset Filters
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleOpenCreate}
                style={{ fontSize: "0.8rem", padding: "6px 16px", height: "auto" }}
              >
                <Plus size={15} /> Create First Plan
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* ==========================================
             CARDS GRID VIEW
             ========================================== */
          <>
            <div className="plan-cards-grid">
              {paginatedPlans.map((p) => {
                const isSelected = selectedPlanIds.has(p._id);
                const isActive = p.isActive !== false;
                const isYearly = p.planType === "yearly";
                const monthlyEq =
                  p.duration >= 300
                    ? Math.round((Number(p.price) || 0) / ((Number(p.duration) || 365) / 30))
                    : null;

                return (
                  <div
                    key={p._id}
                    className={`plan-tier-card ${p.isRecommended ? "is-recommended" : ""} ${
                      !isActive ? "is-inactive" : ""
                    }`}
                    style={isSelected ? { borderColor: "var(--primary)" } : undefined}
                  >
                    {/* Card Top */}
                    <div>
                      <div className="plan-card-top">
                        <div className="plan-badges-group">
                          <span className={`plan-type-badge ${isYearly ? "yearly" : ""}`}>
                            {p.planType || "Monthly"}
                          </span>
                          {p.isRecommended && (
                            <span className="plan-rec-badge">
                              <Crown size={11} /> Popular Choice
                            </span>
                          )}
                          {p.sortOrder !== undefined && p.sortOrder > 0 && (
                            <span className="sort-order-badge" title="Sort Order">
                              #{p.sortOrder}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* Checkbox for batch select */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(p._id)}
                            style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            title="Select plan for bulk actions"
                          />
                        </div>
                      </div>

                      {/* Plan Name & Pricing */}
                      <div className="plan-card-title">
                        <span>{p.name}</span>
                      </div>

                      <div className="plan-card-price-wrap">
                        <div className="plan-card-price-row">
                          <span className="plan-card-price">₹{p.price}</span>
                          <span className="plan-card-period">
                            / {p.duration} {p.duration === 1 ? "day" : "days"}
                          </span>
                        </div>
                        {monthlyEq && (
                          <span className="plan-card-subprice">
                            Equivalent to approx. ₹{monthlyEq}/month
                          </span>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="plan-features-list">
                        {Array.isArray(p.features) && p.features.length > 0 ? (
                          p.features.map((feat, idx) => (
                            <div key={idx} className="plan-feature-item">
                              <Check size={14} className="plan-feature-icon" />
                              <span>{feat}</span>
                            </div>
                          ))
                        ) : (
                          <span className="plan-features-empty">No specific perks listed</span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="plan-card-footer">
                      {/* Standardized System Status Toggle */}
                      <div className="status-toggle-wrap">
                        <label
                          className="switch-container"
                          title={isActive ? "Click to set Inactive" : "Click to set Active"}
                        >
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={isActive}
                            onChange={() => handleToggleStatus(p)}
                          />
                          <span className="switch-slider" />
                        </label>
                        <span className={`status-label ${isActive ? "active" : "inactive"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="plan-card-actions">
                        <button
                          className="icon-btn view"
                          onClick={() => setViewPlan(p)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="icon-btn edit"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Plan"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDeletePlan(p)}
                          title="Delete Plan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredAndSortedPlans.length > 0 && (
              <div className="plans-pagination-bar">
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Showing{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {Math.min(filteredAndSortedPlans.length, (page - 1) * pageSize + 1)} -{" "}
                    {Math.min(filteredAndSortedPlans.length, page * pageSize)}
                  </strong>{" "}
                  of {filteredAndSortedPlans.length} plans
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      style={{
                        padding: "2px 6px",
                        fontSize: "0.74rem",
                        background: "var(--bg3)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        outline: "none",
                      }}
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={9999}>All</option>
                    </select>
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.74rem",
                          opacity: page === 1 ? 0.4 : 1,
                        }}
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.74rem",
                          opacity: page === totalPages ? 0.4 : 1,
                        }}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ==========================================
             TABLE VIEW
             ========================================== */
          <>
            <div className="tbl-wrap" style={{ marginTop: 6 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "32px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                      />
                    </th>
                    <th style={{ width: "45px" }}>#</th>
                    <th>Plan Tier</th>
                    <th>Billing Cycle</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Benefits & Perks</th>
                    <th>Live Status</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlans.map((p, idx) => {
                    const isSelected = selectedPlanIds.has(p._id);
                    const isActive = p.isActive !== false;
                    const isYearly = p.planType === "yearly";
                    const rowNumber = (page - 1) * pageSize + idx + 1;

                    return (
                      <tr
                        key={p._id}
                        style={isSelected ? { background: "rgba(255, 209, 26, 0.04)" } : undefined}
                      >
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(p._id)}
                            style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                        </td>
                        <td>
                          <span className="sort-order-badge">#{p.sortOrder || rowNumber}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</span>
                            {p.isRecommended && (
                              <span
                                className="plan-rec-badge"
                                style={{ padding: "1px 6px", fontSize: "0.64rem" }}
                              >
                                <Crown size={10} /> Popular
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`plan-type-badge ${isYearly ? "yearly" : ""}`}
                            style={{ fontSize: "0.68rem" }}
                          >
                            {p.planType || "Monthly"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: "var(--text)" }}>₹{p.price}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "var(--text-soft)",
                              fontSize: "0.8rem",
                            }}
                          >
                            <Clock size={12} style={{ color: "var(--text-muted)" }} />
                            {p.duration} days
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                background: "var(--bg3)",
                                border: "1px solid var(--border)",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                color: "var(--text-soft)",
                              }}
                            >
                              {Array.isArray(p.features) ? `${p.features.length} perks` : "0 perks"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="status-toggle-wrap">
                            <label
                              className="switch-container"
                              title={isActive ? "Click to set Inactive" : "Click to set Active"}
                            >
                              <input
                                type="checkbox"
                                className="switch-input"
                                checked={isActive}
                                onChange={() => handleToggleStatus(p)}
                              />
                              <span className="switch-slider" />
                            </label>
                            <span className={`status-label ${isActive ? "active" : "inactive"}`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="actions" style={{ textAlign: "right" }}>
                          <button
                            className="icon-btn view"
                            onClick={() => setViewPlan(p)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="icon-btn edit"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Plan"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-btn del"
                            onClick={() => handleDeletePlan(p)}
                            title="Delete Plan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredAndSortedPlans.length > 0 && (
              <div className="plans-pagination-bar">
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Showing{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {Math.min(filteredAndSortedPlans.length, (page - 1) * pageSize + 1)} -{" "}
                    {Math.min(filteredAndSortedPlans.length, page * pageSize)}
                  </strong>{" "}
                  of {filteredAndSortedPlans.length} plans
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      style={{
                        padding: "2px 6px",
                        fontSize: "0.74rem",
                        background: "var(--bg3)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        outline: "none",
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={9999}>All</option>
                    </select>
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.74rem",
                          opacity: page === 1 ? 0.4 : 1,
                        }}
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.74rem",
                          opacity: page === totalPages ? 0.4 : 1,
                        }}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==========================================
         CREATE / EDIT PLAN MODAL
         ========================================== */}
      {modalMode && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-box plan-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {modalMode === "create" ? (
                  <>
                    <Plus size={18} style={{ color: "var(--primary)" }} /> Create Subscription Plan
                  </>
                ) : (
                  <>
                    <Pencil size={18} style={{ color: "var(--primary)" }} /> Edit Subscription Plan
                  </>
                )}
              </h3>
              <button className="modal-close" onClick={handleCloseModal} type="button">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="plan-modal-form">
              <div className="plan-modal-scroll-body">
                {/* Row 1: Plan Name & Billing Cycle (50% / 50%) */}
                <div className="plan-form-grid-2col">
                  <div className="plan-form-row">
                    <label className="plan-form-label">Plan Name *</label>
                    <input
                      className="form-input-styled"
                      placeholder="e.g. Standard HD, Premium 4K, VIP Annual"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="plan-form-row">
                    <label className="plan-form-label">Billing Cycle</label>
                    <select
                      className="form-input-styled"
                      value={form.planType}
                      onChange={(e) => setForm({ ...form, planType: e.target.value })}
                    >
                      <option value="monthly">Monthly Cycle</option>
                      <option value="yearly">Yearly Cycle</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Price & Display Order (50% / 50% Symmetry) */}
                <div className="plan-form-grid-2col">
                  <div className="plan-form-row">
                    <label className="plan-form-label">Price (₹) *</label>
                    <input
                      className="form-input-styled"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 199 or 999"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="plan-form-row">
                    <label className="plan-form-label">Display Order (#)</label>
                    <input
                      className="form-input-styled"
                      type="number"
                      placeholder="e.g. 1 (lower displays first)"
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 3: Validity Duration with Inline Horizontal Presets */}
                <div className="plan-form-row">
                  <label className="plan-form-label">Duration (Days) *</label>
                  <div className="plan-duration-row">
                    <div className="plan-duration-input-wrap">
                      <input
                        className="form-input-styled"
                        type="number"
                        min="1"
                        placeholder="e.g. 30"
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        required
                      />
                    </div>
                    <div className="plan-duration-presets">
                      {DURATION_PRESETS.map((preset) => (
                        <button
                          key={preset.days}
                          type="button"
                          className={`duration-preset-btn ${
                            Number(form.duration) === preset.days ? "active" : ""
                          }`}
                          onClick={() => handleApplyPreset(preset)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 4: Standardized Toggle Switches Grid (50% / 50%) */}
                <div className="plan-form-toggles-grid">
                  {/* Featured Plan Toggle */}
                  <div
                    className="plan-toggle-card"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, isRecommended: !prev.isRecommended }))
                    }
                  >
                    <div className="plan-toggle-text">
                      <span className="plan-toggle-label">⭐ Recommended Plan</span>
                      <span className="plan-toggle-sub">
                        Highlight with glowing accent border and popular badge
                      </span>
                    </div>
                    <label
                      className="switch-container switch-gold"
                      title="Toggle Featured Status"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={form.isRecommended}
                        onChange={(e) =>
                          setForm({ ...form, isRecommended: e.target.checked })
                        }
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* Active Status Toggle */}
                  <div
                    className="plan-toggle-card"
                    onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  >
                    <div className="plan-toggle-text">
                      <span className="plan-toggle-label">🟢 Active on Checkout</span>
                      <span className="plan-toggle-sub">
                        Make this tier selectable by subscribers
                      </span>
                    </div>
                    <label
                      className="switch-container"
                      title="Toggle Active Status"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>

                {/* Row 5: Perks & Features Builder */}
                <div className="plan-form-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="plan-form-label">Plan Benefits & Features</label>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      {form.features.length} Perks Added
                    </span>
                  </div>

                  <div className="feature-builder-box">
                    <div className="feature-input-group">
                      <input
                        className="form-input-styled"
                        placeholder="Type perk and press Enter or click Add..."
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleAddFeature()}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    {/* Suggestion Chips */}
                    <div className="feature-suggestions">
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", marginRight: 2 }}>
                        Suggestions:
                      </span>
                      {FEATURE_SUGGESTIONS.map((sug) => {
                        const isAdded = form.features.includes(sug);
                        return (
                          <button
                            key={sug}
                            type="button"
                            className={`feature-suggestion-btn ${isAdded ? "added" : ""}`}
                            onClick={() => !isAdded && handleAddFeature(sug)}
                            disabled={isAdded}
                          >
                            {isAdded ? "✓ " : "+ "}{sug}
                          </button>
                        );
                      })}
                    </div>

                    {/* Features Tag Container */}
                    {form.features.length > 0 ? (
                      <div className="feature-tags-container">
                        {form.features.map((feat, idx) => (
                          <span key={idx} className="feature-tag-chip">
                            <Check size={12} style={{ color: "#10B981" }} />
                            <span>{feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(idx)}
                              title="Remove perk"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                      >
                        No perks added yet. Type custom benefits or select from suggestions above.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Modal Footer */}
              <div className="plan-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" /> Saving...
                    </>
                  ) : modalMode === "create" ? (
                    "Create Plan"
                  ) : (
                    "Update Plan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         VIEW PLAN DETAILS MODAL
         ========================================== */}
      {viewPlan && (
        <div className="modal-overlay" onClick={() => setViewPlan(null)}>
          <div
            className="modal-box modal-box-view"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={18} style={{ color: "var(--primary)" }} /> Plan Specifications
              </h3>
              <button className="modal-close" onClick={() => setViewPlan(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 22 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                }}
              >
                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Plan Name
                  </span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>
                      {viewPlan.name}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleCopy(viewPlan.name, "name")}
                      title="Copy plan name"
                      style={{ width: "24px", height: "24px" }}
                    >
                      {copiedLabel === "name" ? (
                        <CheckCheck size={13} style={{ color: "#10b981" }} />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Pricing Rate
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)" }}>
                    ₹{viewPlan.price}
                  </span>
                </div>

                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Validity Duration
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" }}>
                    {viewPlan.duration} Days
                  </span>
                </div>

                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Billing Cycle
                  </span>
                  <span className={`plan-type-badge ${viewPlan.planType === "yearly" ? "yearly" : ""}`}>
                    {viewPlan.planType || "Monthly"}
                  </span>
                </div>

                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Status
                  </span>
                  <div className="status-toggle-wrap">
                    <span
                      className={`status-label ${
                        viewPlan.isActive !== false ? "active" : "inactive"
                      }`}
                    >
                      ● {viewPlan.isActive !== false ? "Active on Checkout" : "Inactive / Draft"}
                    </span>
                  </div>
                </div>

                <div
                  className="p-detail-card"
                  style={{ background: "var(--bg3)", padding: "14px", borderRadius: "10px" }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Featured Status
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: viewPlan.isRecommended ? "var(--primary)" : "var(--text-muted)",
                    }}
                  >
                    {viewPlan.isRecommended ? "⭐ Recommended Plan" : "Standard Tier"}
                  </span>
                </div>

                {/* Features Breakdown */}
                <div
                  className="p-detail-card"
                  style={{
                    background: "var(--bg3)",
                    padding: "16px",
                    borderRadius: "10px",
                    gridColumn: "1 / -1",
                  }}
                >
                  <span
                    className="p-detail-label"
                    style={{
                      display: "block",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginBottom: 10,
                    }}
                  >
                    Subscriber Benefits & Perks ({viewPlan.features?.length || 0})
                  </span>
                  {Array.isArray(viewPlan.features) && viewPlan.features.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {viewPlan.features.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: "0.82rem",
                            color: "var(--text-soft)",
                          }}
                        >
                          <Check size={14} style={{ color: "#10B981", flexShrink: 0 }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No specific perks listed for this tier.
                    </span>
                  )}
                </div>
              </div>

              {/* View Modal Footer Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setViewPlan(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const target = viewPlan;
                    setViewPlan(null);
                    handleOpenEdit(target);
                  }}
                >
                  <Pencil size={14} /> Edit Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         CONFIRMATION / ALERT DIALOG POPUP
         ========================================== */}
      {dialog.isOpen && (
        <div
          className="modal-overlay confirm-overlay"
          onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon-badge ${dialog.type}`}>
              {dialog.type === "danger" ? (
                <AlertCircle size={24} />
              ) : dialog.type === "warning" ? (
                <Shield size={24} />
              ) : (
                <CheckCircle size={24} />
              )}
            </div>
            <h3 className="confirm-title">{dialog.title}</h3>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              {dialog.showCancel && (
                <button
                  className="confirm-btn-cancel"
                  onClick={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                  {dialog.cancelText || "Cancel"}
                </button>
              )}
              <button
                className={dialog.type === "danger" ? "confirm-btn-danger" : "btn btn-primary"}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  borderRadius: 10,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  setDialog((prev) => ({ ...prev, isOpen: false }));
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
