const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: "User",
    },

    profileImage: {
      type: String,
      default: "",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    interests: {
      type: [String],
      default: [],
    },

    preferences: {
      // Selected genre tags, e.g. ["Romance", "Drama", "Action"]
      genres: {
        type: [String],
        default: [],
      },
      // Selected content types: "movie" | "series" | "microdrama"
      contentTypes: {
        type: [String],
        enum: ["movie", "series", "microdrama"],
        default: [],
      },
    },

    authProvider: {
      type: String,
      enum: ["PHONE", "GOOGLE", "FACEBOOK"],
      default: "PHONE",
    },

    profileComplete: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["USER"],
      default: "USER",
    },

    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },

    fcmToken: {
      type: String,
      default: "",
    },

    fcmTokenUpdatedAt: {
      type: Date,
    },

    notificationSettings: {
      newEpisodes:        { type: Boolean, default: true  },
      newMovies:          { type: Boolean, default: true  },
      recommendations:    { type: Boolean, default: true  },
      downloads:          { type: Boolean, default: true  },
      continueWatching:   { type: Boolean, default: true },
      subscriptionAlerts: { type: Boolean, default: true  },
      promotionalOffers:  { type: Boolean, default: true  },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);