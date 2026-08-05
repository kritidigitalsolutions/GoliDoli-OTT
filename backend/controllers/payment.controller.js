const crypto = require("crypto");

const razorpay = require("../config/razorpay");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");


// =====================================================
// CREATE ORDER
// =====================================================
exports.createOrder = async (
  req,
  res
) => {
  try {

    const {
      planId,
      promoCode,
    } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId required",
      });
    }

    const plan =
      await Plan.findById(planId);

    if (
      !plan ||
      !plan.isActive
    ) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    let finalAmount = plan.price;

    let appliedPromo = null;

    // ========================================
    // APPLY PROMO
    // ========================================

    if (promoCode) {

      const promo =
        await Promo.findOne({
          code:
            promoCode.toUpperCase(),
          isActive: true,
        });

      if (!promo) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid promo code",
        });
      }

      // promo expired
      if (
        promo.expiryDate &&
        promo.expiryDate <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Promo expired",
        });
      }

      // promo limit
      if (
        promo.usedCount >=
        promo.maxUses
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo limit reached",
        });
      }

      // applicable plans
      if (
        promo.applicablePlans
          .length &&
        !promo.applicablePlans.some(
          (id) =>
            id.toString() ===
            planId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo not valid for this plan",
        });
      }

      let discount = 0;

      if (
        promo.discountType ===
        "percentage"
      ) {

        discount =
          (
            plan.price *
            promo.discountValue
          ) / 100;

      } else {

        discount =
          promo.discountValue;
      }

      finalAmount = Math.max(
        plan.price - discount,
        0
      );

      appliedPromo = promo.code;
    }

    // ========================================
    // RAZORPAY CONFIG
    // ========================================

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message:
          "Payment gateway not configured",
      });
    }

    // ========================================
    // CREATE ORDER
    // ========================================

    const order =
      await razorpay.orders.create({
        amount:
          finalAmount * 100,
        currency: "INR",
        receipt:
          "rcpt_" + Date.now(),

        notes: {
          planId,
          userId: req.user.id,
          promoCode:
            appliedPromo || "",
        },
      });

    res.status(200).json({
      success: true,
      key:
        process.env
          .RAZORPAY_KEY_ID,
      order,
      finalAmount,
    });

  } catch (err) {

    console.error(
      "Create Order Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// VERIFY PAYMENT
// =====================================================
exports.verifyPayment = async (
  req,
  res
) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required payment fields",
      });
    }

    // ========================================
    // VERIFY SIGNATURE
    // ========================================

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET
        )
        .update(body)
        .digest("hex");

    if (
      expectedSignature !==
      razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification failed",
      });
    }

    const userId = req.user.id;

    // ========================================
    // PREVENT DUPLICATE PAYMENT
    // ========================================

    const alreadyPaid =
      await Subscription.findOne({
        paymentId:
          razorpay_payment_id,
      });

    if (alreadyPaid) {
      return res.status(200).json({
        success: true,
        message:
          "Payment already processed",
        subscription:
          alreadyPaid,
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
      existing.status ===
        "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription",
      });
    }

    // ========================================
    // GET PLAN
    // ========================================

    const plan =
      await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // ========================================
    // RAZORPAY CHECK
    // ========================================

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message:
          "Payment gateway not configured",
      });
    }

    // ========================================
    // FETCH ORDER DETAILS
    // ========================================

    const orderDetails =
      await razorpay.orders.fetch(
        razorpay_order_id
      );

    let finalAmount =
      plan.price;

    const appliedCode =
      orderDetails.notes
        ?.promoCode || "";

    // ========================================
    // APPLY PROMO
    // ========================================

    let promoObj = null;

    if (appliedCode) {

      const promo =
        await Promo.findOne({
          code:
            appliedCode.toUpperCase(),
          isActive: true,
        });

      promoObj = promo;

      if (promo) {

        let discount = 0;

        if (
          promo.discountType ===
          "percentage"
        ) {

          discount =
            (
              plan.price *
              promo.discountValue
            ) / 100;

        } else {

          discount =
            promo.discountValue;
        }

        finalAmount = Math.max(
          plan.price - discount,
          0
        );

        promo.usedCount += 1;

        await promo.save();
      }
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
        plan.duration
    );

    const subscription =
      await Subscription.create({
        user: userId,
        plan: plan._id,
        status: "active",

        paymentId:
          razorpay_payment_id,

        subscriptionId:
          razorpay_order_id,

        amount: finalAmount,

        promoCode: promoObj ? promoObj.code : null,

        startDate,
        endDate,
      });

    res.status(200).json({
      success: true,
      message:
        "Payment verified",
      subscription,
    });

  } catch (err) {

    console.error(
      "Verify Payment Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};