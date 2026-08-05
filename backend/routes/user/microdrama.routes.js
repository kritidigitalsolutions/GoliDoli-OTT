const express = require("express");

const router = express.Router();


const {
  getAllMicrodramas,
  getMicrodramaById,
  searchMicrodramas,
} = require(
  "../../controllers/microdrama.controller"
);

// ========================================
// ROUTES
// ========================================


// GET ALL
router.get(
  "/",
  getAllMicrodramas
);


// SEARCH
router.get(
  "/search",
  searchMicrodramas
);


// GET SINGLE
router.get(
  "/:id",
  getMicrodramaById
);


module.exports = router;
