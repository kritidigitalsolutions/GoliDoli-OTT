const mongoose = require("mongoose");
const MicrodramaEpisode = require("./microdramaEpisode.model");

const castSchema =
  new mongoose.Schema({
    name: String,
    image: String,
  });

const microdramaSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
      },

      slug: {
        type: String,
        unique: true,
        index: true,
      },

      description: String,

      releaseYear: Number,

      releaseDate: String,

      duration: String,

      rating: {
        type: Number,
        default: 0,
      },

      genre: [String],

      language: String,

      poster: String,

      banner: String,

      trailerUrl: String,

      isComingSoon: {
        type: Boolean,
        default: false,
      },

      totalEpisodes: {
        type: Number,
        default: 0,
      },

      totalViews: {
        type: Number,
        default: 0,
      },

      isPremium: {
        type: Boolean,
        default: false,
      },

      priority: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "ongoing",
          "completed",
        ],
        default: "ongoing",
      },

      cast: [castSchema],

      category: [String],
      isPublished: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true,
    }
  );


// Auto slug
microdramaSchema.pre(
  "save",
  function () {
    if (this.title) {
      this.slug =
        this.title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "") +
        "-" +
        Date.now();
    }
  }
);

microdramaSchema.pre(
  "findOneAndDelete",
  async function () {
    const show = await this.model.findOne(this.getFilter()).select("_id");

    if (show) {
      await MicrodramaEpisode.deleteMany({
        tvShowId: show._id,
      });
    }
  }
);

microdramaSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await MicrodramaEpisode.deleteMany({
      tvShowId: this._id,
    });
  }
);

microdramaSchema.index({ createdAt: -1 });

microdramaSchema.index({
  title: "text",
  description: "text"
});

// Keep the historical model and collection names so existing data remains available.
module.exports = mongoose.model(
  "TvShow",
  microdramaSchema
);
