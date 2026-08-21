const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");
// The persisted collection predates the microdrama name; keep using it to retain existing data.
const Microdrama = require("../models/microdrama.model");
const MicrodramaEpisode = require("../models/microdramaEpisode.model");

const tokenMatchesType = (token, docType) => {
  const t = token.toLowerCase();
  if (t.length < 2) return false;

  if (docType === "movie") {
    return "movies".startsWith(t) || "movie".startsWith(t) || t === "movie" || t === "movies" || t === "mov";
  }

  if (docType === "series") {
    return "series".startsWith(t) || t === "series" || t === "ser";
  }

  if (docType === "microdrama") {
    return (
      "microdramas".startsWith(t) ||
      "microdrama".startsWith(t) ||
      "dramas".startsWith(t) ||
      "drama".startsWith(t) ||
      t === "mic" ||
      t === "micro" ||
      t === "drama" ||
      t === "dramas" ||
      t === "microdrama" ||
      t === "microdramas"
    );
  }

  return false;
};

const buildModelFilter = (docType, reqQuery) => {
  const searchParam = String(reqQuery.search || reqQuery.query || "").trim();
  const typeParam = String(reqQuery.type || "").trim().toLowerCase();
  const genreParam = String(reqQuery.genre || "").trim();
  const categoryParam = String(reqQuery.category || "").trim();
  const languageParam = String(reqQuery.language || "").trim();
  const releaseYearParam = reqQuery.releaseYear ? Number(reqQuery.releaseYear) : null;
  const isPremiumParam = reqQuery.isPremium !== undefined ? reqQuery.isPremium === "true" || reqQuery.isPremium === "1" : null;
  const isComingSoonParam = reqQuery.isComingSoon !== undefined ? reqQuery.isComingSoon === "true" || reqQuery.isComingSoon === "1" : null;
  const isPopularParam = reqQuery.isPopular !== undefined ? reqQuery.isPopular === "true" || reqQuery.isPopular === "1" : null;

  // 1. If explicit ?type=... is provided, check if this docType matches requested type
  if (typeParam) {
    let requestedType = null;
    if (typeParam === "movie" || typeParam === "movies" || typeParam === "mov") {
      requestedType = "movie";
    } else if (typeParam === "series" || typeParam === "ser") {
      requestedType = "series";
    } else if (typeParam === "microdrama" || typeParam === "microdramas" || typeParam === "drama" || typeParam === "dramas" || typeParam === "mic") {
      requestedType = "microdrama";
    }

    if (requestedType && requestedType !== docType) {
      return null; // Skip this model
    }
  }

  // 2. Base conditions
  const conditions = [{ isPublished: true }];

  // 3. Add explicit criteria filters
  if (genreParam) {
    const regex = new RegExp(genreParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    conditions.push({ genre: regex });
  }

  if (categoryParam) {
    const regex = new RegExp(categoryParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    conditions.push({ category: regex });
  }

  if (languageParam) {
    const regex = new RegExp(languageParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    conditions.push({ language: regex });
  }

  if (releaseYearParam && !isNaN(releaseYearParam)) {
    conditions.push({ releaseYear: releaseYearParam });
  }

  if (isPremiumParam !== null) {
    conditions.push({ isPremium: isPremiumParam });
  }

  if (isComingSoonParam !== null) {
    conditions.push({ isComingSoon: isComingSoonParam });
  }

  if (isPopularParam !== null) {
    conditions.push({ isPopular: isPopularParam });
  }

  // 4. Token-based flexible search across fields AND type
  if (searchParam) {
    const tokens = searchParam.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      // If token matches content-type for this model, it matches type
      if (tokenMatchesType(token, docType)) {
        continue; // Token satisfied by model type
      }

      // Otherwise, token must match at least one of: title, description, genre, category, language
      const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      conditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { genre: regex },
          { category: regex },
          { language: regex },
        ],
      });
    }
  }

  if (conditions.length === 1) {
    return conditions[0];
  }
  return { $and: conditions };
};

const getEpisodesByParent = async (Model, parentField, parents, sort, projection) => {
  const parentIds = parents.map((parent) => parent._id);
  const episodes = await Model.find({ [parentField]: { $in: parentIds } })
    .select(projection || "")
    .sort(sort)
    .lean();

  return episodes.reduce((map, episode) => {
    const parentId = episode[parentField].toString();
    if (!map[parentId]) map[parentId] = [];
    map[parentId].push(episode);
    return map;
  }, {});
};

