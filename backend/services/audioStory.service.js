const AudioStory = require("../models/audioStory.model");
const AudioEpisode = require("../models/audioEpisode.model");
const AudioCategory = require("../models/audioCategory.model");
const Subscription = require("../models/subscription.model");
const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

/**
 * Helper to check if a user has an active, valid subscription
 */
const checkUserSubscription = async (userId) => {
  if (!userId) return false;
  try {
    let subscription = await Subscription.findOne({
      user: userId,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!subscription) return false;

    // Check and trigger auto-expiry if needed
    subscription = await expireSubscriptionIfNeeded(subscription);
    return subscription && subscription.status === "active";
  } catch (error) {
    console.error("Error checking subscription in service:", error);
    return false;
  }
};

const createStory = async (data) => {
  const inputPriority = data.priority !== undefined ? Number(data.priority) : 0;
  let finalPriority = 0;

  if (inputPriority > 0) {
    await AudioStory.updateMany(
      { priority: { $gte: inputPriority } },
      { $inc: { priority: 1 } }
    );
    finalPriority = inputPriority;
  } else {
    const maxStory = await AudioStory.findOne().sort("-priority");
    finalPriority = maxStory && maxStory.priority ? maxStory.priority + 1 : 1;
  }

  data.priority = finalPriority;
  return await AudioStory.create(data);
};

const getStories = async (query = {}, userId = null) => {
  const { search, categoryId, isPremium, status, isPublished } = query;
  const filter = {};

  if (status) filter.status = status;
  if (isPublished !== undefined) filter.isPublished = isPublished;
  if (isPremium !== undefined) {
    filter.isPremium = isPremium === "true" || isPremium === true;
  }

  if (categoryId) {
    filter.categories = categoryId;
  }

  if (search) {
    // If search is provided, use regex or text search
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
      { narrator: { $regex: search, $options: "i" } },
    ];
  }

  const stories = await AudioStory.find(filter)
    .populate("categories", "name slug")
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  // If userId is provided, evaluate locked status
  const isSubscribed = await checkUserSubscription(userId);
  return stories.map((story) => ({
    ...story,
    isLocked: story.isPremium && !isSubscribed,
  }));
};

const getStoryById = async (id, userId = null) => {
  const story = await AudioStory.findById(id)
    .populate("categories", "name slug")
    .lean();

  if (!story) return null;

  const isSubscribed = await checkUserSubscription(userId);
  story.isLocked = story.isPremium && !isSubscribed;

  // Fetch all published episodes for this story
  const episodes = await AudioEpisode.find({
    storyId: id,
    isPublished: true,
  })
    .sort({ episodeNumber: 1 })
    .lean();

  // Map locking status to episodes.
  // An episode is locked if: (Story is premium OR Episode is premium) AND User is not subscribed
  story.episodes = episodes.map((ep) => {
    const isEpisodeLocked = (story.isPremium || ep.isPremium) && !isSubscribed;
    // Strip audioUrl from list results if locked, protecting raw file URLs
    const resultEp = { ...ep, isLocked: isEpisodeLocked };
    if (isEpisodeLocked) {
      resultEp.audioUrl = "";
    }
    return resultEp;
  });

  return story;
};

const updateStory = async (id, data) => {
  const existing = await AudioStory.findById(id);
  if (!existing) return null;

  if (data.priority !== undefined) {
    const newPriority = Number(data.priority) || 0;
    const oldPriority = existing.priority || 0;

    if (newPriority !== oldPriority) {
      if (oldPriority > 0) {
        await AudioStory.updateMany(
          { _id: { $ne: existing._id }, priority: { $gt: oldPriority } },
          { $inc: { priority: -1 } }
        );
      }
      if (newPriority > 0) {
        await AudioStory.updateMany(
          { _id: { $ne: existing._id }, priority: { $gte: newPriority } },
          { $inc: { priority: 1 } }
        );
        data.priority = newPriority;
      } else {
        data.priority = 0;
      }
    }
  }

  return await AudioStory.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
};

const deleteStory = async (id) => {
  const existing = await AudioStory.findById(id);
  if (!existing) return null;
  const targetPriority = existing.priority || 0;

  // First delete associated episodes
  await AudioEpisode.deleteMany({ storyId: id });
  await AudioStory.findByIdAndDelete(id);

  if (targetPriority > 0) {
    await AudioStory.updateMany(
      { priority: { $gt: targetPriority } },
      { $inc: { priority: -1 } }
    );
  }
  
  return existing;
};

const getHomeFeed = async (userId = null) => {
  // Fetch active categories
  const categories = await AudioCategory.find({ isActive: true })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const isSubscribed = await checkUserSubscription(userId);

  const feed = await Promise.all(
    categories.map(async (cat) => {
      // Find up to 10 published stories under this category
      const stories = await AudioStory.find({
        categories: cat._id,
        isPublished: true,
        status: "Published",
      })
        .sort({ priority: 1, createdAt: -1 })
        .limit(10)
        .lean();

      const mappedStories = stories.map((story) => ({
        ...story,
        isLocked: story.isPremium && !isSubscribed,
      }));

      return {
        category: cat,
        stories: mappedStories,
      };
    })
  );

  // Return only categories that have stories to keep feed clean
  return feed.filter((item) => item.stories.length > 0);
};

module.exports = {
  createStory,
  getStories,
  getStoryById,
  updateStory,
  deleteStory,
  getHomeFeed,
  checkUserSubscription,
};
