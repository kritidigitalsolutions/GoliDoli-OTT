const audioEpisodeService = require("../../services/audioEpisode.service");
const { getClientUploadConfig } = require("../../cdn/bunnyCDN");
const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");

const addEpisode = async (req, res) => {
  try {
    let audioUrl = req.body.audioUrl || "";
    let thumbnail = req.body.thumbnail || "";

    if (req.files?.audio?.[0]) {
      audioUrl = getMediaUrl(req.files.audio[0]);
    }

    if (req.files?.thumbnail?.[0]) {
      thumbnail = getMediaUrl(req.files.thumbnail[0]);
    }

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: "Audio track is required (either as file upload or audioUrl)",
      });
    }

    const episodeData = {
      ...req.body,
      episodeNumber: Number(req.body.episodeNumber),
      duration: Number(req.body.duration),
      audioUrl,
      thumbnail,
    };

    const episode = await audioEpisodeService.createEpisode(episodeData);

    return res.status(201).json({
      success: true,
      message: "Audio Episode added successfully",
      episode,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Episode number already exists for this story",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to add audio episode",
      error: error.message,
    });
  }
};

const getEpisodes = async (req, res) => {
  try {
    const { storyId } = req.query;
    if (!storyId) {
      return res.status(400).json({
        success: false,
        message: "storyId is required to fetch episodes",
      });
    }

    const episodes = await audioEpisodeService.getEpisodes({ storyId });
    return res.json({
      success: true,
      episodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch episodes",
      error: error.message,
    });
  }
};

const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const episode = await audioEpisodeService.getEpisodeById(id);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    const updateData = { ...req.body };
    if (req.body.episodeNumber !== undefined) {
      updateData.episodeNumber = Number(req.body.episodeNumber);
    }
    if (req.body.duration !== undefined) {
      updateData.duration = Number(req.body.duration);
    }

    // Handle files upload and old media deletion
    if (req.files?.audio?.[0]) {
      if (episode.audioUrl) {
        await deleteMedia(episode.audioUrl);
      }
      updateData.audioUrl = getMediaUrl(req.files.audio[0]);
    }

    if (req.files?.thumbnail?.[0]) {
      if (episode.thumbnail) {
        await deleteMedia(episode.thumbnail);
      }
      updateData.thumbnail = getMediaUrl(req.files.thumbnail[0]);
    }

    const updatedEpisode = await audioEpisodeService.updateEpisode(id, updateData);

    return res.json({
      success: true,
      message: "Episode updated successfully",
      episode: updatedEpisode,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Episode number already exists for this story",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update episode",
      error: error.message,
    });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const episode = await audioEpisodeService.getEpisodeById(id);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    // Delete media files from Bunny CDN
    if (episode.audioUrl) await deleteMedia(episode.audioUrl);
    if (episode.thumbnail) await deleteMedia(episode.thumbnail);

    await audioEpisodeService.deleteEpisode(id);

    return res.json({
      success: true,
      message: "Episode deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete episode",
      error: error.message,
    });
  }
};

const getUploadConfig = async (req, res) => {
  try {
    const config = await getClientUploadConfig();
    return res.json({
      success: true,
      config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve upload configuration credentials",
      error: error.message,
    });
  }
};

module.exports = {
  addEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  getUploadConfig,
};
