const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin,
} = require(
  "../../middlewares/admin.middleware"
);

const {
  addMicrodrama,
  getAllMicrodramas,
  getMicrodramaById,
  updateMicrodrama,
  deleteMicrodrama,
  searchMicrodramas,
} = require(
  "../../controllers/admin/microdrama.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const showUpload =
  upload.fields([
    {
      name: "poster",
      maxCount: 1,
    },
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "trailer",
      maxCount: 1,
    },

    {
      name: "castImage_0",
      maxCount: 1,
    },
    {
      name: "castImage_1",
      maxCount: 1,
    },
    {
      name: "castImage_2",
      maxCount: 1,
    },
    {
      name: "castImage_3",
      maxCount: 1,
    },
    {
      name: "castImage_4",
      maxCount: 1,
    },
  ]);


// ========================================
// ROUTES
// ========================================

// ADD
router.post(
  "/add",
  isAdmin,
  showUpload,
  addMicrodrama
);


// GET ALL
router.get(
  "/",isAdmin,
  getAllMicrodramas
);


// SEARCH
router.get(
  "/search",isAdmin,
  searchMicrodramas
);


// GET SINGLE
router.get(
  "/:id",isAdmin,
  getMicrodramaById
);


// UPDATE
router.patch(
  "/:id",
  isAdmin,
  showUpload,
  updateMicrodrama
);


// DELETE
router.delete(
  "/:id",
  isAdmin,
  deleteMicrodrama
);

module.exports = router;
