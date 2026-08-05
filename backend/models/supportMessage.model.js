const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
    },

    senderType: {
      type: String,
      enum: ["USER", "ADMIN"],
      required: true,
    },

    // ========================================
    // DYNAMIC USER/ADMIN REFERENCE
    // ========================================
    senderModel: {
      type: String,
      enum: ["User", "Admin"],
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      required: true,
    },

    // ========================================
    // MESSAGE
    // ========================================
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================
    // OPTIONAL ATTACHMENTS
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

module.exports = mongoose.model(
  "SupportMessage",
  supportMessageSchema
);
