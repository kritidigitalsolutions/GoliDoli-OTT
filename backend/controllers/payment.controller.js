const {
  SABPAISA_CONFIG,
  isConfigured,
  createPG3Payment,
  verifyWebhookSignature,
  encryptData,
  parseSabPaisaResponse,
  enquireTransaction,
  formatTransDate,
} = require("../config/sabpaisa");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const Payment = require("../models/payment.model");
const User = require("../models/user.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");

// =====================================================
// INITIATE PAYMENT / CREATE ORDER
// =====================================================
exports.initiatePayment = async (req, res) => {
  try {
    const { planId, promoCode, userName, userEmail, userContact } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "SabPaisa payment gateway is not configured",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Plan not found or inactive",
      });
    }

    let finalAmount = plan.price;
    let discount = 0;
    let appliedPromo = null;

    // ========================================
    // APPLY PROMO (VALIDATION ONLY)
    // ========================================
    const cleanPromo =
      promoCode && typeof promoCode === "string" ? promoCode.trim().toUpperCase() : null;

    if (cleanPromo) {
      const promo = await Promo.findOne({
        code: cleanPromo,
        isActive: true,
      });

      if (!promo) {
        return res.status(400).json({
          success: false,
          message: "Invalid promo code",
        });
      }

      if (promo.expiryDate && promo.expiryDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Promo expired",
        });
      }

      if (promo.usedCount >= promo.maxUses) {
        return res.status(400).json({
          success: false,
          message: "Promo limit reached",
        });
      }

      if (
        promo.applicablePlans &&
        promo.applicablePlans.length &&
        !promo.applicablePlans.some((id) => id.toString() === planId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Promo not valid for this plan",
        });
      }

      if (promo.discountType === "percentage") {
        discount = (plan.price * promo.discountValue) / 100;
      } else {
        discount = promo.discountValue;
      }

      finalAmount = Math.max(plan.price - discount, 0);
      appliedPromo = promo.code;
    }

    // ========================================
    // FETCH USER DETAILS
    // ========================================
    const userId = req.user.id;
    const user = await User.findById(userId);

    const payerName = userName || (user && (user.name || user.username)) || "OTT User";
    const payerEmail = userEmail || (user && user.email) || "user@golidoli.com";
    let payerMobile = userContact || (user && (user.phone || user.mobile)) || "9999999999";
    payerMobile = String(payerMobile).replace(/[^0-9]/g, "").slice(-10) || "9999999999";

    // Unique transaction ID
    const clientTxnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const transDate = formatTransDate(new Date());

    // Customer return URL (Frontend status page)
    const returnUrl = `${SABPAISA_CONFIG.returnUrl}?txnId=${encodeURIComponent(clientTxnId)}`;

    // ========================================
    // PG 3.0 REST API PAYMENT CREATION
    // ========================================
    if (SABPAISA_CONFIG.apiKey && SABPAISA_CONFIG.secretKey) {
      try {
        const pg3Data = await createPG3Payment({
          merchantTxnId: clientTxnId,
          amountInRupees: finalAmount,
          customerName: payerName.trim(),
          customerEmail: payerEmail.trim(),
          customerMobile: payerMobile,
          returnUrl: returnUrl,
          udf1: String(plan._id),
          udf2: String(userId),
          udf3: appliedPromo || "",
        });

        // 1. Validate that checkoutUrl exists
        if (!pg3Data || !pg3Data.checkoutUrl) {
          console.error("SabPaisa PG 3.0: Missing checkoutUrl in gateway response", {
            paymentId: pg3Data?.paymentId,
            status: pg3Data?.status,
          });
          return res.status(502).json({
            success: false,
            message: "Failed to obtain checkout URL from payment gateway",
          });
        }

        // 2. Validate that clientSecret exists
        if (!pg3Data.clientSecret) {
          console.error("SabPaisa PG 3.0: Missing clientSecret in gateway response", {
            paymentId: pg3Data.paymentId,
            hasCheckoutUrl: !!pg3Data.checkoutUrl,
            status: pg3Data.status,
          });
          return res.status(502).json({
            success: false,
            message: "Payment gateway response did not include client authorization secret",
          });
        }

        // 3. Append clientSecret to checkoutUrl using URL and searchParams.set()
        let finalCheckoutUrl;
        try {
          const parsedUrl = new URL(pg3Data.checkoutUrl);
          parsedUrl.searchParams.set("clientSecret", pg3Data.clientSecret);
          finalCheckoutUrl = parsedUrl.toString();
        } catch (urlErr) {
          const separator = pg3Data.checkoutUrl.includes("?") ? "&" : "?";
          finalCheckoutUrl = `${pg3Data.checkoutUrl}${separator}clientSecret=${encodeURIComponent(pg3Data.clientSecret)}`;
        }

        // Safe log (never expose clientSecret or complete sensitive checkout URL)
        console.log("✅ SabPaisa PG 3.0 Payment Created:", {
          paymentId: pg3Data.paymentId,
          clientTxnId: clientTxnId,
          hasFinalCheckoutUrl: !!finalCheckoutUrl,
        });

        // 4. Create Pending Payment record in MongoDB
        const paymentRecord = await Payment.create({
          user: userId,
          plan: plan._id,
          clientTxnId: clientTxnId,
          merchantTxnId: clientTxnId,
          paymentId: pg3Data.paymentId || null,
          amount: finalAmount,
          currency: "INR",
          paymentGateway: "SabPaisa",
          status: "pending",
          promoCode: appliedPromo || null,
          customerDetails: {
            name: payerName.trim(),
            email: payerEmail.trim(),
            phone: payerMobile,
          },
          gatewayResponse: {
            status: pg3Data.status,
            traceId: pg3Data.traceId,
          },
        });

        console.log("💾 SabPaisa Pending Payment Record Saved to MongoDB:", {
          paymentDbId: paymentRecord._id,
          clientTxnId: clientTxnId,
          amount: finalAmount,
          status: paymentRecord.status,
        });

        // 5. Return final URL in both paymentUrl and checkoutUrl (without exposing clientSecret as separate field)
        return res.status(200).json({
          success: true,
          paymentUrl: finalCheckoutUrl,
          checkoutUrl: finalCheckoutUrl,
          paymentId: pg3Data.paymentId,
          clientTxnId: clientTxnId,
          merchantTxnId: clientTxnId,
          clientCode: SABPAISA_CONFIG.merchantId,
          finalAmount: finalAmount,
          returnUrl: returnUrl,
          plan: {
            id: plan._id,
            name: plan.name,
            duration: plan.duration,
            price: plan.price,
          },
          appliedPromo: appliedPromo,
        });
      } catch (pg3Err) {
        console.error("SabPaisa PG 3.0 Error:", pg3Err.response?.data || pg3Err.message);
        return res.status(502).json({
          success: false,
          message:
            "Failed to initiate payment session with SabPaisa: " +
            (pg3Err.response?.data?.error?.message || pg3Err.response?.data?.message || pg3Err.message),
        });
      }
    }

    // ========================================
    // CLASSIC AES FALLBACK (When no API key)
    // ========================================
    const payload = {
      clientCode: SABPAISA_CONFIG.clientCode,
      transUserName: SABPAISA_CONFIG.transUserName,
      transUserPassword: SABPAISA_CONFIG.transUserPassword,
      payerName: payerName.trim(),
      payerEmail: payerEmail.trim(),
      payerMobile: payerMobile,
      clientTxnId: clientTxnId,
      amount: String(finalAmount),
      callbackUrl: SABPAISA_CONFIG.callbackUrl,
      returnUrl: returnUrl,
      channelId: SABPAISA_CONFIG.channelId,
      mcc: SABPAISA_CONFIG.mcc,
      transDate: transDate,
      amountType: "INR",
      udf1: String(plan._id),
      udf2: String(userId),
      udf3: appliedPromo || "",
      udf4: String(plan.price),
      udf5: String(discount),
    };

    const encData = encryptData(payload);

    // Save pending payment record for classic fallback too
    await Payment.create({
      user: userId,
      plan: plan._id,
      clientTxnId: clientTxnId,
      merchantTxnId: clientTxnId,
      amount: finalAmount,
      currency: "INR",
      paymentGateway: "SabPaisa",
      status: "pending",
      promoCode: appliedPromo || null,
      customerDetails: {
        name: payerName.trim(),
        email: payerEmail.trim(),
        phone: payerMobile,
      },
    });

    res.status(200).json({
      success: true,
      paymentUrl: SABPAISA_CONFIG.paymentUrl,
      clientCode: SABPAISA_CONFIG.clientCode,
      clientTxnId: clientTxnId,
      encData: encData,
      returnUrl: returnUrl,
      finalAmount: finalAmount,
      plan: {
        id: plan._id,
        name: plan.name,
        duration: plan.duration,
        price: plan.price,
      },
      appliedPromo: appliedPromo,
    });
  } catch (err) {
    console.error("Initiate Payment Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to initiate SabPaisa payment",
    });
  }
};

