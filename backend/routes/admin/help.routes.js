const express = require("express");
const router = express.Router();


const {isAdmin }= require("../../middlewares/admin.middleware");

const {
  addHelp,
  getAllHelp,
  updateHelp,
  deleteHelp,
  toggleHelp,
  getSupport,
  addSupport,
  updateSupport,
  deleteSupport,
  toggleSupport
} = require("../../controllers/admin/help.controller");

router.use(isAdmin);

// ========================================
// SUPPORT DETAILS MANAGEMENT (ADMIN)
// ========================================
router.get("/support", getSupport);
router.post("/support", addSupport);
router.put("/support", updateSupport);
router.delete("/support", deleteSupport);
router.patch("/support/toggle", toggleSupport);

// ========================================
// GENERAL HELP / FAQ MANAGEMENT (ADMIN)
// ========================================
router.post("/", addHelp);
router.get("/", getAllHelp);
router.patch("/:id", updateHelp);
router.put("/:id", updateHelp);
router.delete("/:id", deleteHelp);
router.patch("/:id/toggle", toggleHelp);

module.exports = router;