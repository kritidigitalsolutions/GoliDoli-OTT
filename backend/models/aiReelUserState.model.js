const mongoose = require("mongoose");

const aiReelUserStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // false = do not replay after all available reels are consumed.
    // true = replay old reels until new reels are published; new reels are
    // still prioritized automatically by the feed query.
    replayEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIReelUserState", aiReelUserStateSchema);
