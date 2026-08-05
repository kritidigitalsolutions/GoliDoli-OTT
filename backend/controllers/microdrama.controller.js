const TvShow = require(
  "../models/microdrama.model"
);

const TvShowsEpisode = require(
  "../models/microdramaEpisode.model"
);

const fs = require("fs");
const path = require("path");


// GET ALL MICRODRAMAS
const getAllMicrodramas =
  async (req, res) => {
    try {

      const dramas =
        await TvShow.find({ isPublished: true })
          .sort({
            priority: -1,
            createdAt: -1,
          });

      return res.json({
        success: true,
        microdramas: dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
            "Failed to fetch microdramas",
      });
    }
  };


// GET SINGLE MICRODRAMA
const getMicrodramaById =
  async (req, res) => {
    try {

      const tvShow =
        await TvShow.findOne({
          _id: req.params.id,
          isPublished: true,
        });

      if (!tvShow) {
        return res.status(404).json({
          success: false,
          message:
            "Microdrama not found",
        });
      }

      return res.json({
        success: true,
        microdrama: tvShow,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
            "Failed to fetch microdrama",
      });
    }
  };

// SEARCH
const searchMicrodramas =
  async (req, res) => {
    try {

      const { q } = req.query;

      const dramas =
        await TvShow.find({
          title: {
            $regex: q,
            $options: "i",
          },
          isPublished: true,
        }).sort({
          priority: -1,
          createdAt: -1,
        });

      return res.json({
        success: true,
        results: dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  getAllMicrodramas,
  getMicrodramaById,
  searchMicrodramas
};
