const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { validateAudioCategory } = require("../../validators/audio.validator");
const {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../../controllers/admin/audioCategory.controller");

router.use(isAdmin);

router.post("/", validateAudioCategory, addCategory);
router.get("/", getCategories);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
