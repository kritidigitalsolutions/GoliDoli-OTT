const express = require("express");

const router = express.Router();

const {
  createHomeBanners,
  getAllHomeBanners,
  getHomeBannerById,
  updateHomeBanner,
  updateHomeBannerStatus,
  deleteHomeBanner,
  reorderHomeBanners,
} = require("../../controllers/admin/homeBanner.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");


// CREATE MULTIPLE
router.post(
  "/",
  isAdmin,
  createHomeBanners
);


// GET ALL
router.get(
  "/",
  isAdmin,
  getAllHomeBanners
);


// REORDER
router.patch(
  "/reorder",
  isAdmin,
  reorderHomeBanners
);


// GET ONE
router.get(
  "/:id",
  isAdmin,
  getHomeBannerById
);


// UPDATE
router.put(
  "/:id",
  isAdmin,
  updateHomeBanner
);


// ACTIVE / INACTIVE
router.patch(
  "/:id/status",
  isAdmin,
  updateHomeBannerStatus
);


// DELETE
router.delete(
  "/:id",
  isAdmin,
  deleteHomeBanner
);


module.exports = router;