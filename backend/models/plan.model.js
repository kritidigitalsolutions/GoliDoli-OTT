const mongoose = require("mongoose");

const planSchema =
  new mongoose.Schema(
    {
      // ========================================
      // PLAN NAME
      // ========================================

      name: {
        type: String,

        required: true,

        trim: true,

        unique: true,
      },

      // ========================================
      // PRICE
      // ========================================

      price: {
        type: Number,

        required: true,

        min: 0,
      },

      // ========================================
      // DURATION (DAYS)
      // ========================================

      duration: {
        type: Number,

        required: true,

        min: 1,
      },

      // ========================================
      // FEATURES
      // ========================================

      features: [
        {
          type: String,

          trim: true,
        },
      ],

      // ========================================
      // ACTIVE STATUS
      // ========================================

      isActive: {
        type: Boolean,

        default: true,

        index: true,
      },

      // ========================================
      // OPTIONAL FUTURE SUPPORT
      // ========================================

      // Only billing cycles offered to subscribers.
      planType: {
        type: String,

        enum: [
          "monthly",
          "yearly",
        ],

        default: "monthly",
      },

      // display sorting
      sortOrder: {
        type: Number,

        default: 0,
      },

      // recommended badge
      isRecommended: {
        type: Boolean,

        default: false,
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEXES
// ========================================

planSchema.index({
  sortOrder: 1,
});


// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Plan",
  planSchema
);
