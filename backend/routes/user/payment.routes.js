const express = require("express");
const router = express.Router();
const path = require("path");

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  initiatePayment,
  createOrder,
  handleSabPaisaWebhook,
  handleSabPaisaCallback,
  checkPaymentStatus,
  verifyPayment,
} = require("../../controllers/payment.controller");

// Payment Test Interface
router.get("/test-page", (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/payment_test.html"));
});

// Payment Initiation
router.post("/initiate", isAuth, initiatePayment);
router.post("/create-order", isAuth, createOrder);

// Dedicated SabPaisa PG 3.0 Webhook Endpoint
router.post("/webhook", handleSabPaisaWebhook);

// Preserved SabPaisa Callback Routes (Form-POST & Staging)
router.post("/sabpaisa-response", handleSabPaisaCallback);
router.get("/sabpaisa-response", handleSabPaisaCallback);

// Transaction Status & Enquiry
router.get("/status/:clientTxnId", isAuth, checkPaymentStatus);
router.get("/status", checkPaymentStatus);
router.post("/verify", isAuth, verifyPayment);

module.exports = router;