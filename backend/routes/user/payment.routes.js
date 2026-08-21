const express = require("express");
const router = express.Router();
const path = require("path");

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  createOrder,
  verifyPayment
} = require("../../controllers/payment.controller");

router.get("/test-page", (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/payment_test.html"));
});

router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);

module.exports = router;