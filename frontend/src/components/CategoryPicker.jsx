import { useState, useEffect } from "react";
import { fetchActiveCategories } from "../features/services/category.service";
import "./CategoryPicker.css";

/**
 * Reusable multi-select category picker rendered as pill chips.
 *
 * Props:
 *  - selected: string[]   — array of selected category slugs
 *  - onChange: (slugs: string[]) => void
 */
export default function CategoryPicker({ selected = [], onChange }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchActiveCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(console.error);
  }, []);

  const toggle = (slug) => {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug];
    onChange(next);
  };

  return (
    <div className="category-chips-container">
      {categories.length === 0 ? (
        <div className="category-chips-empty">No active categories found</div>
      ) : (
        categories.map((cat) => {
          const isSel = selected.includes(cat.slug);
          return (
            <button
              key={cat._id}
              id={`cat-chip-${cat.slug}`}
              type="button"
              className={`category-chip-btn ${isSel ? "active" : ""}`}
              onClick={() => toggle(cat.slug)}
            >
              {cat.name}
            </button>
          );
        })
      )}
    </div>
  );
}