const formatMicrodramas = (microdramas, episodesByMicrodrama) =>
  microdramas.map((microdrama) => ({
    ...microdrama,
    type: "microdrama",
    isTrending: microdrama.category?.includes("trending") || false,
    episodes: episodesByMicrodrama[microdrama._id.toString()] || [],
  }));

// This endpoint is intentionally separate from the playback APIs. It exposes
// catalogue metadata for public landing pages without exposing media URLs.
const getLandingContent = async (req, res) => {
  try {
    const contentProjection = "-videoUrl -trailerUrl -__v";
    const episodeProjection = "-videoUrl -__v";

    const [movies, series, microdramas] = await Promise.all([
      Movie.find({ isPublished: true })
        .select(contentProjection)
        .sort({ priority: -1, createdAt: -1 })
        .lean(),
      Series.find({ isPublished: true })
        .select(contentProjection)
        .sort({ priority: -1, createdAt: -1 })
        .lean(),
      Microdrama.find({ isPublished: true })
        .select(contentProjection)
        .sort({ priority: -1, createdAt: -1 })
        .lean(),
    ]);

    const [episodesBySeries, episodesByMicrodrama] = await Promise.all([
      getEpisodesByParent(Episode, "seriesId", series, { seasonNumber: 1, episodeNumber: 1 }, episodeProjection),
      getEpisodesByParent(MicrodramaEpisode, "tvShowId", microdramas, { episodeNumber: 1 }, episodeProjection),
    ]);

    const content = [
      ...movies.map((movie) => ({
        ...movie,
        type: "movie",
        isTrending: movie.category?.includes("trending") || false,
      })),
      ...series.map((item) => ({
        ...item,
        type: "series",
        isTrending: item.category?.includes("trending") || false,
        episodes: episodesBySeries[item._id.toString()] || [],
      })),
      ...formatMicrodramas(microdramas, episodesByMicrodrama),
    ].sort((a, b) =>
      (b.priority || 0) - (a.priority || 0) || new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      success: true,
      counts: {
        movies: movies.length,
        series: series.length,
        microdramas: microdramas.length,
        content: content.length,
      },
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landing content",
    });
  }
};

