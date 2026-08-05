import { useEffect, useState } from "react";
import API from "../api/axios";
import { Search, Trash2, Star, Loader } from "lucide-react";
import "./Dashboard.css";

export default function RatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch when debouncedSearch changes
  useEffect(() => {
    if (debouncedSearch.trim() === "") {
      fetchRatings();
    } else {
      searchRatings(debouncedSearch);
    }
  }, [debouncedSearch]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/rating/all");
      setRatings(res.data.ratings || []);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchRatings = async (query) => {
    setLoading(true);
    try {
      const res = await API.get(`/rating/search?q=${encodeURIComponent(query)}`);
      setRatings(res.data.results || []);
    } catch (err) {
      console.error("Error searching ratings:", err);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rating permanently?")) return;
    try {
      const res = await API.delete(`/rating/${id}`);
      if (res.data.success) {
        setRatings(ratings.filter((r) => r._id !== id));
      }
    } catch (err) {
      console.error("Error deleting rating:", err);
      alert("Failed to delete rating");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= rating ? "#FFD11A" : "none"}
          color={i <= rating ? "#FFD11A" : "var(--text-muted)"}
          style={{ marginRight: 2 }}
        />
      );
    }
    return <div style={{ display: "flex", alignItems: "center" }}>{stars}</div>;
  };

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">⭐ User Ratings</h1>
        <p className="pg-sub">All user feedback and reviews</p>
      </div>

      <div className="content-box">
        {/* Search row */}
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input
              placeholder="Search by review text, user name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>
              <Loader size={20} style={{ display: "inline-block", marginRight: 8 }} />
              Loading ratings...
            </p>
          </div>
        ) : ratings.length === 0 ? (
          <div className="empty-state">
            <p>No ratings found 😕</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {ratings.map((r) => (
                  <tr key={r._id}>
                    <td className="u-name">{r.user?.name || "N/A"}</td>
                    <td style={{ color: "var(--text-soft)" }}>{r.user?.email || "N/A"}</td>
                    <td>{renderStars(r.rating)}</td>
                    <td style={{ maxWidth: "300px", whiteSpace: "normal", wordBreak: "break-word" }}>
                      {r.review || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No comment</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(r._id)}
                          title="Delete Rating"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}