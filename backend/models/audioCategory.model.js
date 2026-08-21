const mongoose = require("mongoose");

const audioCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug from name before save
audioCategorySchema.pre("save", function () {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
});

audioCategorySchema.index({ priority: -1, createdAt: -1 });

module.exports =
  mongoose.models.AudioCategory ||
  mongoose.model("AudioCategory", audioCategorySchema);
