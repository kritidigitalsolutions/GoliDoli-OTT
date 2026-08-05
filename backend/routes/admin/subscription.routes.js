const express = require("express");
const router = express.Router();

const {
  getRevenue,
  getSubscriptionStats,
  getIncomeStats,
  getAllSubscriptions,
  extendSubscription,
  cancelSubscriptionAdmin,
  deleteSubscriptionAdmin,
} = require("../../controllers/admin/subscription.controller"); 
const { isAdmin } = require("../../middlewares/admin.middleware");

router.get("/revenue", isAdmin, getRevenue);
router.get("/stats", isAdmin, getSubscriptionStats);
router.get("/income-stats", isAdmin, getIncomeStats);
router.get("/all", isAdmin, getAllSubscriptions);
router.patch("/:id/extend", isAdmin, extendSubscription);
router.patch("/:id/cancel", isAdmin, cancelSubscriptionAdmin);
router.delete("/:id", isAdmin, deleteSubscriptionAdmin);

module.exports = router;
