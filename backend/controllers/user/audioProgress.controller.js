const audioProgressService = require("../../services/audioProgress.service");

const saveProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { episodeId, progressSeconds, durationSeconds } = req.body;

    const progress = await audioProgressService.updateProgress(
      userId,
      episodeId,
      Number(progressSeconds),
      Number(durationSeconds)
    );

    return res.json({
      success: true,
      message: "Progress updated successfully",
      progress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save progress",
      error: error.message,
    });
  }
};

const getContinueListening = async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await audioProgressService.getContinueListening(userId);

    return res.json({
      success: true,
      continueListening: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch continue listening list",
      error: error.message,
    });
  }
};

const completeEpisode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { episodeId } = req.params;

    const progress = await audioProgressService.completeEpisode(userId, episodeId);

    return res.json({
      success: true,
      message: "Episode marked as completed",
      progress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to complete episode",
      error: error.message,
    });
  }
};

const getEpisodeProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { episodeId } = req.params;

    const progress = await audioProgressService.getEpisodeProgress(userId, episodeId);

    return res.json({
      success: true,
      progress: progress || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      error: error.message,
    });
  }
};

module.exports = {
  saveProgress,
  getContinueListening,
  completeEpisode,
  getEpisodeProgress,
};
