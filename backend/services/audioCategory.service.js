const AudioCategory = require("../models/audioCategory.model");

const createCategory = async (data) => {
  const inputPriority = data.priority !== undefined ? Number(data.priority) : 0;
  let finalPriority = 0;

  if (inputPriority > 0) {
    await AudioCategory.updateMany(
      { priority: { $gte: inputPriority } },
      { $inc: { priority: 1 } }
    );
    finalPriority = inputPriority;
  } else {
    const maxCat = await AudioCategory.findOne().sort("-priority");
    finalPriority = maxCat && maxCat.priority ? maxCat.priority + 1 : 1;
  }

  data.priority = finalPriority;
  return await AudioCategory.create(data);
};

const getCategories = async (filter = {}) => {
  return await AudioCategory.find(filter).sort({ priority: 1, createdAt: -1 });
};

const getCategoryById = async (id) => {
  return await AudioCategory.findById(id);
};

const updateCategory = async (id, data) => {
  const existing = await AudioCategory.findById(id);
  if (!existing) return null;

  if (data.priority !== undefined) {
    const newPriority = Number(data.priority) || 0;
    const oldPriority = existing.priority || 0;

    if (newPriority !== oldPriority) {
      if (oldPriority > 0) {
        await AudioCategory.updateMany(
          { _id: { $ne: existing._id }, priority: { $gt: oldPriority } },
          { $inc: { priority: -1 } }
        );
      }
      if (newPriority > 0) {
        await AudioCategory.updateMany(
          { _id: { $ne: existing._id }, priority: { $gte: newPriority } },
          { $inc: { priority: 1 } }
        );
        data.priority = newPriority;
      } else {
        data.priority = 0;
      }
    }
  }

  return await AudioCategory.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
};

const deleteCategory = async (id) => {
  const existing = await AudioCategory.findById(id);
  if (!existing) return null;

  const targetPriority = existing.priority || 0;
  await AudioCategory.findByIdAndDelete(id);

  if (targetPriority > 0) {
    await AudioCategory.updateMany(
      { priority: { $gt: targetPriority } },
      { $inc: { priority: -1 } }
    );
  }
  return existing;
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
