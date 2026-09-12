const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: [
        "movie",
        "series",
        "microdrama",
        "microdramaEpisode",
        "episode",
        "aiReel",
        "audioStory",
        "audioEpisode",
      ],
      default: "movie",
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);
