const audioStoryService = require("../../services/audioStory.service");
const { uploadMulterFileToBunny } = require("../../cdn/bunnyCDN");
const { deleteMedia } = require("../../utils/mediaUrl");
const AudioEpisode = require("../../models/audioEpisode.model");

const addStory = async (req, res) => {
  try {
    let coverImage = req.body.coverImage || "";
    let bannerImage = req.body.bannerImage || "";

    // Upload files to Bunny CDN if present
    if (req.files?.coverImage?.[0]) {
      const uploadResult = await uploadMulterFileToBunny(
        req.files.coverImage[0],
        "audiostories/covers"
      );
      coverImage = uploadResult.url;
    }

    if (req.files?.bannerImage?.[0]) {
      const uploadResult = await uploadMulterFileToBunny(
        req.files.bannerImage[0],
        "audiostories/banners"
      );
      bannerImage = uploadResult.url;
    }

    const storyData = {
      ...req.body,
      categories: req.body.parsedCategories || [],
      coverImage,
      bannerImage,
    };

    const story = await audioStoryService.createStory(storyData);

    return res.status(201).json({
      success: true,
      message: "Audio Story created successfully",
      story,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create audio story",
      error: error.message,
    });
  }
};

const getStories = async (req, res) => {
  try {
    const stories = await audioStoryService.getStories(req.query);
    return res.json({
      success: true,
      stories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audio stories",
      error: error.message,
    });
  }
};

const getStoryById = async (req, res) => {
  try {
    const story = await audioStoryService.getStoryById(req.params.id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Audio story not found",
      });
    }
    return res.json({
      success: true,
      story,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audio story details",
      error: error.message,
    });
  }
};

const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await audioStoryService.getStoryById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Audio story not found",
      });
    }

    const updateData = { ...req.body };
    if (req.body.parsedCategories) {
      updateData.categories = req.body.parsedCategories;
    }

    // Handle files upload and old media deletion
    if (req.files?.coverImage?.[0]) {
      if (story.coverImage) {
        await deleteMedia(story.coverImage);
      }
      const uploadResult = await uploadMulterFileToBunny(
        req.files.coverImage[0],
        "audiostories/covers"
      );
      updateData.coverImage = uploadResult.url;
    }

    if (req.files?.bannerImage?.[0]) {
      if (story.bannerImage) {
        await deleteMedia(story.bannerImage);
      }
      const uploadResult = await uploadMulterFileToBunny(
        req.files.bannerImage[0],
        "audiostories/banners"
      );
      updateData.bannerImage = uploadResult.url;
    }

    const updatedStory = await audioStoryService.updateStory(id, updateData);

    return res.json({
      success: true,
      message: "Audio story updated successfully",
      story: updatedStory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update audio story",
      error: error.message,
    });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await audioStoryService.getStoryById(id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Audio story not found",
      });
    }

    // Find and delete physical media files of associated episodes
    const episodes = await AudioEpisode.find({ storyId: id });
    for (const ep of episodes) {
      if (ep.audioUrl) await deleteMedia(ep.audioUrl);
      if (ep.thumbnail) await deleteMedia(ep.thumbnail);
    }

    // Delete story covers
    if (story.coverImage) await deleteMedia(story.coverImage);
    if (story.bannerImage) await deleteMedia(story.bannerImage);

    await audioStoryService.deleteStory(id);

    return res.json({
      success: true,
      message: "Audio story and all associated episodes deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete audio story",
      error: error.message,
    });
  }
};

module.exports = {
  addStory,
  getStories,
  getStoryById,
  updateStory,
  deleteStory,
};
