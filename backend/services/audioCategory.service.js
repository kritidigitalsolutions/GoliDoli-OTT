const AudioCategory = require("../models/audioCategory.model");

const createCategory = async (data) => {
  return await AudioCategory.create(data);
};

const getCategories = async (filter = {}) => {
  return await AudioCategory.find(filter).sort({ priority: -1, createdAt: -1 });
};

const getCategoryById = async (id) => {
  return await AudioCategory.findById(id);
};

const updateCategory = async (id, data) => {
  return await AudioCategory.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
};

const deleteCategory = async (id) => {
  return await AudioCategory.findByIdAndDelete(id);
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
