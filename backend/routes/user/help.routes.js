const express = require("express");

const router = express.Router();

const {getPublishedHelp,getHelpByCategory, getAllHelp, getSupportNumber, getSupportEmail} = require("../../controllers/help.controller");


// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
router.get("/",getPublishedHelp);


// ========================================
// GET SUPPORT CONTACT DETAILS
// ========================================
router.get("/support/number", getSupportNumber);
router.get("/support/email", getSupportEmail);


// ========================================
// GET HELP BY CATEGORY
// ========================================
router.get("/:category",getHelpByCategory);


module.exports = router;