const getHomeContent = async (req, res) => {
  try {
    const movieFilter = buildModelFilter("movie", req.query);
    const seriesFilter = buildModelFilter("series", req.query);
    const microdramaFilter = buildModelFilter("microdrama", req.query);

    const hasSearch = Boolean(
      req.query.search ||
        req.query.query ||
        req.query.type ||
        req.query.genre ||
        req.query.category ||
        req.query.language ||
        req.query.releaseYear ||
        req.query.isPremium !== undefined ||
        req.query.isComingSoon !== undefined ||
        req.query.isPopular !== undefined
    );

    const moviesQuery = movieFilter ? Movie.find(movieFilter).sort({ priority: -1, createdAt: -1 }) : null;
    const seriesQuery = seriesFilter ? Series.find(seriesFilter).sort({ priority: -1, createdAt: -1 }) : null;
    const microdramasQuery = microdramaFilter ? Microdrama.find(microdramaFilter).sort({ priority: -1, createdAt: -1 }) : null;

    if (!hasSearch) {
      if (moviesQuery) moviesQuery.limit(20);
      if (seriesQuery) seriesQuery.limit(20);
      if (microdramasQuery) microdramasQuery.limit(20);
    }

    const [movies, series, microdramas] = await Promise.all([
      moviesQuery ? moviesQuery.lean() : Promise.resolve([]),
      seriesQuery ? seriesQuery.lean() : Promise.resolve([]),
      microdramasQuery ? microdramasQuery.lean() : Promise.resolve([]),
    ]);

    const [moviesCount, seriesCount, microdramasCount, seriesData, microdramaData, episodesBySeries, episodesByMicrodrama] = await Promise.all([
      movieFilter ? Movie.countDocuments(movieFilter) : Promise.resolve(0),
      seriesFilter ? Series.countDocuments(seriesFilter) : Promise.resolve(0),
      microdramaFilter ? Microdrama.countDocuments(microdramaFilter) : Promise.resolve(0),
      seriesFilter ? Series.find(seriesFilter, "totalEpisodes").lean() : Promise.resolve([]),
      microdramaFilter ? Microdrama.find(microdramaFilter, "totalEpisodes").lean() : Promise.resolve([]),
      seriesFilter && series.length > 0 ? getEpisodesByParent(Episode, "seriesId", series, { seasonNumber: 1, episodeNumber: 1 }) : Promise.resolve({}),
      microdramaFilter && microdramas.length > 0 ? getEpisodesByParent(MicrodramaEpisode, "tvShowId", microdramas, { episodeNumber: 1 }) : Promise.resolve({}),
    ]);

    const formattedMovies = movies.map((movie) => ({
      ...movie,
      type: "movie",
      isTrending: movie.category?.includes("trending") || false,
    }));
    const formattedSeries = series.map((item) => ({
      ...item,
      type: "series",
      isTrending: item.category?.includes("trending") || false,
      episodes: episodesBySeries[item._id.toString()] || [],
    }));
    const content = [...formattedMovies, ...formattedSeries, ...formatMicrodramas(microdramas, episodesByMicrodrama)]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      moviesCount,
      seriesCount,
      microdramasCount,
      seriesEpisodesCount: seriesData.reduce((total, item) => total + (item.totalEpisodes || 0), 0),
      microdramasEpisodesCount: microdramaData.reduce((total, item) => total + (item.totalEpisodes || 0), 0),
      content,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const searchContent = async (req, res) => {
  try {
    const movieFilter = buildModelFilter("movie", req.query);
    const seriesFilter = buildModelFilter("series", req.query);
    const microdramaFilter = buildModelFilter("microdrama", req.query);

    const hasSearch = Boolean(
      req.query.search ||
        req.query.query ||
        req.query.type ||
        req.query.genre ||
        req.query.category ||
        req.query.language ||
        req.query.releaseYear ||
        req.query.isPremium !== undefined ||
        req.query.isComingSoon !== undefined ||
        req.query.isPopular !== undefined
    );

    if (!hasSearch) {
      return res.status(400).json({ success: false, message: "Search criteria is required" });
    }

    const [movies, series, microdramas] = await Promise.all([
      movieFilter ? Movie.find(movieFilter).lean() : Promise.resolve([]),
      seriesFilter ? Series.find(seriesFilter).lean() : Promise.resolve([]),
      microdramaFilter ? Microdrama.find(microdramaFilter).lean() : Promise.resolve([]),
    ]);

    const [episodesBySeries, episodesByMicrodrama] = await Promise.all([
      seriesFilter && series.length > 0 ? getEpisodesByParent(Episode, "seriesId", series, { seasonNumber: 1, episodeNumber: 1 }) : Promise.resolve({}),
      microdramaFilter && microdramas.length > 0 ? getEpisodesByParent(MicrodramaEpisode, "tvShowId", microdramas, { episodeNumber: 1 }) : Promise.resolve({}),
    ]);

    const results = [
      ...movies.map((movie) => ({ ...movie, type: "movie" })),
      ...series.map((item) => ({ ...item, type: "series", episodes: episodesBySeries[item._id.toString()] || [] })),
      ...formatMicrodramas(microdramas, episodesByMicrodrama),
    ].sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getContentById = async (req, res) => {
  try {
    const { contentId } = req.params;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: "Invalid content ID format" });
    }

    const movie = await Movie.findOne({ _id: contentId, isPublished: true }).lean();
    if (movie) return res.json({ success: true, content: { ...movie, type: "movie" } });

    const series = await Series.findOne({ _id: contentId, isPublished: true }).lean();
    if (series) {
      const episodes = await Episode.find({ seriesId: contentId }).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();
      return res.json({ success: true, content: { ...series, type: "series", episodes } });
    }

    const microdrama = await Microdrama.findOne({ _id: contentId, isPublished: true }).lean();
    if (microdrama) {
      const episodes = await MicrodramaEpisode.find({ tvShowId: contentId }).sort({ episodeNumber: 1 }).lean();
      return res.json({ success: true, content: { ...microdrama, type: "microdrama", episodes } });
    }

    const episode = await Episode.findById(contentId).lean();
    if (episode) return res.json({ success: true, content: { ...episode, type: "episode" } });

    const microdramaEpisode = await MicrodramaEpisode.findById(contentId).lean();
    if (microdramaEpisode) {
      return res.json({ success: true, content: { ...microdramaEpisode, type: "microdramaEpisode" } });
    }

    return res.status(404).json({ success: false, message: "Content not found" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLandingContent, getHomeContent, searchContent, getContentById };
