const mongoose = require("mongoose");
const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Microdrama = require("../../models/microdrama.model");

const contentProjection = "-videoUrl -trailerUrl -__v";

const getPagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  return {
    page: Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0,
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10,
  };
};

const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.json({ success: true, category });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

const getContentByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit } = getPagination(req.query);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    const category = await Category.findOne({ _id: id, isActive: true }).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const categoryKey = category.name.toLowerCase();
    const filter = { category: categoryKey, isPublished: true };
    const [movies, series, microdramas] = await Promise.all([
      Movie.find(filter).select(contentProjection).lean(),
      Series.find(filter).select(contentProjection).lean(),
      Microdrama.find(filter).select(contentProjection).lean(),
    ]);

    const allContent = [
      ...movies.map((item) => ({ ...item, type: "movie" })),
      ...series.map((item) => ({ ...item, type: "series" })),
      ...microdramas.map((item) => ({ ...item, type: "microdrama" })),
    ].sort((a, b) =>
      (b.priority || 0) - (a.priority || 0) || new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = allContent.length;
    const pages = Math.ceil(total / limit);
    const content = allContent.slice(page * limit, (page + 1) * limit);

    return res.json({
      success: true,
      category,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page + 1 < pages,
        hasPreviousPage: page > 0,
      },
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category content",
    });
  }
};

module.exports = {
  getActiveCategories,
  getCategoryBySlug,
  getContentByCategory,
};
