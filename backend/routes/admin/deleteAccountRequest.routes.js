const express = require("express");
const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllDeleteRequests,
  getSingleDeleteRequest,
  approveDeleteRequest,
  rejectDeleteRequest,
} = require("../../controllers/admin/deleteAccountRequest.controller");

// =====================================================
// ADMIN DELETE ACCOUNT REQUEST ROUTES
// All endpoints require verified ADMIN authorization
// =====================================================

// Get all requests (with pagination, search, status, date filters)
router.get("/", isAdmin, getAllDeleteRequests);

// Get single request details
router.get("/:id", isAdmin, getSingleDeleteRequest);

// Approve a request (executes account cascade deletion)
router.patch("/:id/approve", isAdmin, approveDeleteRequest);

// Reject a request (leaves user account active)
router.patch("/:id/reject", isAdmin, rejectDeleteRequest);

module.exports = router;