// Backward-compatible alias
exports.createOrder = exports.initiatePayment;

// =====================================================
// DEDICATED SABPAISA PG 3.0 WEBHOOK HANDLER
// =====================================================
exports.handleSabPaisaWebhook = async (req, res) => {
  try {
    const signature =
      req.headers["x-sabpaisa-signature"] ||
      req.headers["x-signature"] ||
      req.headers["signature"] ||
      req.body?.signature;

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    // ========================================
    // SIGNATURE VERIFICATION
    // ========================================
    const isSignatureValid = verifyWebhookSignature(rawBody, signature);

    if (!isSignatureValid) {
      console.warn("⚠️ SabPaisa Webhook: Invalid or missing HMAC-SHA256 signature.");
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const payload = req.body?.data || req.body?.payload || req.body;

    const clientTxnId = payload.clientTxnId || payload.orderId || payload.txnId;
    const sabpaisaTxnId = payload.sabpaisaTxnId || payload.paymentId || payload.bankTxnNo;
    const status = (payload.status || (payload.statusCode === "0000" ? "SUCCESS" : "FAILED")).toUpperCase();
    const statusCode = payload.statusCode || (status === "SUCCESS" ? "0000" : "0300");
    const amount = payload.paidAmount || payload.amount;
    const planId = payload.metadata?.planId || payload.udf1 || payload.planId;
    const userId = payload.metadata?.userId || payload.udf2 || payload.userId;
    const promoCode = payload.metadata?.promoCode || payload.udf3 || payload.promoCode;

    console.log(`✅ SabPaisa Webhook Verified: Txn=${clientTxnId}, Status=${status}, Code=${statusCode}`);

    if (!clientTxnId) {
      return res.status(400).json({
        success: false,
        message: "Missing clientTxnId in webhook payload",
      });
    }

    // ========================================
    // IDEMPOTENCY CHECK
    // ========================================
    const paymentIdentifier = sabpaisaTxnId || clientTxnId;

    const existingSub = await Subscription.findOne({
      $or: [
        { subscriptionId: clientTxnId },
        { paymentId: paymentIdentifier },
      ],
    });

    if (existingSub) {
      console.log(`Idempotent webhook hit for clientTxnId=${clientTxnId}. Subscription already active.`);
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
        subscriptionId: existingSub._id,
      });
    }

    // If transaction failed or pending
    if (status !== "SUCCESS" && statusCode !== "0000") {
      console.log(`Webhook acknowledged non-success event: Status=${status}, Code=${statusCode}`);
      return res.status(200).json({
        success: true,
        message: `Webhook received for ${status} transaction`,
        clientTxnId,
      });
    }

    // ========================================
    // ACTIVATE SUBSCRIPTION
    // ========================================
    if (!planId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing planId or userId in webhook metadata",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    let finalAmount = plan.price;
    let promoObj = null;

    if (promoCode) {
      const promo = await Promo.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
      });

      if (promo) {
        promoObj = promo;
        let discount = 0;
        if (promo.discountType === "percentage") {
          discount = (plan.price * promo.discountValue) / 100;
        } else {
          discount = promo.discountValue;
        }
        finalAmount = Math.max(plan.price - discount, 0);

        // Increment promo usage once
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

    const receivedAmount = parseFloat(amount);

    // Check existing active subscription and expire if needed
    let activeSub = await Subscription.findOne({
      user: userId,
      status: "active",
    });
    if (activeSub) {
      await expireSubscriptionIfNeeded(activeSub);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + plan.duration);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      status: "active",
      paymentId: paymentIdentifier,
      subscriptionId: clientTxnId,
      amount: !isNaN(receivedAmount) ? receivedAmount : finalAmount,
      promoCode: promoObj ? promoObj.code : null,
      startDate,
      endDate,
    });

    console.log(`🎉 Webhook activated subscription SubID=${subscription._id} for User=${userId}`);

    // Synchronize Payment record in MongoDB
    try {
      const paymentRec = await Payment.findOne({
        $or: [
          { clientTxnId },
          { merchantTxnId: clientTxnId },
          { paymentId: paymentIdentifier },
        ],
      });
      if (paymentRec) {
        paymentRec.status = "success";
        paymentRec.paidAt = new Date();
        paymentRec.paymentId = paymentIdentifier;
        paymentRec.subscription = subscription._id;
        paymentRec.gatewayResponse = payload;
        await paymentRec.save();
        console.log(`💾 Payment record ${paymentRec._id} synced to SUCCESS via webhook`);
      }
    } catch (paySyncErr) {
      console.warn("Payment record webhook sync warning:", paySyncErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Subscription activated successfully via webhook",
      subscriptionId: subscription._id,
    });
  } catch (err) {
    console.error("SabPaisa Webhook Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process SabPaisa webhook",
    });
  }
};

