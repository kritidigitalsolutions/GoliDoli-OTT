const mongoose = require("mongoose");

const aiReelWatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    aiReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "aiReel",
      required: true,
      index: true,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
    watchDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One consumption record per user + reel. Re-watching updates this record
// instead of creating duplicate history rows.
aiReelWatchSchema.index({ user: 1, aiReel: 1 }, { unique: true });
aiReelWatchSchema.index({ user: 1, watchedAt: -1 });

module.exports = mongoose.model("AIReelWatch", aiReelWatchSchema);