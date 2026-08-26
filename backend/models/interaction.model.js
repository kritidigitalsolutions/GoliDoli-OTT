const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
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
        "user",
        "microdrama",
        "microdramaEpisode",
        "episode",
        "aiReel",
      ],
      required: true,
    },

    type: {
      type: String,
      enum: [
        "like",
        "dislike",
        "follow",
        "bookmark",
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate interaction
interactionSchema.index(
  {
    user: 1,
    contentId: 1,
    contentType: 1,
    type: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.models.Interaction ||
  mongoose.model(
    "Interaction",
    interactionSchema
  );
