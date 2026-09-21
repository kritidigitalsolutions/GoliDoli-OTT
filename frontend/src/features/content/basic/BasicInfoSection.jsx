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
  CheckCircle2,
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
          const list = (res.data.categories || []).filter(c => c.isActive !== false);
          setCategories(list);
        }
      } catch (err) {
        console.error("Error fetching categories for dropdown:", err);
      }
    };
    fetchCategories();
  }, []);

  const selectedCatCount = Array.isArray(form.category)
    ? form.category.length
    : form.category
    ? 1
    : 0;

  return (
    <div className="form-card">
      <div className="card-header-styled">
        <h3 className="section-title">
          <span className="title-icon-wrap">
            <Star size={18} />
          </span>
          <div>
            Basic Content Information
            <small>Set main titles, genre categorization, ratings, and publish status</small>
          </div>
        </h3>
      </div>

      <div className="form-2col" style={{ marginBottom: 20 }}>
        <div className="form-row form-full">
          <label className="form-label">
            Content Title <span className="req-star">*</span>
          </label>

          <input
            className="form-input-styled"
            name="title"
            placeholder="e.g. Inception / Stranger Things"
            onChange={ch}
            value={form.title}
            required
          />
        </div>

        <div className="form-row form-full">
          <label className="form-label">
            Synopsis / Story Line <span className="req-star">*</span>
          </label>

          <textarea
            className="form-input-styled"
            name="description"
            placeholder="A compelling summary of the plot, characters, and storyline..."
            rows={3}
            onChange={ch}
            value={form.description}
            required
            style={{ resize: "vertical", minHeight: "85px" }}
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label className="form-label">
            <Globe size={14} style={{ marginRight: 6 }} />
            Audio Language
          </label>

          <input
            className="form-input-styled"
            name="language"
            placeholder="e.g. English, Hindi, Tamil"
            onChange={ch}
            value={form.language}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Calendar size={14} style={{ marginRight: 6 }} />
            Release Year
          </label>

          <input
            className="form-input-styled"
            name="releaseYear"
            type="number"
            placeholder="2026"
            onChange={ch}
            value={form.releaseYear}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Clock size={14} style={{ marginRight: 6 }} />
            {form.type === "movie" ? "Runtime Duration" : "Avg. Episode Duration"}
          </label>

          <input
            className="form-input-styled"
            name="duration"
            placeholder={form.type === "movie" ? "e.g. 2h 15m" : "e.g. 45m"}
            onChange={ch}
            value={form.duration}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Tag size={14} style={{ marginRight: 6 }} />
            Genres (Comma separated)
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
            <Star size={14} style={{ marginRight: 6 }} />
            IMDb Score (0 - 10)
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
            <ArrowUpCircle size={14} style={{ marginRight: 6 }} />
            Curated Priority Rank
          </label>

          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0 = Default (Auto-assigned)"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      {/* Category Multi-Selection Section */}
      <div className="category-selection-section" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="category-header-row">
          <label className="form-label" style={{ margin: 0 }}>
            <Layers size={14} style={{ marginRight: 6 }} />
            Target Categories
          </label>
          <span className="cat-count-badge">
            {selectedCatCount} selected
          </span>
        </div>

        <div className="category-chips-grid">
          {categories.map((c) => {
            const val = c.name.toLowerCase();
            const isSelected = Array.isArray(form.category)
              ? form.category.includes(val)
              : form.category === val;

            return (
              <button
                key={c._id}
                type="button"
                className={`category-chip-btn ${isSelected ? "active" : ""}`}
                onClick={() => {
                  let currentCats = Array.isArray(form.category)
                    ? [...form.category]
                    : form.category
                    ? [form.category]
                    : [];
                  if (currentCats.includes(val)) {
                    currentCats = currentCats.filter((item) => item !== val);
                  } else {
                    currentCats.push(val);
                  }
                  setForm((f) => ({ ...f, category: currentCats }));
                }}
              >
                {isSelected && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
                {c.name}
              </button>
            );
          })}
          {categories.length === 0 && (
            <p className="no-cat-text">
              No categories found. Configure categories in the Admin Categories page.
            </p>
          )}
        </div>
      </div>

      {/* Feature Flag Cards */}
      <div className="flags-toggle-grid">
        <label className={`flag-card ${form.isComingSoon ? "active-coming" : ""}`}>
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
          />
          <div className="flag-content">
            <Rocket size={18} className="flag-icon" />
            <div>
              <span className="flag-title">Coming Soon</span>
              <small className="flag-desc">Mark as upcoming release</small>
            </div>
          </div>
        </label>

        <label className={`flag-card ${form.isPremium ? "active-premium" : ""}`}>
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
          />
          <div className="flag-content">
            <Lock size={18} className="flag-icon" />
            <div>
              <span className="flag-title">Premium Access</span>
              <small className="flag-desc">Requires paid subscription</small>
            </div>
          </div>
        </label>

        <label className={`flag-card ${form.isPopular ? "active-popular" : ""}`}>
          <input
            type="checkbox"
            name="isPopular"
            onChange={ch}
            checked={form.isPopular || false}
          />
          <div className="flag-content">
            <Flame size={18} className="flag-icon" />
            <div>
              <span className="flag-title">Popular / Trending</span>
              <small className="flag-desc">Promote in popular rows</small>
            </div>
          </div>
        </label>

        <label className={`flag-card ${form.isPublished !== false ? "active-published" : ""}`}>
          <input
            type="checkbox"
            name="isPublished"
            onChange={ch}
            checked={form.isPublished !== false}
          />
          <div className="flag-content">
            <ArrowUpCircle size={18} className="flag-icon" />
            <div>
              <span className="flag-title">Live Published</span>
              <small className="flag-desc">Visible on public apps</small>
            </div>
          </div>
        </label>
      </div>

      {form.isComingSoon && (
        <div className="form-row release-date-block" style={{ marginTop: 20 }}>
          <label className="form-label">
            Scheduled Release Date & Time <span className="req-star">*</span>
          </label>

          <input
            className="form-input-styled coming-date-input"
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