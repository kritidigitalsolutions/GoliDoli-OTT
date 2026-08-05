// const mongoose = require("mongoose");

// const subscriptionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },
//   plan: String,
//   status: String, // active, cancelled, expired
//   subscriptionId: String,
//   startDate: Date,
//   endDate: Date,
// }, { timestamps: true });

// module.exports = mongoose.model("Subscription", subscriptionSchema);

const mongoose = require("mongoose");

const subscriptionSchema =
  new mongoose.Schema(
    {
      // ========================================
      // USER
      // ========================================

      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      // ========================================
      // PLAN
      // ========================================

      plan: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Plan",

        required: true,
      },

      // ========================================
      // STATUS
      // ========================================

      status: {
        type: String,

        enum: [
          "active",
          "cancelled",
          "expired",
        ],

        default: "active",

        index: true,
      },

      // ========================================
      // RAZORPAY ORDER ID
      // ========================================

      subscriptionId: {
        type: String,

        default: null,

        trim: true,
      },

      // ========================================
      // PAYMENT ID
      // ========================================

      paymentId: {
        type: String,

        unique: true,

        sparse: true,

        trim: true,
      },

      // ========================================
      // AMOUNT
      // ========================================

      amount: {
        type: Number,

        default: 0,

        min: 0,
      },

      // ========================================
      // CURRENCY
      // ========================================

      currency: {
        type: String,

        default: "INR",

        uppercase: true,

        trim: true,
      },

      // ========================================
      // PROMO / VOUCHER CODES USED
      // ========================================

      promoCode: {
        type: String,
        default: null,
        trim: true,
      },

      voucherCode: {
        type: String,
        default: null,
        trim: true,
      },

      // ========================================
      // START DATE
      // ========================================

      startDate: {
        type: Date,

        required: true,

        index: true,
      },

      // ========================================
      // END DATE
      // ========================================

      endDate: {
        type: Date,

        required: true,

        index: true,
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// COMPOUND INDEXES
// ========================================

// user + status lookup
subscriptionSchema.index({
  user: 1,
  status: 1,
});

// active expiry scans
subscriptionSchema.index({
  status: 1,
  endDate: 1,
});

// admin analytics
subscriptionSchema.index({
  createdAt: -1,
});


// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);