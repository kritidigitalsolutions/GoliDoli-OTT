const TvShow = require(
  "../../models/microdrama.model"
);

const TvShowsEpisode = require(
  "../../models/microdramaEpisode.model"
);

const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");


// ========================================
// HELPERS
// ========================================

const parseJSON = (
  value,
  defaultValue = []
) => {
  try {
    return value
      ? JSON.parse(value)
      : defaultValue;
  } catch {
    return defaultValue;
  }
};


// ========================================
// ADD MICRODRAMA
// ========================================

const addMicrodrama = async (
  req,
  res
) => {
  try {

    const genre = parseJSON(
      req.body.genre
    );

    const category = parseJSON(
      req.body.category
    );

    const cast = parseJSON(
      req.body.cast
    );

    const poster =
      req.files?.poster?.[0];

    const banner =
      req.files?.banner?.[0];

    const trailer =
      req.files?.trailer?.[0];

    // CAST IMAGES
    const castFiles = Object.keys(
      req.files || {}
    ).filter((key) =>
      key.startsWith("castImage_")
    );

    castFiles.forEach((key) => {

      const index =
        key.split("_")[1];

      const file =
        req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          getMediaUrl(file);
      }
    });

    // ========================================
    // PRIORITY ALGORITHM
    // ========================================

    const inputPriority =
      req.body.priority !== undefined
        ? Number(req.body.priority)
        : 0;

    let priority = 0;

    if (inputPriority > 0) {
      // Shift up existing microdramas with priority >= inputPriority.
      await TvShow.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );
      priority = inputPriority;
    } else {
      // Auto-assign: maxPriority + 1
      const maxShow = await TvShow.findOne().sort("-priority");
      priority =
        maxShow && maxShow.priority
          ? maxShow.priority + 1
          : 1;
    }

    // ========================================
    // CREATE MICRODRAMA
    // ========================================

    const tvShow =
      await TvShow.create({

        title: req.body.title,

        description:
          req.body.description || "",

        genre,

        releaseYear:
          req.body.releaseYear
            ? Number(req.body.releaseYear)
            : null,

        releaseDate: req.body.releaseDate || "",

        duration: req.body.duration || "",

        rating: req.body.rating ? Number(req.body.rating) : 0,

        language:
          req.body.language || "",

        poster: getMediaUrl(
          poster,
          req.body.poster
        ),

        banner: getMediaUrl(
          banner,
          req.body.banner
        ),

        trailerUrl: getMediaUrl(
          trailer,
          req.body.trailerUrl
        ),

        isPremium:
          req.body.isPremium ===
          "true",

        isComingSoon:
          req.body.isComingSoon === "true",

        status:
          req.body.status ||
          "ongoing",

        cast,

        category,

        priority,
        isPublished: req.body.isPublished !== undefined ? req.body.isPublished === "true" || req.body.isPublished === true : true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Microdrama added successfully",
      microdrama: tvShow,
    });

  } catch (error) {

    console.error("ADD MICRODRAMA ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to add microdrama",
      error: error.message,
    });
  }
};


// ========================================
// GET ALL MICRODRAMAS
// ========================================

const getAllMicrodramas =
  async (req, res) => {
    try {

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [tvShows, total] = await Promise.all([
        TvShow.find()
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        TvShow.countDocuments(),
      ]);

      return res.json({
        success: true,
        microdramas: tvShows,
        total,
        pages: Math.ceil(total / limit),
        page,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch microdramas",
      });
    }
  };


// ========================================
// GET SINGLE MICRODRAMA BY ID
// ========================================

