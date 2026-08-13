const express = require("express");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  createIntroScreen,
  getAllIntroScreens,
  getIntroScreenById,
  updateIntroScreen,
  deleteIntroScreen,
  reorderIntroScreens,
} = require("../../controllers/admin/introScreen.controller");


// ======================================================
// INTRO SCREEN ADMIN ROUTES
// ======================================================

// CREATE
router.post(
  "/",
  isAdmin,
  createIntroScreen
);

// GET ALL
router.get(
  "/",
  isAdmin,
  getAllIntroScreens
);

// IMPORTANT:
// Keep /reorder BEFORE /:id routes
router.patch(
  "/reorder",
  isAdmin,
  reorderIntroScreens
);

// GET BY ID
router.get(
  "/:id",
  isAdmin,
  getIntroScreenById
);

// UPDATE
router.put(
  "/:id",
  isAdmin,
  updateIntroScreen
);

// DELETE
router.delete(
  "/:id",
  isAdmin,
  deleteIntroScreen
);

module.exports = router;