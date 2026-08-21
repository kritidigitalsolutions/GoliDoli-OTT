const AudioProgress = require("../models/audioProgress.model");
const AudioEpisode = require("../models/audioEpisode.model");

const updateProgress = async (userId, episodeId, progressSeconds, durationSeconds) => {
  const episode = await AudioEpisode.findById(episodeId);
  if (!episode) {
    throw new Error("Episode not found");
  }

  const storyId = episode.storyId;
  const completed = Number(progressSeconds) >= Number(durationSeconds) * 0.9;

  return await AudioProgress.findOneAndUpdate(
    { userId, episodeId },
    {
      storyId,
      progressSeconds: Number(progressSeconds),
      durationSeconds: Number(durationSeconds),
      completed,
      lastPlayedAt: new Date(),
    },
    { upsert: true, returnDocument: "after" }
  );
};

const getContinueListening = async (userId) => {
  return await AudioProgress.find({
    userId,
    completed: false,
  })
    .populate({
      path: "episodeId",
      match: { isPublished: true },
    })
    .populate({
      path: "storyId",
      match: { isPublished: true },
    })
    .sort({ lastPlayedAt: -1 })
    .lean()
    .then((results) => {
      // Filter out progress records where episode or story was deleted/unpublished
      return results.filter((item) => item.episodeId && item.storyId);
    });
};

const getEpisodeProgress = async (userId, episodeId) => {
  return await AudioProgress.findOne({ userId, episodeId });
};

const completeEpisode = async (userId, episodeId) => {
  const episode = await AudioEpisode.findById(episodeId);
  if (!episode) {
    throw new Error("Episode not found");
  }

  const duration = episode.duration || 0;

  return await AudioProgress.findOneAndUpdate(
    { userId, episodeId },
    {
      storyId: episode.storyId,
      progressSeconds: duration,
      durationSeconds: duration,
      completed: true,
      lastPlayedAt: new Date(),
    },
    { upsert: true, returnDocument: "after" }
  );
};

module.exports = {
  updateProgress,
  getContinueListening,
  getEpisodeProgress,
  completeEpisode,
};
