const mongoose = require("mongoose");

const homeBannerSchema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      refPath: "contentType",
    },

    contentType: {
      type: String,
      enum: ["Movie", "Series", "Microdrama"],
      default: "Movie",
    },

    order: {
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

module.exports = mongoose.model("HomeBanner", homeBannerSchema);