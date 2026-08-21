const WatchProgress = require("../../models/watchProgress.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Episode = require("../../models/episode.model");
const TvShow = require("../../models/microdrama.model");
const TvShowsEpisode = require("../../models/microdramaEpisode.model");

/**
 * Auto-detect content & episode models and type
 */
const resolveContentDetails = async (contentId, episodeId, providedType) => {
  let contentModel = null;
  let contentType = providedType ? providedType.toLowerCase() : null;
  let episodeModel = null;

  // 1. Movie check
  if (!contentType || contentType === "movie") {
    const isMovie = await Movie.exists({ _id: contentId });
    if (isMovie) {
      contentModel = "Movie";
      contentType = "movie";
      episodeId = null;
      episodeModel = null;
      return { contentModel, contentType, episodeId, episodeModel };
    }
  }

  // 2. Series check
  if (!contentType || contentType === "series") {
    const isSeries = await Series.exists({ _id: contentId });
    if (isSeries) {
      contentModel = "Series";
      contentType = "series";
      if (episodeId) {
        const isEp = await Episode.exists({ _id: episodeId });
        if (isEp) episodeModel = "Episode";
      }
      return { contentModel, contentType, episodeId, episodeModel };
    }
  }

  // 3. Microdrama check
  if (!contentType || contentType === "microdrama" || contentType === "tvshow") {
    const isTvShow = await TvShow.exists({ _id: contentId });
    if (isTvShow) {
      contentModel = "TvShow";
      contentType = "microdrama";
      if (episodeId) {
        const isEp = await TvShowsEpisode.exists({ _id: episodeId });
        if (isEp) episodeModel = "TvShowsEpisode";
      }
      return { contentModel, contentType, episodeId, episodeModel };
    }
  }

  // 4. Fallback check episodeId if provided
  if (episodeId && !episodeModel) {
    const isEpisode = await Episode.exists({ _id: episodeId });
    if (isEpisode) {
      episodeModel = "Episode";
      if (!contentModel) {
        const epDoc = await Episode.findById(episodeId).select("seriesId");
        if (epDoc) {
          contentId = epDoc.seriesId;
          contentModel = "Series";
          contentType = "series";
        }
      }
    } else {
      const isTvEp = await TvShowsEpisode.exists({ _id: episodeId });
      if (isTvEp) {
        episodeModel = "TvShowsEpisode";
        if (!contentModel) {
          const epDoc = await TvShowsEpisode.findById(episodeId).select("tvShowId");
          if (epDoc) {
            contentId = epDoc.tvShowId;
            contentModel = "TvShow";
            contentType = "microdrama";
          }
        }
      }
    }
  }

  return { contentModel, contentType, episodeId, episodeModel };
};

/**
 * ➕ Save/Update Watch Progress
 * POST /api/continue-watching
 */
const saveProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    let { contentId, episodeId, contentType, progressSeconds, durationSeconds, completed } = req.body;

    if (!contentId && !episodeId) {
      return res.status(400).json({
        success: false,
        message: "contentId or episodeId is required",
      });
    }

    const progressSec = Number(progressSeconds) || 0;
    const durationSec = Number(durationSeconds) || 0;

    // Resolve models and types
    const resolved = await resolveContentDetails(contentId, episodeId, contentType);
    contentId = contentId || resolved.contentId;
    contentType = resolved.contentType;
    const contentModel = resolved.contentModel;
    episodeId = resolved.episodeId || null;
    const episodeModel = resolved.episodeModel || null;

    if (!contentModel) {
      return res.status(404).json({
        success: false,
        message: "Associated content not found",
      });
    }

    // Auto-compute completion if >= 95% watched
    const isCompleted =
      completed === true ||
      completed === "true" ||
      (durationSec > 0 && progressSec >= durationSec * 0.95);

    const filter = {
      user: userId,
      contentId,
      episodeId: episodeId || null,
    };

    const updateData = {
      contentType,
      contentModel,
      episodeModel,
      progressSeconds: progressSec,
      durationSeconds: durationSec,
      completed: isCompleted,
      lastWatchedAt: new Date(),
    };

    const progressRecord = await WatchProgress.findOneAndUpdate(
      filter,
      updateData,
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Watch progress saved successfully",
      progress: progressRecord,
    });
  } catch (error) {
    console.error("Save Watch Progress Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save watch progress",
      error: error.message,
    });
  }
};

/**
 * 📄 Get Continue Watching List for User
 * GET /api/continue-watching
 */
const getContinueWatching = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const list = await WatchProgress.find({
      user: userId,
      completed: false,
      progressSeconds: { $gt: 0 },
    })
      .sort({ lastWatchedAt: -1 })
      .populate("contentId")
      .populate("episodeId")
      .lean();

    // Filter out items where the content or episode was deleted/unpublished
    const validList = list.filter((item) => {
      if (!item.contentId) return false;
      if (item.contentId.isPublished === false) return false;
      if (item.episodeId && item.episodeId.isPublished === false) return false;
      return true;
    });

    // De-duplicate: Keep only the latest watched item per contentId
    const seenContentIds = new Set();
    const continueWatching = [];

    for (const item of validList) {
      const cId = item.contentId._id.toString();
      if (!seenContentIds.has(cId)) {
        seenContentIds.add(cId);
        continueWatching.push(item);
        if (continueWatching.length >= Number(limit)) break;
      }
    }

    return res.status(200).json({
      success: true,
      count: continueWatching.length,
      continueWatching,
    });
  } catch (error) {
    console.error("Get Continue Watching Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch continue watching list",
      error: error.message,
    });
  }
};

/**
 * 🔍 Get Watch Progress for specific content or episode
 * GET /api/continue-watching/progress/:contentId
 */
const getProgressByContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId } = req.params;
    const { episodeId } = req.query;

    const query = { user: userId };

    if (episodeId) {
      query.episodeId = episodeId;
    } else {
      query.contentId = contentId;
    }

    const progress = await WatchProgress.findOne(query)
      .sort({ lastWatchedAt: -1 })
      .populate("contentId")
      .populate("episodeId")
      .lean();

    return res.status(200).json({
      success: true,
      progress: progress || null,
    });
  } catch (error) {
    console.error("Get Progress By Content Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      error: error.message,
    });
  }
};

/**
 * ✅ Mark Progress as Completed
 * PATCH /api/continue-watching/complete/:id
 */
const markAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const progress = await WatchProgress.findOneAndUpdate(
      { _id: id, user: userId },
      { completed: true, lastWatchedAt: new Date() },
      { returnDocument: "after" }
    );

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Watch progress record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Watch progress marked as completed",
      progress,
    });
  } catch (error) {
    console.error("Mark Progress Completed Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark progress as completed",
      error: error.message,
    });
  }
};

/**
 * ❌ Remove Item from Continue Watching
 * DELETE /api/continue-watching/:id
 */
const removeFromContinueWatching = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await WatchProgress.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Continue watching item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item removed from continue watching list",
    });
  } catch (error) {
    console.error("Remove From Continue Watching Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item",
      error: error.message,
    });
  }
};

module.exports = {
  saveProgress,
  getContinueWatching,
  getProgressByContent,
  markAsCompleted,
  removeFromContinueWatching,
};
