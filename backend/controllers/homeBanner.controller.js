const HomeBanner = require("../models/homeBanner.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Microdrama = require("../models/microdrama.model");

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

    if (!foundContent) continue;

    const doc = b.toObject ? b.toObject() : { ...b };
    doc.contentId = foundContent;
    validBanners.push(doc);
  }

  return Array.isArray(banners) ? validBanners : validBanners[0] || null;
};

exports.getActiveHomeBanners = async (req, res) => {
  try {
    const rawBanners = await HomeBanner.find({
      isActive: true,
    }).sort({
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
    console.error("Get active home banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get home banners",
      error: error.message,
    });
  }
};