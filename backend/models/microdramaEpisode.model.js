const mongoose = require("mongoose");

const microdramaEpisodeSchema = new mongoose.Schema(
  {
    microdramaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Microdrama",
      required: true,
    },
    episodeNumber: {
      type: Number,
      required: true,
    },
    title: String,
    description: String,
    videoUrl: String,
    thumbnail: String,
    duration: String,
    isLocked: {
      type: Boolean,
      default: false,
    },
    isVertical: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

microdramaEpisodeSchema.index(
  {
    microdramaId: 1,
    episodeNumber: 1
  },
  {
    unique: true,
    name: "unique_episode_per_microdrama"
  }
);

module.exports = mongoose.model("MicrodramaEpisode", microdramaEpisodeSchema);
