const mongoose = require("mongoose");

const audioEpisodeSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioStory",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    episodeNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    duration: {
      type: Number, // duration in seconds
      required: true,
      default: 0,
    },
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug before save
audioEpisodeSchema.pre("save", function () {
  if (this.isModified("title") || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
});

// Avoid duplicate episode numbers inside the same audio story
audioEpisodeSchema.index(
  { storyId: 1, episodeNumber: 1 },
  { unique: true, name: "unique_episode_per_story" }
);

audioEpisodeSchema.index({ storyId: 1, isPublished: 1, episodeNumber: 1 });

module.exports =
  mongoose.models.AudioEpisode ||
  mongoose.model("AudioEpisode", audioEpisodeSchema);
