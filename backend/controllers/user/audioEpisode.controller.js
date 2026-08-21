const audioEpisodeService = require("../../services/audioEpisode.service");

const playEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // set by isAuth middleware

    const result = await audioEpisodeService.authorizePlayback(id, userId);

    if (!result.authorized) {
      return res.status(result.status || 403).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      audioUrl: result.audioUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to authorize playback",
      error: error.message,
    });
  }
};

module.exports = {
  playEpisode,
};
