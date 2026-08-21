const HomeBanner = require("../../models/homeBanner.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Microdrama = require("../../models/microdrama.model");

const findContentItem = async (id) => {
  const [movie, series, microdrama] = await Promise.all([
    Movie.findById(id).lean(),
    Series.findById(id).lean(),
    Microdrama.findById(id).lean(),
  ]);

  if (movie) return { item: movie, contentType: "Movie" };
  if (series) return { item: series, contentType: "Series" };
  if (microdrama) return { item: microdrama, contentType: "Microdrama" };
  return null;
};

const populateHomeBanners = async (banners) => {
  if (!banners || banners.length === 0) return [];

  const list = Array.isArray(banners) ? banners : [banners];
  const contentIds = list.map((b) => b.contentId?._id || b.contentId).filter(Boolean);

  const [movies, series, microdramas] = await Promise.all([
    Movie.find({ _id: { $in: contentIds } }).lean(),
    Series.find({ _id: { $in: contentIds } }).lean(),
    Microdrama.find({ _id: { $in: contentIds } }).lean(),
  ]);

  const contentMap = {};
  movies.forEach((m) => (contentMap[m._id.toString()] = { ...m, type: "movie", modelName: "Movie" }));
  series.forEach((s) => (contentMap[s._id.toString()] = { ...s, type: "series", modelName: "Series" }));
  microdramas.forEach((md) => (contentMap[md._id.toString()] = { ...md, type: "microdrama", modelName: "Microdrama" }));

  const validBanners = [];

  for (const b of list) {
    const rawId = (b.contentId?._id || b.contentId)?.toString();
    const foundContent = contentMap[rawId];

    if (!foundContent) {
      // Clean up orphaned banner record asynchronously if content was deleted
      HomeBanner.findByIdAndDelete(b._id).catch(() => {});
      continue;
    }

    const doc = b.toObject ? b.toObject() : { ...b };
    doc.contentId = foundContent;

    // Auto-migrate missing contentType field in MongoDB
    if (!b.contentType) {
      HomeBanner.findByIdAndUpdate(b._id, { contentType: foundContent.modelName }).catch(() => {});
    }

    validBanners.push(doc);
  }

  return Array.isArray(banners) ? validBanners : validBanners[0] || null;
};

exports.createHomeBanners = async (req, res) => {
  try {
    const { contentIds } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "contentIds must be a non-empty array",
      });
    }

    const uniqueContentIds = [...new Set(contentIds)];

    const foundContents = await Promise.all(
      uniqueContentIds.map((id) => findContentItem(id))
    );

    const validContents = foundContents.filter(Boolean);

    if (validContents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "None of the selected content items were found",
      });
    }

    const lastBanner = await HomeBanner.findOne().sort({ order: -1 }).select("order");
    let nextOrder = lastBanner ? lastBanner.order + 1 : 1;

    const bannerDocs = [];

    for (const c of validContents) {
      const existing = await HomeBanner.findOne({ contentId: c.item._id });
      if (existing) {
        existing.isActive = true;
        existing.contentType = c.contentType;
        await existing.save();
        bannerDocs.push(existing);
      } else {
        const created = await HomeBanner.create({
          contentId: c.item._id,
          contentType: c.contentType,
          order: nextOrder++,
          isActive: true,
        });
        bannerDocs.push(created);
      }
    }

    const result = await populateHomeBanners(bannerDocs);

    return res.status(200).json({
      success: true,
      message: `${result.length} home banner(s) added successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Create home banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create home banners",
      error: error.message,
    });
  }
};

exports.getAllHomeBanners = async (req, res) => {
  try {
    const rawBanners = await HomeBanner.find().sort({
      order: 1,
      createdAt: 1,
    });

    const banners = await populateHomeBanners(rawBanners);

    return res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    console.error("Get home banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get home banners",
      error: error.message,
    });
  }
};

exports.getHomeBannerById = async (req, res) => {
  try {
    const rawBanner = await HomeBanner.findById(req.params.id);

    if (!rawBanner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    const banner = await populateHomeBanners(rawBanner);

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error("Get home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get home banner",
      error: error.message,
    });
  }
};

exports.updateHomeBanner = async (req, res) => {
  try {
    const { contentId, order, isActive } = req.body;

    const banner = await HomeBanner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    if (contentId !== undefined) {
      const found = await findContentItem(contentId);

      if (!found) {
        return res.status(404).json({
          success: false,
          message: "Content not found",
        });
      }

      const alreadyUsed = await HomeBanner.findOne({
        contentId,
        _id: { $ne: banner._id },
      });

      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: "This content is already used in another home banner",
        });
      }

      banner.contentId = contentId;
      banner.contentType = found.contentType;
    }

    if (order !== undefined) {
      banner.order = order;
    }

    if (isActive !== undefined) {
      banner.isActive = isActive;
    }

    await banner.save();

    const updatedBanner = await populateHomeBanners(banner);

    return res.status(200).json({
      success: true,
      message: "Home banner updated successfully",
      data: updatedBanner,
    });
  } catch (error) {
    console.error("Update home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update home banner",
      error: error.message,
    });
  }
};

exports.updateHomeBannerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const banner = await HomeBanner.findByIdAndUpdate(
      req.params.id,
      {
        isActive,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    const updatedBanner = await populateHomeBanners(banner);

    return res.status(200).json({
      success: true,
      message: `Home banner ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedBanner,
    });
  } catch (error) {
    console.error("Status update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update home banner status",
      error: error.message,
    });
  }
};

exports.deleteHomeBanner = async (req, res) => {
  try {
    const banner = await HomeBanner.findByIdAndDelete(
      req.params.id
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Home banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete home banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete home banner",
      error: error.message,
    });
  }
};

exports.reorderHomeBanners = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items must be an array",
      });
    }

    await Promise.all(
      items.map((item) =>
        HomeBanner.findByIdAndUpdate(
          item.id,
          {
            order: item.order,
          },
          {
            runValidators: true,
          }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: "Home banner order updated successfully",
    });
  } catch (error) {
    console.error("Reorder error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reorder home banners",
      error: error.message,
    });
  }
};