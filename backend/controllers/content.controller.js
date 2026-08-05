const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");
// The persisted collection predates the microdrama name; keep using it to retain existing data.
const Microdrama = require("../models/microdrama.model");
const MicrodramaEpisode = require("../models/microdramaEpisode.model");

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
    const [movies, series, microdramas] = await Promise.all([
      Movie.find({ isPublished: true }).sort({ priority: -1, createdAt: -1 }).limit(20).lean(),
      Series.find({ isPublished: true }).sort({ priority: -1, createdAt: -1 }).limit(20).lean(),
      Microdrama.find({ isPublished: true }).sort({ priority: -1, createdAt: -1 }).limit(20).lean(),
    ]);

    const [moviesCount, seriesCount, microdramasCount, seriesData, microdramaData, episodesBySeries, episodesByMicrodrama] = await Promise.all([
      Movie.countDocuments({ isPublished: true }),
      Series.countDocuments({ isPublished: true }),
      Microdrama.countDocuments({ isPublished: true }),
      Series.find({ isPublished: true }, "totalEpisodes").lean(),
      Microdrama.find({ isPublished: true }, "totalEpisodes").lean(),
      getEpisodesByParent(Episode, "seriesId", series, { seasonNumber: 1, episodeNumber: 1 }),
      getEpisodesByParent(MicrodramaEpisode, "tvShowId", microdramas, { episodeNumber: 1 }),
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
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: "Search query is required" });

    const search = { $text: { $search: query }, isPublished: true };
    const projection = { score: { $meta: "textScore" } };
    const [movies, series, microdramas] = await Promise.all([
      Movie.find(search, projection).select(projection).lean(),
      Series.find(search, projection).select(projection).lean(),
      Microdrama.find(search, projection).select(projection).lean(),
    ]);
    const [episodesBySeries, episodesByMicrodrama] = await Promise.all([
      getEpisodesByParent(Episode, "seriesId", series, { seasonNumber: 1, episodeNumber: 1 }),
      getEpisodesByParent(MicrodramaEpisode, "tvShowId", microdramas, { episodeNumber: 1 }),
    ]);

    const results = [
      ...movies.map((movie) => ({ ...movie, type: "movie" })),
      ...series.map((item) => ({ ...item, type: "series", episodes: episodesBySeries[item._id.toString()] || [] })),
      ...formatMicrodramas(microdramas, episodesByMicrodrama),
    ].sort((a, b) => (b.score || 0) - (a.score || 0));

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
