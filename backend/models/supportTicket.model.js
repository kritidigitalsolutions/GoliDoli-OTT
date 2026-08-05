const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    // ========================================
    // USER
    // ========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ========================================
    // SUBJECT
    // ========================================
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================
    // CATEGORY
    // ========================================
    category: {
      type: String,
      enum: [
        "PAYMENT",
        "TECHNICAL",
        "SUBSCRIPTION",
        "ACCOUNT",
        "OTHER",
        "BILLING",
        "CONTENT",
      ],
      default: "OTHER",
    },

    // ========================================
    // PRIORITY
    // ========================================
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    // ========================================
    // STATUS
    // ========================================
    status: {
      type: String,
      enum: [
        "OPEN",
        "PENDING",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
    },

    // ========================================
    // LAST MESSAGE PREVIEW
    // ========================================
    lastMessage: {
      type: String,
      default: "",
    },

    // ========================================
    // OPTIONAL UNREAD COUNTS
    // ========================================
    unreadByUser: {
      type: Number,
      default: 0,
    },

    unreadByAdmin: {
      type: Number,
      default: 0,
    },

    // ========================================
    // ATTACHMENTS
    // ========================================
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


// ========================================
// INDEXES
// ========================================
supportTicketSchema.index({
  user: 1,
  updatedAt: -1,
});

supportTicketSchema.index({
  status: 1,
});

module.exports = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);
