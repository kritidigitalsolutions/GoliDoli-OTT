const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    
    priority: {
      type: Number,
      default: 0
    },

    // Admin-curated content for this category row (saved independently of webpage module)
    curatedContent: [
      {
        contentType: {
          type: String,
          enum: ["Movie", "Series"],
          required: true
        },
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        position: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  { timestamps: true }
);

// Generate the slug only when a category is created. Content records use the
// slug as their category reference, so changing it on a rename would detach
// existing movies and series from this category.
categorySchema.pre("save", async function () {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

categorySchema.index({ isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
