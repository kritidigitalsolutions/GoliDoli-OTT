const mongoose = require("mongoose");

const aiReelFeedSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    servedReels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "aiReel",
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000),
      index: true,
    },
  },
  { timestamps: true }
);

aiReelFeedSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AIReelFeedSession", aiReelFeedSessionSchema);
