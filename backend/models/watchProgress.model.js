const mongoose = require("mongoose");

const watchProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["movie", "series", "microdrama"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "contentModel",
      index: true,
    },
    contentModel: {
      type: String,
      enum: ["Movie", "Series", "Microdrama"],
      required: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "episodeModel",
      index: true,
      default: null,
    },
    episodeModel: {
      type: String,
      enum: ["Episode", "MicrodramaEpisode"],
      default: null,
    },
    progressSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate entries per user, content, and episode
watchProgressSchema.index(
  { user: 1, contentId: 1, episodeId: 1 },
  { unique: true, name: "unique_user_content_episode_progress" }
);

// Optimized index for Continue Watching list queries
watchProgressSchema.index({ user: 1, completed: 1, lastWatchedAt: -1 });

module.exports =
  mongoose.models.WatchProgress ||
  mongoose.model("WatchProgress", watchProgressSchema);
