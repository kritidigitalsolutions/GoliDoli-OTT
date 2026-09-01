import { useEffect, useState } from "react";
import { Search, Eye, Trash2, Ban, X, ChevronLeft, ChevronRight, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import API from "../api/axios";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState({
    todayIncome: { total: 0, subsCount: 0, usersCount: 0 },
    yesterdayIncome: { total: 0, subsCount: 0, usersCount: 0 },
    totalIncome: { total: 0, subsCount: 0, usersCount: 0 },
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSub, setViewSub] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [dateFilter, setDateFilter] = useState("all");
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSubs, resStats] = await Promise.all([
        API.get("/admin/subscription/all"),
        API.get("/admin/subscription/income-stats")
      ]);
      setSubs(resSubs.data.subscriptions || []);
      setStats(resStats.data.data || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await API.patch(`/admin/subscription/${id}/cancel`);
      alert("Subscription cancelled successfully.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to cancel subscription.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this subscription?")) return;
    try {
      await API.delete(`/admin/subscription/${id}`);
      alert("Subscription deleted successfully.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete subscription.");
    }
  };

  const filteredSubs = subs.filter((sub) => {
    const isActive = sub.status === "active" && new Date(sub.endDate) > new Date();
    const isCancelled = sub.status === "cancelled";
    const isExpired = sub.status === "expired" || (sub.status === "active" && new Date(sub.endDate) <= new Date());

    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "cancelled" && !isCancelled) return false;
    if (statusFilter === "expired" && !isExpired) return false;

    if (dateFilter !== "all") {
      const targetDate = sub.createdAt || sub.startDate ? new Date(sub.createdAt || sub.startDate) : null;
      if (!targetDate || isNaN(targetDate.getTime())) return false;
      const now = new Date();

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

    const userName = (sub.user?.name || "").toLowerCase();
    const userEmail = (sub.user?.email || "").toLowerCase();
    const userPhone = (sub.user?.phone || "").toLowerCase();
    const planName = (sub.plan?.name || sub.plan || "").toLowerCase();
    const voucher = (sub.voucherCode || "").toLowerCase();
    const promo = (sub.promoCode || "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    
    return (
      userName.includes(q) ||
      userEmail.includes(q) ||
      userPhone.includes(q) ||
      planName.includes(q) ||
      voucher.includes(q) ||
      promo.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE);
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="subscription-page">
      {/* Header */}
      <div className="sub-header-row">
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>💳</span> Subscriptions
          </h2>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0 0", fontSize: "0.95rem" }}>
            Search, manage, and review subscriber access.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} style={{ borderRadius: '8px', padding: '8px 16px' }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="sub-stats-grid">
        <div className="sub-stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper bg-green">
              <TrendingUp size={20} className="text-green" />
            </div>
            <div className="stat-titles">
              <div className="stat-label-row">
                <span className="stat-label">TODAY <br/>(IST)</span>
                <span className="stat-time">12 AM - 11:59<br/>PM</span>
              </div>
            </div>
          </div>
          <div className="stat-value">₹{(stats.todayIncome?.total || 0).toLocaleString('en-IN')}</div>
          <div className="stat-desc">
            <span className="text-muted">👥 {stats.todayIncome?.subsCount || 0} subs ({stats.todayIncome?.usersCount || 0} users)</span>
          </div>
        </div>

        <div className="sub-stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper bg-blue">
              <Calendar size={20} className="text-blue" />
            </div>
            <div className="stat-titles">
              <div className="stat-label-row">
                <span className="stat-label">YESTERDAY <br/>(IST)</span>
                <span className="stat-time">12 AM - 11:59<br/>PM</span>
              </div>
            </div>
          </div>
          <div className="stat-value">₹{(stats.yesterdayIncome?.total || 0).toLocaleString('en-IN')}</div>
          <div className="stat-desc">
            <span className="text-muted">👥 {stats.yesterdayIncome?.subsCount || 0} subs ({stats.yesterdayIncome?.usersCount || 0} users)</span>
          </div>
        </div>

        <div className="sub-stat-card highlight-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper bg-purple">
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc' }}>₹</span>
            </div>
            <div className="stat-titles" style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="stat-label">TOTAL REVENUE</span>
              <span className="stat-time badge-dark">All Time</span>
            </div>
          </div>
          <div className="stat-value">₹{(stats.totalIncome?.total || 0).toLocaleString('en-IN')}</div>
          <div className="stat-desc">
            <span className="text-muted">👥 {stats.totalIncome?.subsCount || 0} subs</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="sub-filter-row">
        <div className="sub-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by user name, email, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="sub-select" 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_month">This Month</option>
        </select>

        <select 
          className="sub-select" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="tbl-wrap">
        <table className="subscription-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>PLAN</th>
              <th>STATUS</th>
              <th>AMOUNT</th>
              <th>EXPIRY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {paginatedSubs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                  Not Found
                </td>
              </tr>
            ) : (
              paginatedSubs.map((sub) => {
                const isActive = sub.status === "active" && new Date(sub.endDate) > new Date();

                return (
                  <tr key={sub._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{sub.user?.name || "User"}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {sub.user?.phone || sub.user?.email || "-"}
                      </div>
                    </td>

                    <td className="plan">{sub.plan?.name || sub.plan || "-"}</td>

                    <td>
                      <span className={isActive ? "status active" : "status expired"}>
                        {sub.status === "active" ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired"}
                      </span>
                    </td>

                    <td style={{ color: 'var(--text)' }}>₹{sub.amount || 0}</td>

                    <td style={{ color: 'var(--text-muted)' }}>
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-GB') : "-"}
                    </td>

                    <td className="actions">
                      <button
                        className="icon-btn view"
                        onClick={() => setViewSub(sub)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>

                      {isActive && (
                        <button
                          className="icon-btn btn-warning-outline"
                          onClick={() => handleCancel(sub._id)}
                          title="Cancel Subscription"
                        >
                          <Ban size={14} style={{ marginRight: '4px' }}/> Cancel
                        </button>
                      )}

                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(sub._id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSubs.length}
        onPageChange={setCurrentPage}
      />

      {/* ================= VIEW MODAL ================= */}
      {viewSub && (
        <div className="modal-overlay" onClick={() => setViewSub(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(192,132,252,0.1), transparent)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
                <span style={{ fontSize: '1.4rem' }}>🧾</span> Subscription Details
              </h3>
              <button className="modal-close" onClick={() => setViewSub(null)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ padding: 0, overflowY: 'auto', maxHeight: '75vh' }}>
              <div className="profile-details-grid" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                
                {[
                  { label: "Subscriber", value: viewSub.user?.name || "-" },
                  { label: "Email Address", value: viewSub.user?.email || "-" },
                  { label: "Phone Number", value: viewSub.user?.phone || "-" },
                  { label: "Plan Name", value: viewSub.plan?.name || viewSub.plan || "-" },
                  { label: "Amount Paid", value: `₹${viewSub.amount || 0}`, highlight: true },
                  { label: "Start Date", value: viewSub.startDate ? new Date(viewSub.startDate).toLocaleDateString('en-GB') : "-" },
                  { label: "Expiry Date", value: viewSub.endDate ? new Date(viewSub.endDate).toLocaleDateString('en-GB') : "-" },
                  { 
                    label: "Status", 
                    value: (
                      <span className={`status ${viewSub.status === 'active' && new Date(viewSub.endDate) > new Date() ? 'active' : 'expired'}`} style={{ padding: '6px 14px' }}>
                        {viewSub.status === 'active' && new Date(viewSub.endDate) > new Date() ? 'Active' : viewSub.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                      </span>
                    )
                  },
                  { label: "Promo / Voucher", value: viewSub.voucherCode ? `🎟️ ${viewSub.voucherCode}` : viewSub.promoCode ? `🏷️ ${viewSub.promoCode}` : "-" }
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    background: item.highlight ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.1), transparent)' : 'rgba(255,255,255,0.02)', 
                    border: item.highlight ? '1px solid rgba(192, 132, 252, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                    padding: '20px', 
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.highlight ? '#c084fc' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.label}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text)', wordBreak: 'break-all' }}>
                      {item.value}
                    </span>
                  </div>
                ))}

                {(viewSub.subscriptionId || viewSub.paymentId) && (
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0', padding: '16px 0 0 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Payment Gateway Details</h4>
                    
                    {viewSub.subscriptionId && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Razorpay Order ID</span>
                        <span style={{ fontWeight: 500, fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--text-soft)', wordBreak: 'break-all' }}>{viewSub.subscriptionId}</span>
                      </div>
                    )}
                    
                    {viewSub.paymentId && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Razorpay Payment ID</span>
                        <span style={{ fontWeight: 500, fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--text-soft)', wordBreak: 'break-all' }}>{viewSub.paymentId}</span>
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== PAGINATION COMPONENT =====================
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  return (
    <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24, padding: "12px 0" }}>
      <button
        className="btn btn-ghost"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <ChevronLeft size={16} /> Previous
      </button>
      <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
        Page <strong style={{ color: "var(--text)" }}>{currentPage}</strong> of <strong style={{ color: "var(--text)" }}>{Math.max(1, totalPages)}</strong> ({totalItems} total)
      </span>
      <button
        className="btn btn-ghost"
        disabled={currentPage >= totalPages || totalPages === 0}
        onClick={() => onPageChange(Math.min(Math.max(1, totalPages), currentPage + 1))}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}