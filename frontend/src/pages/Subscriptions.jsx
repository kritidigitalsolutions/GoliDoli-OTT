import { useEffect, useState } from "react";
import { Search, Eye, Trash2, Ban, X, ChevronLeft, ChevronRight } from "lucide-react";
import API from "../api/axios";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSub, setViewSub] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "expired"
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchSubs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchSubs = async () => {
    try {
      const res = await API.get("/admin/subscription/all");
      setSubs(res.data.subscriptions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await API.patch(`/admin/subscription/${id}/cancel`);
      alert("Subscription cancelled successfully.");
      fetchSubs();
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
      fetchSubs();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ margin: 0 }}>💳 Subscriptions</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          
          <div className="sub-filter-toggle" style={{ display: "flex", gap: 6, background: "var(--bg3)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
            <button
              className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
            >
              All
            </button>
            <button
              className={`btn ${statusFilter === "active" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
              onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
            >
              Active
            </button>
            <button
              className={`btn ${statusFilter === "expired" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
              onClick={() => { setStatusFilter("expired"); setCurrentPage(1); }}
            >
              Expired
            </button>
            <button
              className={`btn ${statusFilter === "cancelled" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", height: "auto" }}
              onClick={() => { setStatusFilter("cancelled"); setCurrentPage(1); }}
            >
              Cancelled
            </button>
          </div>

          <div style={{ position: "relative", width: "260px" }}>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "10px 16px 10px 40px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.05)",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none"
              }}
              placeholder="Search by name, email, phone, plan or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none"
              }}
            />
          </div>
        </div>
      </div>

      <table className="subscription-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Promo/Voucher</th>
            <th>Expiry</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedSubs.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                Not Found
              </td>
            </tr>
          ) : (
            paginatedSubs.map((sub) => {
              const isActive =
                sub.status === "active" &&
                new Date(sub.endDate) > new Date();

              return (
                <tr key={sub._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{sub.user?.name || "User"}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {sub.user?.email || sub.user?.phone || "-"}
                    </div>
                  </td>

                  <td className="plan">{sub.plan?.name || sub.plan || "-"}</td>

                  <td>
                    <span className={isActive ? "status active" : "status expired"}>
                      {sub.status === "active" ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired"}
                    </span>
                  </td>

                  <td>₹{sub.amount || 0}</td>

                  <td>
                    {sub.voucherCode ? (
                      <span className="badge badge-pub" style={{ background: '#4f46e5', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        🎟️ {sub.voucherCode}
                      </span>
                    ) : sub.promoCode ? (
                      <span className="badge badge-pub" style={{ background: '#ec4899', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        🏷️ {sub.promoCode}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>

                  <td>
                    {sub.endDate
                      ? new Date(sub.endDate).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="actions">
                    <button
                      className="icon-btn view"
                      onClick={() => setViewSub(sub)}
                      title="View Details"
                      style={{ cursor: "pointer", marginRight: "8px" }}
                    >
                      <Eye size={16} />
                    </button>

                    {isActive && (
                      <button
                        className="icon-btn edit"
                        onClick={() => handleCancel(sub._id)}
                        title="Cancel Subscription"
                        style={{ cursor: "pointer", marginRight: "8px", color: "var(--warning)" }}
                      >
                        <Ban size={16} />
                      </button>
                    )}

                    <button
                      className="icon-btn delete"
                      onClick={() => handleDelete(sub._id)}
                      title="Delete"
                      style={{ cursor: "pointer", color: "var(--danger)" }}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSubs.length}
        onPageChange={setCurrentPage}
      />

      {/* ================= VIEW MODAL ================= */}
      {viewSub && (
        <div className="modal-overlay" onClick={() => setViewSub(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>💳 Subscription Details</h3>
              <button className="modal-close" onClick={() => setViewSub(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              <div className="profile-details-grid" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subscriber</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.user?.name || "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subscriber Email</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.user?.email || "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subscriber Phone</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.user?.phone || "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan Name</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.plan?.name || viewSub.plan || "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Amount Paid</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{viewSub.amount || 0}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Date</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.startDate ? new Date(viewSub.startDate).toLocaleDateString() : "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Expiry Date</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewSub.endDate ? new Date(viewSub.endDate).toLocaleDateString() : "-"}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    <span className={`status ${viewSub.status === 'active' && new Date(viewSub.endDate) > new Date() ? 'active' : 'expired'}`}>
                      {viewSub.status === 'active' && new Date(viewSub.endDate) > new Date() ? 'Active' : viewSub.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                    </span>
                  </span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Promo/Voucher Used</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {viewSub.voucherCode ? `Voucher: ${viewSub.voucherCode}` : viewSub.promoCode ? `Promo: ${viewSub.promoCode}` : "None"}
                  </span>
                </div>
                {viewSub.subscriptionId && (
                  <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                    <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Razorpay Order ID</span>
                    <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem', wordBreak: 'break-all' }}>{viewSub.subscriptionId}</span>
                  </div>
                )}
                {viewSub.paymentId && (
                  <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                    <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Razorpay Payment ID</span>
                    <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem', wordBreak: 'break-all' }}>{viewSub.paymentId}</span>
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
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24, padding: "12px 0" }}>
      <button
        className="btn btn-ghost"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <ChevronLeft size={16} /> Previous
      </button>
      <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
        Page <strong style={{ color: "var(--primary)" }}>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
      </span>
      <button
        className="btn btn-ghost"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}