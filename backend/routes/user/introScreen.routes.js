const express = require("express");

const router = express.Router();

const {
  getActiveIntroScreens,
} = require("../../controllers/introScreen.controller");


// GET ACTIVE INTRO SCREENS
router.get(
  "/",
  getActiveIntroScreens
);

module.exports = router;