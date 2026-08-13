const express = require("express");

const router = express.Router();

const {
  getActiveHomeBanners,
} = require("../../controllers/homeBanner.controller");

router.get(
  "/",
  getActiveHomeBanners
);

module.exports = router;