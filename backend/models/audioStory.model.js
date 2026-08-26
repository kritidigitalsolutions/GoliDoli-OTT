const mongoose = require("mongoose");

const audioStorySchema = new mongoose.Schema(
  {
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
    author: {
      type: String,
      trim: true,
      default: "",
    },
    narrator: {
      type: String,
      trim: true,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AudioCategory",
      },
    ],
    totalEpisodes: {
      type: Number,
      default: 0,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
      index: true,
    },
    priority: {
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
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug before save
audioStorySchema.pre("save", function () {
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

// Indexes
audioStorySchema.index({ priority: -1, createdAt: -1 });
audioStorySchema.index({ status: 1, isPublished: 1, isPremium: 1 });
audioStorySchema.index(
  {
    title: "text",
    description: "text",
    author: "text",
    narrator: "text",
  },
  {
    name: "audiostory_text_search",
  }
);

module.exports =
  mongoose.models.AudioStory ||
  mongoose.model("AudioStory", audioStorySchema);
