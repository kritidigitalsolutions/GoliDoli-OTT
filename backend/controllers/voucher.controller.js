const Voucher = require("../models/voucher.model");

const Subscription = require(
  "../models/subscription.model"
);

const {
  expireSubscriptionIfNeeded,
} = require(
  "../utils/subscription.helper"
);


// =====================================================
// REDEEM VOUCHER
// =====================================================
exports.redeemVoucher = async (
  req,
  res
) => {
  try {

    const userId = req.user.id;

    const { code } = req.body;

    // ========================================
    // GET VOUCHER
    // ========================================

    const voucher =
      await Voucher.findOne({
        code: code.toUpperCase(),
      }).populate("plan");

    if (!voucher) {
      return res.status(400).json({
        success: false,
        message: "Invalid voucher",
      });
    }

    // already used
    if (voucher.isUsed) {
      return res.status(400).json({
        success: false,
        message: "Already used",
      });
    }

    // voucher expired
    if (
      voucher.expiryDate &&
      voucher.expiryDate < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Voucher expired",
      });
    }

    // check if plan associated with voucher exists
    if (!voucher.plan) {
      return res.status(400).json({
        success: false,
        message: "Plan associated with this voucher does not exist",
      });
    }

    // ========================================
    // CHECK EXISTING SUBSCRIPTION
    // ========================================

    let existing =
      await Subscription.findOne({
        user: userId,
        status: "active",
      });

    existing =
      await expireSubscriptionIfNeeded(
        existing
      );

    if (
      existing &&
      existing.status === "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription",
      });
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setUTCDate(
      endDate.getUTCDate() +
        voucher.validityDays
    );

    const subscription =
      await Subscription.create({
        user: userId,

        plan: voucher.plan._id,

        amount: 0,

        voucherCode: voucher.code,

        startDate,
        endDate,

        status: "active",
      });

    // ========================================
    // UPDATE VOUCHER
    // ========================================

    voucher.isUsed = true;

    voucher.usedBy = userId;

    await voucher.save();

    res.status(200).json({
      success: true,
      message:
        "Voucher applied successfully",
      subscription,
    });

  } catch (err) {

    console.error(
      "Redeem Voucher Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};