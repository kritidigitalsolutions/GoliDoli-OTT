const MicrodramaEpisode = require(
  "../../models/microdramaEpisode.model"
);

const Microdrama = require(
  "../../models/microdrama.model"
);

const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");


// ========================================
// UPDATE TOTAL EPISODES
// ========================================
const updateMicrodramaStats =
  async (microdramaId) => {

    const totalEpisodes =
      await MicrodramaEpisode.countDocuments({
        microdramaId: microdramaId,
      });

    await Microdrama.findByIdAndUpdate(
      microdramaId,
      {
        totalEpisodes,
      }
    );
  };


// ========================================
// ADD MICRODRAMA EPISODE
// ========================================
const addMicrodramaEpisode =
  async (req, res) => {
    try {

      const {
        microdramaId: microdramaId,
      } = req.params;

      const existingEpisode =
        await MicrodramaEpisode.findOne({
          microdramaId,

          episodeNumber:
            req.body.episodeNumber,
        });

      if (existingEpisode) {
        return res.status(400).json({
          success: false,
          message:
            "Episode already exists",
        });
      }

      const video =
        req.files?.video?.[0] || req.files?.videoUrl?.[0];

      const thumbnail =
        req.files?.thumbnail?.[0] || req.files?.thumbnailUrl?.[0];

      const episode =
        await MicrodramaEpisode.create({

          microdramaId,

          episodeNumber:
            Number(
              req.body.episodeNumber
            ),

          title:
            req.body.title || "",

          description:
            req.body.description || "",

          duration:
            req.body.duration || "",

          isLocked:
            req.body.isLocked ===
            "true",

          isVertical:
            req.body.isVertical !==
            "false",

          videoUrl: getMediaUrl(
            video,
            req.body.videoUrl || ""
          ),

          thumbnail: getMediaUrl(
            thumbnail,
            req.body.thumbnail || req.body.thumbnailUrl || ""
          ),
        });

      await updateMicrodramaStats(
        microdramaId
      );

      return res.status(201).json({
        success: true,
        message:
          "Episode added successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to add episode",

        error: error.message,
      });
    }
  };


// ========================================
// GET MICRODRAMA EPISODES
// ========================================
const getMicrodramaEpisodes =
  async (req, res) => {
    try {

      const {
        microdramaId: microdramaId,
      } = req.params;

      const episodes =
        await MicrodramaEpisode.find({
          microdramaId,
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch episodes",
      });
    }
  };


// ========================================
// UPDATE MICRODRAMA EPISODE
// ========================================
const updateMicrodramaEpisode =
  async (req, res) => {
    try {

      const episode =
        await MicrodramaEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      // DUPLICATE CHECK
      if (
        req.body.episodeNumber
      ) {

        const existingEpisode =
          await MicrodramaEpisode.findOne({
            microdramaId:
              episode.microdramaId,

            episodeNumber:
              req.body.episodeNumber,

            _id: {
              $ne: episode._id,
            },
          });

        if (existingEpisode) {
          return res.status(400).json({
            success: false,
            message:
              "Episode number already exists",
          });
        }

        episode.episodeNumber =
          Number(
            req.body.episodeNumber
          );
      }

      if (req.body.title)
        episode.title =
          req.body.title;

      if (req.body.description)
        episode.description =
          req.body.description;

      if (req.body.duration)
        episode.duration =
          req.body.duration;

      if (
        req.body.isLocked !==
        undefined
      ) {

        episode.isLocked =
          req.body.isLocked ===
          "true";
      }

      if (
        req.body.isVertical !==
        undefined
      ) {

        episode.isVertical =
          req.body.isVertical !==
          "false";
      }


      // VIDEO
      const video = req.files?.video?.[0] || req.files?.videoUrl?.[0];
      if (video) {

        deleteMedia(
          episode.videoUrl
        );

        episode.videoUrl =
          getMediaUrl(video);
      }


      // THUMBNAIL
      const thumbnail = req.files?.thumbnail?.[0] || req.files?.thumbnailUrl?.[0];
      if (thumbnail) {

        deleteMedia(
          episode.thumbnail
        );

        episode.thumbnail =
          getMediaUrl(thumbnail);
      }

      await episode.save();

      return res.json({
        success: true,
        message:
          "Episode updated successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update episode",
      });
    }
  };


// ========================================
// DELETE MICRODRAMA EPISODE
// ========================================
const deleteMicrodramaEpisode =
  async (req, res) => {
    try {

      const episode =
        await MicrodramaEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      deleteMedia(
        episode.videoUrl
      );

      deleteMedia(
        episode.thumbnail
      );

      await MicrodramaEpisode.findByIdAndDelete(
        req.params.id
      );

      await updateMicrodramaStats(
        episode.microdramaId
      );

      return res.json({
        success: true,
        message:
          "Episode deleted successfully",
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete episode",
      });
    }
  };


// ========================================
// SEARCH MICRODRAMA EPISODES
// ========================================
const searchMicrodramaEpisodes =
  async (req, res) => {
    try {

      const {
        microdramaId,
      } = req.params;

      const { q } = req.query;

      const episodes =
        await MicrodramaEpisode.find({

          microdramaId,

          title: {
            $regex: q || "",
            $options: "i",
          },
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        results: episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  addMicrodramaEpisode,
  getMicrodramaEpisodes,
  updateMicrodramaEpisode,
  deleteMicrodramaEpisode,
  searchMicrodramaEpisodes,
};
