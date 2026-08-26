const mongoose = require("mongoose");
const AIReel = require("../models/aiReel.model");
const AIReelWatch = require("../models/aiReelWatch.model");
const AIReelFeedSession = require("../models/aiReelFeedSession.model");
const AIReelUserState = require("../models/aiReelUserState.model");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const getUserId = (req) => req.user?._id || req.user?.id;

const parseLimit = (value) => {
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_LIMIT);
};

const getFeedSession = async (userId, sessionId) => {
  if (sessionId && mongoose.isValidObjectId(sessionId)) {
    const existing = await AIReelFeedSession.findOne({
      _id: sessionId,
      user: userId,
    });

    if (existing) return existing;
  }

  return AIReelFeedSession.create({ user: userId });
};

// ========================================
// GET TRENDING AI REELS (USER)
// ========================================
// Only one user feed exists: Trending.
// Rules:
// 1. Never-consumed reels are always preferred.
// 2. The selected batch is random.
// 3. If the user enabled replay, previously consumed reels can fill the batch.
// 4. Newly uploaded reels remain eligible even during replay.
// 5. servedReels prevents duplicates while the current feed session is active.
const getAllAIReels = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const limit = parseLimit(req.query.limit);
    const session = await getFeedSession(userId, req.query.sessionId);

    const userState = await AIReelUserState.findOne({ user: userId })
      .select("replayEnabled")
      .lean();

    // The stored preference is the source of truth. The query parameter is
    // only a temporary override for clients during migration.
    const replayOverride =
      req.query.replay === "true" || req.query.replay === "1"
        ? true
        : req.query.replay === "false" || req.query.replay === "0"
          ? false
          : null;
    const replayEnabled = replayOverride !== null
      ? replayOverride
      : Boolean(userState?.replayEnabled);

    const watched = await AIReelWatch.find({ user: userId })
      .select("aiReel -_id")
      .lean();

    const watchedIds = watched.map((item) => item.aiReel);
    const servedIds = session.servedReels || [];

    const baseFilter = { isPublished: true };

    // New/unwatched reels are always requested first. This is what makes a
    // newly uploaded reel appear even if the user is currently replaying.
    const unseenFilter = {
      ...baseFilter,
      ...(watchedIds.length ? { _id: { $nin: watchedIds } } : {}),
      ...(servedIds.length ? { _id: { $nin: servedIds } } : {}),
    };

    let reels = await AIReel.aggregate([
      { $match: unseenFilter },
      { $sample: { size: limit } },
    ]);

    let mode = "fresh";

    // If there are not enough fresh reels and replay is enabled, fill the
    // remaining slots with old reels that have not appeared in this session.
    if (replayEnabled && reels.length < limit) {
      const selectedIds = reels.map((reel) => reel._id);
      const excludedIds = [...servedIds, ...selectedIds];

      const replayFilter = {
        ...baseFilter,
        ...(excludedIds.length ? { _id: { $nin: excludedIds } } : {}),
      };

      const replayReels = await AIReel.aggregate([
        { $match: replayFilter },
        { $sample: { size: limit - reels.length } },
      ]);

      reels = [...reels, ...replayReels];
      if (replayReels.length) mode = "mixed-replay";
    }

    // If this is a pure replay session, and the current session exhausted all
    // reels, start a new random cycle instead of returning an empty feed.
    if (replayEnabled && reels.length === 0) {
      const replayFilter = {
        ...baseFilter,
        ...(watchedIds.length ? {} : {}),
      };

      reels = await AIReel.aggregate([
        { $match: replayFilter },
        { $sample: { size: limit } },
      ]);
      mode = "replay";

      // Start a fresh cycle so the same reel is not returned repeatedly on
      // every pagination request.
      session.servedReels = [];
    }

    // A session can contain only a bounded number of ids. Once it gets large,
    // start a fresh session rather than allowing an ever-growing document.
    if (reels.length) {
      session.servedReels.push(...reels.map((reel) => reel._id));
      if (session.servedReels.length > 100) {
        session.servedReels = session.servedReels.slice(-100);
      }
      await session.save();
    }

    const publishedCount = await AIReel.countDocuments(baseFilter);
    const watchedPublishedCount = watchedIds.length
      ? await AIReel.countDocuments({
          ...baseFilter,
          _id: { $in: watchedIds },
        })
      : 0;

    const allWatched = publishedCount > 0 && watchedPublishedCount >= publishedCount;
    const hasUnwatched = watchedPublishedCount < publishedCount;

    return res.status(200).json({
      success: true,
      message: "Trending AI Reels fetched successfully",
      data: reels,
      pagination: {
        limit,
        sessionId: session._id,
        hasMore: reels.length === limit,
      },
      meta: {
        feedType: "trending",
        mode,
        allWatched,
        hasUnwatched,
        replayAvailable: allWatched,
        replayEnabled,
        totalPublished: publishedCount,
        watchedPublished: watchedPublishedCount,
      },
    });
  } catch (error) {
    console.error("Get Trending AI Reels Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// SET REPLAY PREFERENCE (USER)
// ========================================
const setReplayPreference = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const replay = req.body?.replay;
    if (typeof replay !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "replay must be a boolean",
      });
    }

    await AIReelUserState.findOneAndUpdate(
      { user: userId },
      { $set: { replayEnabled: replay } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: replay
        ? "AI Reel replay enabled"
        : "AI Reel replay disabled",
      data: { replayEnabled: replay },
    });
  } catch (error) {
    console.error("Set AI Reel Replay Preference Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// RECORD AI REEL VIEW (USER)
// ========================================
const recordAIReelView = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication required" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid AI Reel id" });
    }

    const reel = await AIReel.findOneAndUpdate(
      { _id: id, isPublished: true },
      { $inc: { views: 1 } },
      { new: true, projection: { _id: 1, views: 1 } }
    ).lean();

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "AI Reel view recorded successfully",
      data: { aiReelId: reel._id, views: reel.views },
    });
  } catch (error) {
    console.error("Record AI Reel View Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// RECORD AI REEL COMPLETION / CONSUMPTION
// ========================================
const recordAIReelCompletion = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const watchDuration = Math.max(Number(req.body?.watchDuration) || 0, 0);

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication required" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid AI Reel id" });
    }

    const reel = await AIReel.findOne({ _id: id, isPublished: true })
      .select("_id")
      .lean();

    if (!reel) {
      return res.status(404).json({ success: false, message: "AI Reel not found" });
    }

    const watch = await AIReelWatch.findOneAndUpdate(
      { user: userId, aiReel: id },
      {
        $set: {
          watchedAt: new Date(),
          completed: true,
          watchDuration,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "AI Reel consumption recorded successfully",
      data: watch,
    });
  } catch (error) {
    console.error("Record AI Reel Completion Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// GET AI REEL BY ID (USER)
// ========================================
const getAIReelById = async (req, res) => {
  try {
    const { id } = req.params;
    const aiReel = await AIReel.findOne({ _id: id, isPublished: true }).lean();
    if (!aiReel) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "AI Reel fetched successfully",
      data: aiReel,
    });
  } catch (error) {
    console.error("Get AI Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// RECORD AI REEL SHARE (USER)
// ========================================
const recordAIReelShare = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication required" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid AI Reel id" });
    }

    const reel = await AIReel.findOneAndUpdate(
      { _id: id, isPublished: true },
      { $inc: { shares: 1 } },
      { new: true, projection: { _id: 1, shares: 1 } }
    ).lean();

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "AI Reel not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "AI Reel share recorded successfully",
      data: { aiReelId: reel._id, shares: reel.shares },
    });
  } catch (error) {
    console.error("Record AI Reel Share Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllAIReels,
  getAIReelById,
  recordAIReelView,
  recordAIReelCompletion,
  setReplayPreference,
  recordAIReelShare,
};
