import { useEffect, useState } from "react";
import API from "../../../api/axios";
import {
  Star,
  Globe,
  Calendar,
  Clock,
  Tag,
  Layers,
  Rocket,
  Lock,
  ArrowUpCircle,
  Flame,
} from "lucide-react";

export default function BasicInfoSection({
  form,
  ch,
  setForm,
}) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get("/admin/categories");
        if (res.data.success) {
          // Show active categories only
          const list = (res.data.categories || []).filter(c => c.isActive !== false);
          setCategories(list);
        }
      } catch (err) {
        console.error("Error fetching categories for dropdown:", err);
      }
    };
    fetchCategories();
  }, []);
  return (
    <div className="premium-card">
      <h3 className="section-title">
        <span>
          <Star size={18} />
        </span>

        Basic Information
      </h3>

      <div
        className="form-2col"
        style={{ marginBottom: 20 }}
      >
        <div className="form-row form-full">
          <label className="form-label">
            Content Title *
          </label>

          <input
            className="form-input-styled"
            name="title"
            placeholder="e.g. Inception"
            onChange={ch}
            value={form.title}
            required
          />
        </div>

        <div className="form-row form-full">
          <label className="form-label">
            Synopsis / Description *
          </label>

          <textarea
            className="form-input-styled"
            name="description"
            placeholder="A brief summary of the plot..."
            rows={3}
            onChange={ch}
            value={form.description}
            required
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label className="form-label">
            <Globe
              size={14}
              style={{ marginRight: 4 }}
            />

            Language
          </label>

          <input
            className="form-input-styled"
            name="language"
            placeholder="English, Hindi, etc."
            onChange={ch}
            value={form.language}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Calendar
              size={14}
              style={{ marginRight: 4 }}
            />

            Release Year
          </label>

          <input
            className="form-input-styled"
            name="releaseYear"
            type="number"
            placeholder="2024"
            onChange={ch}
            value={form.releaseYear}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Clock
              size={14}
              style={{ marginRight: 4 }}
            />

            {form.type === "movie"
              ? "Duration"
              : "Avg. Ep Duration"}
          </label>

          <input
            className="form-input-styled"
            name="duration"
            placeholder="e.g. 2h 15m"
            onChange={ch}
            value={form.duration}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Tag
              size={14}
              style={{ marginRight: 4 }}
            />

            Genres
          </label>

          <input
            className="form-input-styled"
            name="genre"
            placeholder="Action, Sci-Fi, Drama"
            onChange={ch}
            value={form.genre}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Star
              size={14}
              style={{ marginRight: 4 }}
            />

            IMDb Rating (0 - 10)
          </label>

          <input
            className="form-input-styled"
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="8.5"
            onChange={ch}
            value={form.rating}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <ArrowUpCircle
              size={14}
              style={{ marginRight: 4 }}
            />

            Priority (0 = Auto-assign)
          </label>

          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0 = Automatic (bottom), manually enter 1, 2, 3... to rank"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      {/* Category Multi-Selection Row */}
      <div className="form-row form-full" style={{ marginTop: 20, marginBottom: 20 }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Layers size={14} /> Selected Categories (Select Multiple)
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {categories.map((c) => {
            const val = c.name.toLowerCase();
            const isSelected = Array.isArray(form.category)
              ? form.category.includes(val)
              : form.category === val;

            return (
              <button
                key={c._id}
                type="button"
                className={`badge ${isSelected ? "badge-active" : "badge-draft"}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: isSelected ? "var(--neon-pink)" : "var(--border)",
                  backgroundColor: isSelected ? "var(--neon-pink-dim)" : "rgba(255, 255, 255, 0.05)",
                  color: isSelected ? "var(--neon-pink)" : "var(--text-soft)",
                  transition: "all 0.2s ease"
                }}
                onClick={() => {
                  let currentCats = Array.isArray(form.category) ? [...form.category] : (form.category ? [form.category] : []);
                  if (currentCats.includes(val)) {
                    currentCats = currentCats.filter(item => item !== val);
                  } else {
                    currentCats.push(val);
                  }
                  setForm(f => ({ ...f, category: currentCats }));
                }}
              >
                {c.name}
              </button>
            );
          })}
          {categories.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No categories found. Configure them in the Categories page.
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 24,
        }}
      >
        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
          }}
        >
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
          />

          <span>
            <Rocket
              size={16}
              style={{ marginRight: 8 }}
            />

            Coming Soon
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            background: "rgba(229, 9, 20, 0.1)",
            borderColor: "rgba(229, 9, 20, 0.2)",
          }}
        >
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
          />

          <span style={{ color: "var(--primary)" }}>
            <Lock size={16} style={{ marginRight: 8 }} />
            Premium Content
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            background: "rgba(255, 140, 0, 0.1)",
            borderColor: "rgba(255, 140, 0, 0.2)",
          }}
        >
          <input
            type="checkbox"
            name="isPopular"
            onChange={ch}
            checked={form.isPopular || false}
          />

          <span style={{ color: "#ff8c00" }}>
            <Flame size={16} style={{ marginRight: 8 }} />
            Popular Content
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            background: "rgba(10, 186, 115, 0.1)",
            borderColor: "rgba(10, 186, 115, 0.2)",
          }}
        >
          <input
            type="checkbox"
            name="isPublished"
            onChange={ch}
            checked={form.isPublished !== false}
          />

          <span style={{ color: "#0aba73" }}>
            <ArrowUpCircle size={16} style={{ marginRight: 8 }} />
            Publish Content
          </span>
        </label>
      </div>

      {form.isComingSoon && (
        <div
          className="form-row"
          style={{
            marginTop: 20,
            animation: "pageIn 0.3s ease",
          }}
        >
          <label className="form-label">
            Scheduled Release Date & Time
          </label>

          <input
            className="form-input-styled"
            type="datetime-local"
            name="releaseDate"
            onChange={ch}
            value={form.releaseDate}
            required
          />
        </div>
      )}
    </div>
  );
}