// =====================================================
// SABPAISA CALLBACK HANDLER (FORM REDIRECT / ENCDATA)
// =====================================================
exports.handleSabPaisaCallback = async (req, res) => {
  try {
    const encResponse =
      req.body?.encResponse ||
      req.query?.encResponse ||
      req.body?.encData ||
      req.query?.encData;

    if (!encResponse) {
      console.warn("SabPaisa callback received with missing encResponse");
      return res.status(400).json({
        success: false,
        message: "Encrypted response (encResponse) is missing",
      });
    }

    // ========================================
    // DECRYPT CALLBACK RESPONSE
    // ========================================
    let parsedData = {};
    try {
      parsedData = parseSabPaisaResponse(encResponse);
    } catch (decErr) {
      console.error("SabPaisa Decryption Error:", decErr);
      return res.status(400).json({
        success: false,
        message: "Failed to decrypt SabPaisa response: " + decErr.message,
      });
    }

    const {
      clientCode,
      clientTxnId,
      sabpaisaTxnId,
      bankTxnNo,
      statusCode,
      status,
      amount,
      paidAmount,
      udf1: planId,
      udf2: userId,
      udf3: promoCode,
    } = parsedData;

    console.log(`SabPaisa Callback: Txn=${clientTxnId}, Status=${status}, Code=${statusCode}`);

    // Verify Client Code
    if (clientCode && clientCode !== SABPAISA_CONFIG.clientCode) {
      console.error(`Invalid clientCode received in callback: ${clientCode}`);
      return res.status(400).json({
        success: false,
        message: "Client code mismatch in payment callback",
      });
    }

    const isSuccess =
      statusCode === "0000" ||
      (status && status.toUpperCase() === "SUCCESS");

    // ========================================
    // NON-SUCCESSFUL TRANSACTIONS
    // ========================================
    if (!isSuccess) {
      const isHtmlRequest =
        req.headers.accept && req.headers.accept.includes("text/html");

      if (isHtmlRequest) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Payment Failed - GoliDoli OTT</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
            <div style="background: #1e293b; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; border: 1px solid #334155;">
              <h2 style="color: #ef4444; margin-top: 0;">Payment ${status || "Failed"}</h2>
              <p style="color: #94a3b8;">Transaction ID: <strong>${clientTxnId || "N/A"}</strong></p>
              <p style="color: #94a3b8;">Status Code: <strong>${statusCode || "N/A"}</strong></p>
              <p style="color: #cbd5e1; margin-top: 20px;">The payment was not completed. Please try again.</p>
              <a href="/api/payment/test-page" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #f97316; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Return to App</a>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(200).json({
        success: false,
        status: status || "FAILED",
        statusCode: statusCode,
        message: `Payment not successful: ${status || "Failed"} (${statusCode || "Unknown"})`,
        clientTxnId,
      });
    }

    // ========================================
    // IDEMPOTENCY CHECK
    // ========================================
    const paymentIdentifier = sabpaisaTxnId || bankTxnNo || clientTxnId;

    let existingSub = await Subscription.findOne({
      $or: [
        { subscriptionId: clientTxnId },
        { paymentId: paymentIdentifier },
      ],
    });

    if (existingSub) {
      console.log(`Idempotent callback hit for clientTxnId=${clientTxnId}. Subscription already active.`);
      const isHtmlRequest =
        req.headers.accept && req.headers.accept.includes("text/html");

      if (isHtmlRequest) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Payment Successful - GoliDoli OTT</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
            <div style="background: #1e293b; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; border: 1px solid #334155;">
              <h2 style="color: #10b981; margin-top: 0;">🎉 Payment Verified!</h2>
              <p style="color: #94a3b8;">Transaction ID: <strong>${clientTxnId}</strong></p>
              <p style="color: #cbd5e1; margin-top: 15px;">Your subscription is already active.</p>
              <a href="/api/payment/test-page" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #10b981; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Continue to OTT</a>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        subscription: existingSub,
      });
    }

    // ========================================
    // VALIDATE PLAN & USER
    // ========================================
    if (!planId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing planId or userId in callback parameters",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan associated with payment not found",
      });
    }

    // ========================================
    // VERIFY AMOUNT & APPLY PROMO IDEMPOTENTLY
    // ========================================
    let finalAmount = plan.price;
    let promoObj = null;

    if (promoCode) {
      const promo = await Promo.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
      });

      if (promo) {
        promoObj = promo;
        let discount = 0;
        if (promo.discountType === "percentage") {
          discount = (plan.price * promo.discountValue) / 100;
        } else {
          discount = promo.discountValue;
        }
        finalAmount = Math.max(plan.price - discount, 0);

        // Increment promo usage once
        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save();
      }
    }

    const receivedAmount = parseFloat(paidAmount || amount);
    if (!isNaN(receivedAmount) && Math.abs(receivedAmount - finalAmount) > 0.01) {
      console.warn(`Amount mismatch: expected ${finalAmount}, received ${receivedAmount}`);
    }

    // Check existing active subscription and expire if needed
    let activeSub = await Subscription.findOne({
      user: userId,
      status: "active",
    });
    if (activeSub) {
      await expireSubscriptionIfNeeded(activeSub);
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================
    const startDate = new Date();
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + plan.duration);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      status: "active",
      paymentId: paymentIdentifier,
      subscriptionId: clientTxnId,
      amount: !isNaN(receivedAmount) ? receivedAmount : finalAmount,
      promoCode: promoObj ? promoObj.code : null,
      startDate,
      endDate,
    });

    console.log(`✅ Subscription created successfully: SubID=${subscription._id} for User=${userId}`);

    const isHtmlRequest =
      req.headers.accept && req.headers.accept.includes("text/html");

    if (isHtmlRequest) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Payment Successful - GoliDoli OTT</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
          <div style="background: #1e293b; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; border: 1px solid #334155;">
            <h2 style="color: #10b981; margin-top: 0;">🎉 Subscription Activated!</h2>
            <p style="color: #94a3b8;">Transaction ID: <strong>${clientTxnId}</strong></p>
            <p style="color: #94a3b8;">Plan: <strong>${plan.name}</strong></p>
            <p style="color: #cbd5e1; margin-top: 15px;">Valid until: <strong>${new Date(subscription.endDate).toLocaleDateString()}</strong></p>
            <a href="/api/payment/test-page" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #10b981; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      subscription,
    });
  } catch (err) {
    console.error("Handle SabPaisa Callback Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process SabPaisa callback",
    });
  }
};