const getMicrodramaById =
  async (req, res) => {
    try {

      const tvShow =
        await TvShow.findById(
          req.params.id
        );

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


// ========================================
// UPDATE MICRODRAMA
// ========================================

const updateMicrodrama =
  async (req, res) => {
    try {

      const drama =
        await TvShow.findById(
          req.params.id
        );

      if (!drama) {
        return res.status(404).json({
          success: false,
          message:
            "Microdrama not found",
        });
      }

      const genre = parseJSON(
        req.body.genre,
        drama.genre
      );

      const category = parseJSON(
        req.body.category,
        drama.category
      );

      const cast = parseJSON(
        req.body.cast,
        drama.cast
      );

      if (req.body.title)
        drama.title =
          req.body.title;

      if (req.body.description)
        drama.description =
          req.body.description;

      if (req.body.language)
        drama.language =
          req.body.language;

      if (req.body.releaseYear)
        drama.releaseYear =
          Number(req.body.releaseYear);

      drama.genre = genre;

      drama.category = category;

      if (req.body.isPublished !== undefined) {
        drama.isPublished = req.body.isPublished === "true" || req.body.isPublished === true;
      }

      if (req.body.isPremium !== undefined) {
        drama.isPremium = req.body.isPremium === "true" || req.body.isPremium === true;
      }

      drama.status =
        req.body.status ||
        drama.status;


      // POSTER
      if (req.files?.poster?.[0]) {

        deleteMedia(drama.poster);

        drama.poster =
          getMediaUrl(req.files.poster[0]);
      }


      // BANNER
      if (req.files?.banner?.[0]) {

        deleteMedia(drama.banner);

        drama.banner =
          getMediaUrl(req.files.banner[0]);
      }


      // TRAILER
      if (req.files?.trailer?.[0]) {

        deleteMedia(
          drama.trailerUrl
        );

        drama.trailerUrl =
          getMediaUrl(req.files.trailer[0]);
      }


      // CAST
      const castFiles =
        Object.keys(
          req.files || {}
        ).filter((key) =>
          key.startsWith(
            "castImage_"
          )
        );

      castFiles.forEach((key) => {

        const index =
          key.split("_")[1];

        const file =
          req.files[key][0];

        if (cast[index]) {
          cast[index].image =
            getMediaUrl(file);
        }
      });

      drama.cast = cast;

      // ========================================
      // PRIORITY ALGORITHM FOR UPDATE
      // ========================================

      if (req.body.priority !== undefined) {
        const newPriority = Number(req.body.priority) || 0;
        const oldPriority = drama.priority || 0;

        if (newPriority !== oldPriority) {
          // Step 1: Remove show from its old slot
          if (oldPriority > 0) {
            await TvShow.updateMany(
              { _id: { $ne: drama._id }, priority: { $gt: oldPriority } },
              { $inc: { priority: -1 } }
            );
          }

          // Step 2: Insert show into its new slot
          if (newPriority > 0) {
            await TvShow.updateMany(
              { _id: { $ne: drama._id }, priority: { $gte: newPriority } },
              { $inc: { priority: 1 } }
            );
            drama.priority = newPriority;
          } else {
            drama.priority = 0;
          }
        }
      }

      await drama.save();

      return res.json({
        success: true,
        message:
          "Microdrama updated successfully",
        drama,
      });

    } catch (error) {

      console.error("UPDATE MICRODRAMA ERROR:", error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update microdrama",
        error: error.message,
      });
    }
  };


// ========================================
// DELETE MICRODRAMA
// ========================================

const deleteMicrodrama =
  async (req, res) => {
    try {

      const drama =
        await TvShow.findById(
          req.params.id
        );

      if (!drama) {
        return res.status(404).json({
          success: false,
          message:
            "Microdrama not found",
        });
      }

      const targetPriority = drama.priority || 0;

      deleteMedia(drama.poster);

      deleteMedia(drama.banner);

      deleteMedia(
        drama.trailerUrl
      );

      drama.cast.forEach((c) =>
        deleteMedia(c.image)
      );


      // DELETE EPISODES
      const episodes =
        await TvShowsEpisode.find({
          tvShowId:
            drama._id,
        });

      episodes.forEach((ep) => {
        deleteMedia(ep.videoUrl);
        deleteMedia(ep.thumbnail);
      });

      await TvShowsEpisode.deleteMany({
        tvShowId:
          drama._id,
      });

      await TvShow.findByIdAndDelete(
        req.params.id
      );

      // Shift down priorities of all shows with priority > targetPriority
      if (targetPriority > 0) {
        await TvShow.updateMany(
          { priority: { $gt: targetPriority } },
          { $inc: { priority: -1 } }
        );
      }

      return res.json({
        success: true,
        message:
          "Microdrama deleted successfully",
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete microdrama",
      });
    }
  };


// ========================================
// SEARCH
// ========================================

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
  addMicrodrama,
  getAllMicrodramas,
  getMicrodramaById,
  updateMicrodrama,
  deleteMicrodrama,
  searchMicrodramas,
};
