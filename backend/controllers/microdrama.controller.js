const Microdrama = require(
  "../models/microdrama.model"
);

const MicrodramaEpisode = require(
  "../models/microdramaEpisode.model"
);

const fs = require("fs");
const path = require("path");

const getSearchFilter = (search) => {
  const term = String(search || "").trim();
  return term
    ? { title: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
    : {};
};

// GET ALL MICRODRAMAS
const getAllMicrodramas =
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const filter = { isPublished: true, ...getSearchFilter(req.query.search) };
      const dramas =
        await Microdrama.find(filter)
          .sort({
            priority: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      const total = await Microdrama.countDocuments(filter);

      const dramaIds = dramas.map(
        (d) => d._id
      );

      const episodes =
        await MicrodramaEpisode.find({
          microdramaId: {
            $in: dramaIds,
          },
        })
          .sort({ episodeNumber: 1 })
          .lean();

      const formattedDramas =
        dramas.map((drama) => {
          const dramaEpisodes =
            episodes.filter(
              (ep) =>
                ep.microdramaId.toString() ===
                drama._id.toString()
            );

          return {
            ...drama,
            episodes: dramaEpisodes,
          };
        });

      return res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit),
        microdramas: formattedDramas,
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

      const microdrama =
        await Microdrama.findOne({
          _id: req.params.id,
          isPublished: true,
        });

      if (!microdrama) {
        return res.status(404).json({
          success: false,
          message:
            "Microdrama not found",
        });
      }

      return res.json({
        success: true,
        microdrama: microdrama,
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
        await Microdrama.find({
          title: {
            $regex: q || "",
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
