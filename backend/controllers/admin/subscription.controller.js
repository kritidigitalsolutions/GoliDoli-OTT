const mongoose = require("mongoose");
const Subscription = require("../../models/subscription.model");
const User = require("../../models/user.model");
const Payment = require("../../models/payment.model");


// =====================================================
// AUTO EXPIRE OLD SUBSCRIPTIONS
// =====================================================
const expireOldSubscriptions =
  async () => {

    await Subscription.updateMany(
      {
        status: "active",
        endDate: {
          $lt: new Date(),
        },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );
  };


// =====================================================
// 💰 GET TOTAL REVENUE
// =====================================================
exports.getRevenue = async (
  req,
  res
) => {
  try {

    // auto cleanup
    await expireOldSubscriptions();

    const subscriptions =
      await Subscription.find();

    // count paid subscriptions only
    const validSubs =
      subscriptions.filter(
        (sub) =>
          (sub.amount || 0) > 0
      );

    const totalRevenue =
      validSubs.reduce(
        (sum, sub) => {
          return (
            sum +
            (sub.amount || 0)
          );
        },
        0
      );

    res.status(200).json({
      success: true,
      revenue: totalRevenue,
    });

  } catch (err) {

    console.error(
      "Get Revenue Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// 📊 GET SUBSCRIPTION STATS
// =====================================================
exports.getSubscriptionStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const [
        totalUsers,
        activeSubscriptionUsers,
        expiredSubscriptionCount,
      ] = await Promise.all([
        User.countDocuments(),

        Subscription.distinct(
          "user",
          {
            status: "active",
            endDate: {
              $gte: now,
            },
          }
        ),

        Subscription.countDocuments({
          status: "expired",
        }),
      ]);

      const totalSubscribedUsers =
        activeSubscriptionUsers.length;

      const totalNotSubscribedUsers =
        Math.max(
          totalUsers -
            totalSubscribedUsers,
          0
        );

      res.status(200).json({
        success: true,

        data: {
          totalSubscribedUsers,

          totalNotSubscribedUsers,

          expirySubscriptionCount:
            expiredSubscriptionCount,
        },
      });

    } catch (err) {

      console.error(
        "Subscription Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 💵 GET INCOME STATS
// =====================================================
exports.getIncomeStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const startOfToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      const startOfTomorrow =
        new Date(startOfToday);

      startOfTomorrow.setDate(
        startOfTomorrow.getDate() + 1
      );

      const startOfYesterday =
        new Date(startOfToday);

      startOfYesterday.setDate(
        startOfYesterday.getDate() -
          1
      );

      const startOfWeek =
        new Date(startOfToday);

      const dayOfWeek =
        startOfToday.getDay();

      startOfWeek.setDate(
        startOfWeek.getDate() -
          dayOfWeek
      );

      const startOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const startOfYear =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      const sumAmount =
        async (match) => {

          const result =
            await Subscription.aggregate([
              {
                $match: match,
              },

              {
                $group: {
                  _id: null,

                  total: {
                    $sum: {
                      $ifNull: [
                        "$amount",
                        0,
                      ],
                    },
                  },
                  subsCount: { $sum: 1 },
                  users: { $addToSet: "$user" }
                },
              },
            ]);

          return {
            total: result[0]?.total || 0,
            subsCount: result[0]?.subsCount || 0,
            usersCount: result[0]?.users?.length || 0
          };
        };

      const baseMatch = {
        amount: { $gt: 0 },
      };

      const [
        todayIncome,
        yesterdayIncome,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        totalIncome,
      ] = await Promise.all([
        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfToday,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte:
              startOfYesterday,
            $lt: startOfToday,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfWeek,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfMonth,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfYear,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount(baseMatch),
      ]);

      res.status(200).json({
        success: true,

        data: {
          todayIncome,
          yesterdayIncome,
          weeklyIncome,
          monthlyIncome,
          yearlyIncome,
          totalIncome,
        },
      });

    } catch (err) {

      console.error(
        "Income Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 📋 GET ALL SUBSCRIPTIONS & PAYMENT TRANSACTIONS
// =====================================================
exports.getAllSubscriptions = async (req, res) => {
  try {
    // auto cleanup
    await expireOldSubscriptions();

    // 1. Fetch all Payment records populated with user, plan, and linked subscription
    const payments = await Payment.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .populate("subscription")
      .sort({ createdAt: -1 });

    // 2. Fetch all legacy Subscription records
    const subscriptions = await Subscription.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .sort({ createdAt: -1 });

    // Map subscriptions by transaction id / payment id for fast lookup
    const subByTxn = new Map();
    for (const s of subscriptions) {
      if (s.subscriptionId) subByTxn.set(String(s.subscriptionId), s);
      if (s.paymentId) subByTxn.set(String(s.paymentId), s);
      subByTxn.set(String(s._id), s);
    }

    const seenTxnIds = new Set();
    const formattedList = [];

    // Map all Payment records
    for (const p of payments) {
      if (p.clientTxnId) seenTxnIds.add(String(p.clientTxnId));
      if (p.paymentId) seenTxnIds.add(String(p.paymentId));

      const linkedSub = (p.subscription && p.subscription.startDate)
        ? p.subscription
        : (p.subscription ? subByTxn.get(String(p.subscription)) : null)
          || (p.clientTxnId ? subByTxn.get(String(p.clientTxnId)) : null)
          || (p.paymentId ? subByTxn.get(String(p.paymentId)) : null)
          || null;

      let displayStatus = p.status;
      if (p.status === "success") {
        displayStatus = linkedSub ? linkedSub.status : "active";
      }

      formattedList.push({
        _id: p._id,
        user: p.user,
        plan: p.plan,
        amount: p.amount,
        currency: p.currency || "INR",
        paymentGateway: p.paymentGateway || "SabPaisa",
        status: displayStatus,
        rawPaymentStatus: p.status,
        subscriptionId: p.clientTxnId,
        paymentId: p.paymentId || p.clientTxnId,
        clientTxnId: p.clientTxnId,
        merchantTxnId: p.merchantTxnId,
        startDate: linkedSub?.startDate || p.paidAt || p.createdAt,
        endDate: linkedSub?.endDate || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        isPaymentRecord: true,
      });
    }

    // Add legacy subscriptions that don't have a matching payment record
    for (const s of subscriptions) {
      const txn = s.subscriptionId || s.paymentId;
      if (!txn || !seenTxnIds.has(String(txn))) {
        formattedList.push({
          _id: s._id,
          user: s.user,
          plan: s.plan,
          amount: s.amount,
          currency: s.currency || "INR",
          paymentGateway: "SabPaisa",
          status: s.status,
          rawPaymentStatus: s.status === "active" ? "success" : s.status,
          subscriptionId: s.subscriptionId || s.paymentId,
          paymentId: s.paymentId || s.subscriptionId,
          clientTxnId: s.subscriptionId,
          merchantTxnId: s.subscriptionId,
          startDate: s.startDate,
          endDate: s.endDate,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          isPaymentRecord: false,
        });
      }
    }

    // Sort newest first
    formattedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      subscriptions: formattedList,
      total: formattedList.length,
    });
  } catch (error) {
    console.error("Get All Subscriptions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 💳 GET ALL PURE PAYMENT RECORDS (ADMIN)
// =====================================================
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email phone profileImage")
      .populate("plan")
      .populate("subscription")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
      total: payments.length,
    });
  } catch (err) {
    console.error("Get All Payments Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// ⏳ EXTEND SUBSCRIPTION (ADMIN)
// =====================================================
exports.extendSubscription = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || isNaN(days) || Number(days) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid days to extend is required",
      });
    }

    const targetId = req.params.id;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);

    let subscription = null;

    if (isValidObjectId) {
      subscription = await Subscription.findById(targetId);
      if (!subscription) {
        const payment = await Payment.findById(targetId);
        if (payment) {
          if (payment.subscription) {
            subscription = await Subscription.findById(payment.subscription);
          } else {
            subscription = await Subscription.findOne({
              $or: [
                { subscriptionId: payment.clientTxnId },
                { paymentId: payment.paymentId },
              ].filter(Boolean),
            });
          }
        }
      }
    }

    if (!subscription) {
      subscription = await Subscription.findOne({
        $or: [{ subscriptionId: targetId }, { paymentId: targetId }],
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription record not found",
      });
    }

    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
    const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
    baseDate.setDate(baseDate.getDate() + Number(days));

    subscription.endDate = baseDate;
    subscription.status = "active";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription extended successfully",
      subscription,
    });
  } catch (error) {
    console.error("Extend Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 🔁 CANCEL SUBSCRIPTION (ADMIN)
// =====================================================
exports.cancelSubscriptionAdmin = async (req, res) => {
  try {
    const targetId = req.params.id;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);

    let subscription = null;
    let payment = null;

    if (isValidObjectId) {
      subscription = await Subscription.findById(targetId);
      payment = await Payment.findById(targetId);

      if (payment && !subscription) {
        if (payment.subscription) {
          subscription = await Subscription.findById(payment.subscription);
        } else {
          subscription = await Subscription.findOne({
            $or: [
              { subscriptionId: payment.clientTxnId },
              { paymentId: payment.paymentId },
            ].filter(Boolean),
          });
        }
      }
    }

    if (!subscription && !payment) {
      payment = await Payment.findOne({
        $or: [{ clientTxnId: targetId }, { paymentId: targetId }],
      });
      if (payment && payment.subscription) {
        subscription = await Subscription.findById(payment.subscription);
      }
      if (!subscription) {
        subscription = await Subscription.findOne({
          $or: [{ subscriptionId: targetId }, { paymentId: targetId }],
        });
      }
    }

    if (!subscription && !payment) {
      return res.status(404).json({
        success: false,
        message: "Subscription record not found",
      });
    }

    if (subscription) {
      subscription.status = "cancelled";
      await subscription.save();
    }

    if (payment && !subscription) {
      payment.status = "failed";
      await payment.save();
    }

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    console.error("Cancel Subscription Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ❌ DELETE SUBSCRIPTION / PAYMENT RECORD (ADMIN)
// =====================================================
exports.deleteSubscriptionAdmin = async (req, res) => {
  try {
    const targetId = req.params.id;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(targetId);

    let deleted = false;

    if (isValidObjectId) {
      // 1. Check if ID exists in Payment collection
      const payment = await Payment.findById(targetId);
      if (payment) {
        // Also delete any linked subscription doc
        if (payment.subscription) {
          await Subscription.findByIdAndDelete(payment.subscription);
        }
        if (payment.clientTxnId || payment.paymentId) {
          await Subscription.deleteMany({
            $or: [
              { subscriptionId: payment.clientTxnId },
              { paymentId: payment.paymentId },
            ].filter(Boolean),
          });
        }
        await Payment.findByIdAndDelete(payment._id);
        deleted = true;
      }

      // 2. Check if ID exists in Subscription collection
      const subscription = await Subscription.findById(targetId);
      if (subscription) {
        // Also delete any linked payment doc
        await Payment.deleteMany({
          $or: [
            { subscription: subscription._id },
            ...(subscription.subscriptionId ? [{ clientTxnId: subscription.subscriptionId }] : []),
            ...(subscription.paymentId ? [{ paymentId: subscription.paymentId }] : []),
          ],
        });
        await Subscription.findByIdAndDelete(subscription._id);
        deleted = true;
      }
    }

    // 3. Fallback: try by transaction / payment string identifiers
    if (!deleted) {
      const payment = await Payment.findOne({
        $or: [{ clientTxnId: targetId }, { paymentId: targetId }],
      });
      if (payment) {
        if (payment.subscription) {
          await Subscription.findByIdAndDelete(payment.subscription);
        }
        await Payment.findByIdAndDelete(payment._id);
        deleted = true;
      }

      const subscription = await Subscription.findOne({
        $or: [{ subscriptionId: targetId }, { paymentId: targetId }],
      });
      if (subscription) {
        await Subscription.findByIdAndDelete(subscription._id);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Subscription record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Delete Subscription Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};