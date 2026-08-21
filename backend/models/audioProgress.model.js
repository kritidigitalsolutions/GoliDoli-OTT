const mongoose = require("mongoose");

const audioProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioStory",
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioEpisode",
      required: true,
      index: true,
    },
    progressSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastPlayedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique progress record per user per episode
audioProgressSchema.index(
  { userId: 1, episodeId: 1 },
  { unique: true, name: "unique_progress_per_user_episode" }
);

// Optimized index for Continue Listening queries grouped by story
audioProgressSchema.index({ userId: 1, storyId: 1, lastPlayedAt: -1 });

// Index for completed stats aggregation
audioProgressSchema.index({ userId: 1, completed: 1 });

module.exports =
  mongoose.models.AudioProgress ||
  mongoose.model("AudioProgress", audioProgressSchema);
