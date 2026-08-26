const mongoose = require("mongoose");

const aiReelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    // Kept for backward compatibility. If likes are handled by the
    // Interaction module, do not increment this field from the AI Reel API.
    like: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

aiReelSchema.index({ createdAt: -1 });
aiReelSchema.index({ isPublished: 1, publishedAt: -1 });
aiReelSchema.index({ isPublished: 1, views: -1, like: -1, createdAt: -1 });

module.exports = mongoose.model("aiReel", aiReelSchema);