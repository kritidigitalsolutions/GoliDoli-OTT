const User = require("../models/user.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");
const Microdrama = require("../models/microdrama.model");
const MicrodramaEpisode = require("../models/microdramaEpisode.model");

// Valid content types accepted by this API
const VALID_CONTENT_TYPES = ["movie", "series", "microdrama"];

// ========================================
// GET PREFERENCES
// GET /api/preferences
// ========================================
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("preferences")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      preferences: user.preferences || { genres: [], contentTypes: [] },
    });
  } catch (error) {
    console.error("getPreferences Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// UPDATE PREFERENCES
// PUT /api/preferences
// Body: { genres?: string[], contentTypes?: string[] }
// Both fields are optional — omitting one leaves it unchanged.
// Pass an empty array [] to clear a field.
// ========================================
exports.updatePreferences = async (req, res) => {
  try {
    const { genres, contentTypes } = req.body;

    // Validate contentTypes values if provided
    if (contentTypes !== undefined) {
      if (!Array.isArray(contentTypes)) {
        return res.status(400).json({
          success: false,
          message: "contentTypes must be an array",
        });
      }
      const invalid = contentTypes.filter(
        (t) => !VALID_CONTENT_TYPES.includes(t)
      );
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid contentTypes: ${invalid.join(", ")}. Allowed: ${VALID_CONTENT_TYPES.join(", ")}`,
        });
      }
    }

    if (genres !== undefined && !Array.isArray(genres)) {
      return res.status(400).json({
        success: false,
        message: "genres must be an array of strings",
      });
    }

    // Build the $set payload — only update provided fields
    const setPayload = {};
    if (genres !== undefined) {
      // Trim and deduplicate
      setPayload["preferences.genres"] = [
        ...new Set(genres.map((g) => String(g).trim()).filter(Boolean)),
      ];
    }
    if (contentTypes !== undefined) {
      setPayload["preferences.contentTypes"] = [...new Set(contentTypes)];
    }

    if (Object.keys(setPayload).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one field to update: genres or contentTypes",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: setPayload },
      { returnDocument: "after", select: "preferences" }
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      preferences: user.preferences,
    });
  } catch (error) {
    console.error("updatePreferences Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET CONTENT FILTERED BY PREFERENCES
// GET /api/preferences/content
//
// The user's saved preferences are used automatically.
// Optional query overrides (for real-time client-side preview
// without saving):
//   ?genres=Romance,Drama
//   ?contentTypes=movie,series
//   ?page=1&limit=20
//
// Logic:
//   - If BOTH genres and contentTypes are set → content must
//     match the type AND have at least one matching genre.
//   - If ONLY genres → filter all content types by genre.
//   - If ONLY contentTypes → return all content of those types.
//   - If NEITHER → return generic recommended content (sorted by priority).
// ========================================
exports.getPreferredContent = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("preferences")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Merge saved prefs with optional query overrides
    const savedPrefs = user.preferences || { genres: [], contentTypes: [] };

    const genres =
      req.query.genres
        ? req.query.genres.split(",").map((g) => g.trim()).filter(Boolean)
        : savedPrefs.genres;

    const contentTypes =
      req.query.contentTypes
        ? req.query.contentTypes.split(",").map((t) => t.trim()).filter(Boolean)
        : savedPrefs.contentTypes;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const hasGenres = genres.length > 0;
    const hasTypes = contentTypes.length > 0;

    // Determine which content collections to query
    const wantsMovies =
      !hasTypes || contentTypes.includes("movie");
    const wantsSeries =
      !hasTypes || contentTypes.includes("series");
    const wantsMicrodramas =
      !hasTypes || contentTypes.includes("microdrama");

    // Build genre filter (case-insensitive regex OR)
    const genreFilter = hasGenres
      ? { genre: { $in: genres.map((g) => new RegExp(`^${g}$`, "i")) } }
      : {};

    const baseFilter = { isPublished: true, ...genreFilter };
    const sort = { priority: -1, createdAt: -1 };

    // Run all needed queries in parallel
    const [movies, series, microdramas] = await Promise.all([
      wantsMovies
        ? Movie.find(baseFilter).sort(sort).lean()
        : Promise.resolve([]),
      wantsSeries
        ? Series.find(baseFilter).sort(sort).lean()
        : Promise.resolve([]),
      wantsMicrodramas
        ? Microdrama.find(baseFilter).sort(sort).lean()
        : Promise.resolve([]),
    ]);

    // Fetch episodes for series and microdramas that matched
    const [episodesBySeries, episodesByMicrodrama] = await Promise.all([
      series.length > 0
        ? Episode.find({
            seriesId: { $in: series.map((s) => s._id) },
          })
            .sort({ seasonNumber: 1, episodeNumber: 1 })
            .lean()
            .then((eps) =>
              eps.reduce((map, ep) => {
                const key = ep.seriesId.toString();
                if (!map[key]) map[key] = [];
                map[key].push(ep);
                return map;
              }, {})
            )
        : Promise.resolve({}),
      microdramas.length > 0
        ? MicrodramaEpisode.find({
            microdramaId: { $in: microdramas.map((m) => m._id) },
          })
            .sort({ episodeNumber: 1 })
            .lean()
            .then((eps) =>
              eps.reduce((map, ep) => {
                const key = ep.microdramaId.toString();
                if (!map[key]) map[key] = [];
                map[key].push(ep);
                return map;
              }, {})
            )
        : Promise.resolve({}),
    ]);

    // Format results with type tags
    const formattedMovies = movies.map((m) => ({
      ...m,
      type: "movie",
      isTrending: m.category?.includes("trending") || false,
    }));

    const formattedSeries = series.map((s) => ({
      ...s,
      type: "series",
      isTrending: s.category?.includes("trending") || false,
      episodes: episodesBySeries[s._id.toString()] || [],
    }));

    const formattedMicrodramas = microdramas.map((m) => ({
      ...m,
      type: "microdrama",
      isTrending: m.category?.includes("trending") || false,
      episodes: episodesByMicrodrama[m._id.toString()] || [],
    }));

    // Merge and sort globally by priority then recency
    const allContent = [
      ...formattedMovies,
      ...formattedSeries,
      ...formattedMicrodramas,
    ].sort(
      (a, b) =>
        (b.priority || 0) - (a.priority || 0) ||
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = allContent.length;
    const paginated = allContent.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      appliedFilters: { genres, contentTypes },
      total,
      page,
      totalPages: Math.ceil(total / limit),
      content: paginated,
    });
  } catch (error) {
    console.error("getPreferredContent Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