// =====================================================
// CHECK PAYMENT STATUS & ENQUIRY API (VERIFY)
// =====================================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const clientTxnId =
      req.body?.clientTxnId ||
      req.params?.clientTxnId ||
      req.query?.clientTxnId ||
      req.query?.txnId ||
      req.body?.merchantTxnId;

    if (!clientTxnId) {
      return res.status(400).json({
        success: false,
        message: "clientTxnId is required",
      });
    }

    const currentUserId = req.user ? req.user.id : null;

    // 1. Check existing Payment record in MongoDB
    let payment = await Payment.findOne({
      $or: [
        { clientTxnId },
        { merchantTxnId: clientTxnId },
        { paymentId: clientTxnId },
      ],
    }).populate("plan");

    // 2. Authorization check if user is authenticated
    if (
      currentUserId &&
      payment &&
      payment.user.toString() !== currentUserId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this transaction status",
      });
    }

    // 3. Check existing subscription in MongoDB
    let subscription = await Subscription.findOne({
      $or: [
        { subscriptionId: clientTxnId },
        { paymentId: clientTxnId },
        { paymentId: payment?.paymentId },
        { _id: payment?.subscription },
      ],
    }).populate("plan");

    if (
      currentUserId &&
      subscription &&
      subscription.user.toString() !== currentUserId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this transaction status",
      });
    }

    // 4. Idempotency Check: if already active/success
    if (
      (payment && payment.status === "success") ||
      (subscription && subscription.status === "active")
    ) {
      if (payment && !payment.subscription && subscription) {
        payment.subscription = subscription._id;
        await payment.save();
      }
      return res.status(200).json({
        success: true,
        status: "SUCCESS",
        statusCode: "0000",
        message: "Payment is already completed and subscription is active",
        payment,
        subscription,
      });
    }

    // 5. Call SabPaisa Enquiry API for live gateway status
    let enquiryResult = null;
    try {
      enquiryResult = await enquireTransaction(clientTxnId);
      console.log("SabPaisa Live Enquiry result for txn:", {
        clientTxnId,
        status: enquiryResult?.status,
        statusCode: enquiryResult?.statusCode,
      });
    } catch (enqErr) {
      console.warn("SabPaisa Enquiry API Call Warning:", enqErr.message);
    }

    if (enquiryResult) {
      const statusCode = enquiryResult.statusCode;
      const rawStatus = enquiryResult.status;
      const isGatewaySuccess =
        statusCode === "0000" ||
        (typeof rawStatus === "string" && rawStatus.toUpperCase() === "SUCCESS");

      const isGatewayFailed =
        statusCode === "0300" ||
        statusCode === "0100" ||
        (typeof rawStatus === "string" &&
          ["FAILED", "FAILURE", "ABORTED", "CANCELLED"].includes(rawStatus.toUpperCase()));

      const planId =
        payment?.plan?._id ||
        payment?.plan ||
        enquiryResult.udfData?.udf1 ||
        enquiryResult.udf1 ||
        enquiryResult.metadata?.planId;

      const targetUserId =
        payment?.user ||
        enquiryResult.udfData?.udf2 ||
        enquiryResult.udf2 ||
        enquiryResult.metadata?.userId ||
        currentUserId;

      const promoCode =
        payment?.promoCode ||
        enquiryResult.udfData?.udf3 ||
        enquiryResult.udf3 ||
        enquiryResult.metadata?.promoCode;

      const paymentIdentifier =
        enquiryResult.txnId ||
        enquiryResult.spTxnId ||
        enquiryResult.sabpaisaTxnId ||
        enquiryResult.bankTxnNo ||
        payment?.paymentId ||
        clientTxnId;

      const paidAmount = enquiryResult.amountPaise
        ? Number(enquiryResult.amountPaise) / 100
        : parseFloat(enquiryResult.paidAmount || enquiryResult.amount || 0);

      // ========================================
      // CASE 1: GATEWAY CONFIRMED SUCCESS
      // ========================================
      if (isGatewaySuccess) {
        if (!subscription && planId && targetUserId) {
          const plan = await Plan.findById(planId);
          if (plan) {
            // Expire old subscription if needed
            const oldActive = await Subscription.findOne({ user: targetUserId, status: "active" });
            if (oldActive) {
              await expireSubscriptionIfNeeded(oldActive);
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setUTCDate(endDate.getUTCDate() + (plan.duration || 30));

            subscription = await Subscription.create({
              user: targetUserId,
              plan: plan._id,
              status: "active",
              paymentId: paymentIdentifier,
              subscriptionId: clientTxnId,
              amount: payment ? payment.amount : (paidAmount || plan.price),
              promoCode: promoCode || null,
              startDate,
              endDate,
            });

            console.log(`🎉 Subscription activated: SubID=${subscription._id} for User=${targetUserId}`);
          }
        }

        // Update Payment record in MongoDB
        if (payment) {
          payment.status = "success";
          payment.paidAt = new Date();
          payment.paymentId = paymentIdentifier;
          if (subscription) {
            payment.subscription = subscription._id;
          }
          payment.enquiryResponse = enquiryResult;
          await payment.save();
          console.log(`💾 Payment status updated to SUCCESS: Txn=${clientTxnId}`);
        } else if (targetUserId && planId) {
          payment = await Payment.create({
            user: targetUserId,
            plan: planId,
            clientTxnId,
            merchantTxnId: clientTxnId,
            paymentId: paymentIdentifier,
            amount: paidAmount || 0,
            currency: "INR",
            paymentGateway: "SabPaisa",
            status: "success",
            paidAt: new Date(),
            subscription: subscription?._id || null,
            enquiryResponse: enquiryResult,
          });
        }

        return res.status(200).json({
          success: true,
          status: "SUCCESS",
          statusCode: "0000",
          message: "Payment verified and subscription activated successfully",
          payment,
          subscription,
          gatewayData: enquiryResult,
        });
      }

      // ========================================
      // CASE 2: GATEWAY REPORTED FAILED
      // ========================================
      if (isGatewayFailed) {
        if (payment) {
          payment.status = "failed";
          payment.enquiryResponse = enquiryResult;
          await payment.save();
          console.log(`💾 Payment status updated to FAILED: Txn=${clientTxnId}`);
        }

        return res.status(200).json({
          success: false,
          status: "FAILED",
          statusCode: statusCode || "0300",
          message: "Payment failed or was cancelled by user",
          payment,
          gatewayData: enquiryResult,
        });
      }

      // ========================================
      // CASE 3: GATEWAY PENDING
      // ========================================
      if (payment) {
        payment.enquiryResponse = enquiryResult;
        await payment.save();
      }

      return res.status(200).json({
        success: true,
        status: rawStatus || "PENDING",
        statusCode: statusCode || "0100",
        message: "Payment is currently pending at the gateway",
        payment,
        subscription,
        gatewayData: enquiryResult,
      });
    }

    // 6. If live enquiry gave no result, return current database state
    return res.status(200).json({
      success: true,
      status: payment ? payment.status.toUpperCase() : subscription ? subscription.status.toUpperCase() : "PENDING",
      payment,
      subscription,
    });
  } catch (err) {
    console.error("Check Payment Status Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to check payment status",
    });
  }
};

// Backward-compatible verify endpoint
exports.verifyPayment = exports.checkPaymentStatus;