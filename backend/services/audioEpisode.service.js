const AudioEpisode = require("../models/audioEpisode.model");
const AudioStory = require("../models/audioStory.model");
const { checkUserSubscription } = require("./audioStory.service");

/**
 * Dynamically computes and updates the total episode count in the parent AudioStory
 */
const updateStoryStats = async (storyId) => {
  if (!storyId) return;
  try {
    const episodeCount = await AudioEpisode.countDocuments({
      storyId,
      isPublished: true,
      status: "Published",
    });

    await AudioStory.findByIdAndUpdate(storyId, {
      totalEpisodes: episodeCount,
    });
  } catch (error) {
    console.error("Error updating story stats:", error);
  }
};

const createEpisode = async (data) => {
  const episode = await AudioEpisode.create(data);
  await updateStoryStats(episode.storyId);
  return episode;
};

const getEpisodes = async (filter = {}) => {
  return await AudioEpisode.find(filter).sort({ episodeNumber: 1 });
};

const getEpisodeById = async (id) => {
  return await AudioEpisode.findById(id);
};

const updateEpisode = async (id, data) => {
  const oldEpisode = await AudioEpisode.findById(id);
  const updatedEpisode = await AudioEpisode.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });

  if (updatedEpisode) {
    await updateStoryStats(updatedEpisode.storyId);
    if (oldEpisode && oldEpisode.storyId.toString() !== updatedEpisode.storyId.toString()) {
      await updateStoryStats(oldEpisode.storyId);
    }
  }

  return updatedEpisode;
};

const deleteEpisode = async (id) => {
  const episode = await AudioEpisode.findById(id);
  if (!episode) return null;

  await AudioEpisode.findByIdAndDelete(id);
  await updateStoryStats(episode.storyId);
  return episode;
};

/**
 * Validates playback authorization and returns the secure URL.
 * Throws an error or returns custom object if access is denied.
 */
const authorizePlayback = async (episodeId, userId) => {
  const episode = await AudioEpisode.findById(episodeId);
  if (!episode) {
    return {
      authorized: false,
      status: 404,
      message: "Episode not found",
    };
  }

  if (!episode.isPublished) {
    return {
      authorized: false,
      status: 403,
      message: "Episode is not published",
    };
  }

  const story = await AudioStory.findById(episode.storyId);
  if (!story) {
    return {
      authorized: false,
      status: 404,
      message: "Story not found",
    };
  }

  const isPremiumContent = story.isPremium || episode.isPremium;

  if (isPremiumContent) {
    const isSubscribed = await checkUserSubscription(userId);
    if (!isSubscribed) {
      return {
        authorized: false,
        status: 403,
        message: "Active subscription required for premium content",
      };
    }
  }

  return {
    authorized: true,
    audioUrl: episode.audioUrl,
    episode,
  };
};

module.exports = {
  createEpisode,
  getEpisodes,
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
  authorizePlayback,
  updateStoryStats,
};
