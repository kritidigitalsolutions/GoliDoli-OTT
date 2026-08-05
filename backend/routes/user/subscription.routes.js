const express = require("express");
const router = express.Router();

const {
  // createPlan, ❌ not used
  // createSubscription, ❌ not used
  verifySubscription,
  cancelSubscription,
  checkSubscription,
} = require("../../controllers/subscription.controller");

// ❌ COMMENTED (Razorpay)
// router.post("/create-plan", createPlan);
// router.post("/create-subscription", createSubscription);

// ✅ FAKE FLOW
const { isAuth } = require("../../middlewares/auth.middleware");

router.post("/subscribe", isAuth, verifySubscription);
router.get("/status", isAuth, checkSubscription);
router.delete("/cancel", isAuth, cancelSubscription);

module.exports = router;