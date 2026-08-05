const Plan = require("../models/plan.model");

// GET ACTIVE PLANS
exports.getPlans = async (req, res) => {
  try {
    const requestedPlanType = req.params.planType;
    const allowedPlanTypes = ["monthly", "yearly"];

    if (requestedPlanType && !allowedPlanTypes.includes(requestedPlanType)) {
      return res.status(400).json({
        success: false,
        message: "Plan type must be monthly or yearly",
      });
    }

    const plans = await Plan.find({
      isActive: true,
      planType: requestedPlanType || { $in: allowedPlanTypes },
    })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      planType: requestedPlanType || "all",
      count: plans.length,
      plans,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
