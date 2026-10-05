const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");

const rawMode = (process.env.SABPAISA_MODE || "live").trim().toLowerCase();
const isProduction =
  rawMode === "live" ||
  rawMode === "production" ||
  (process.env.SABPAISA_ENV || "").trim().toUpperCase() === "PRODUCTION";

const defaultBaseUrl = isProduction
  ? "https://merchant-api.sabpaisa.in"
  : "https://staging-sb-merchant-api.sabpaisa.in";

const configuredBaseUrl = (
  process.env.SABPAISA_BASE_URL || defaultBaseUrl
).trim().replace(/\/+$/, "");

const SABPAISA_CONFIG = {
  // PG 3.0 REST & Webhook Configuration
  mode: isProduction ? "live" : "test",
  baseUrl: configuredBaseUrl,
  returnUrl:
    (process.env.SABPAISA_RETURN_URL || "https://golidoli.com/subscription").trim(),
  webhookUrl:
    (process.env.SABPAISA_WEBHOOK_URL || "https://api.golidoli.com/api/payment/webhook").trim(),
  apiKey: (process.env.SABPAISA_API_KEY || "").trim(),
  secretKey: (process.env.SABPAISA_SECRET_KEY || "").trim(),
  merchantId: (
    process.env.SABPAISA_MERCHANT_ID ||
    process.env.SABPAISA_CLIENT_CODE ||
    "PRIS74"
  ).trim(),
  webhookSecret: (
    process.env.SABPAISA_WEBHOOK_SECRET ||
    process.env.SABPAISA_SECRET_KEY ||
    ""
  ).trim(),

  // Classic AES Staging Fallback Configuration (Preserved)
  clientCode: (
    process.env.SABPAISA_CLIENT_CODE ||
    process.env.SABPAISA_MERCHANT_ID ||
    "TM001"
  ).trim(),
  transUserName: (process.env.SABPAISA_TRANS_USERNAME || "spuser_2013").trim(),
  transUserPassword: (process.env.SABPAISA_TRANS_PASSWORD || "password@123").trim(),
  authKey: (process.env.SABPAISA_AUTH_KEY || "2ycpukpr00qomv2q").trim(),
  authIV: (process.env.SABPAISA_AUTH_IV || "n4m7u3w0q6g0l4v7").trim(),
  env: isProduction ? "PRODUCTION" : "STAGING",
  paymentUrl: (
    process.env.SABPAISA_PAYMENT_URL ||
    (isProduction
      ? "https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1"
      : "https://stage-securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1")
  ).trim(),
  enquiryUrl: (
    process.env.SABPAISA_ENQUIRY_URL ||
    (isProduction
      ? "https://securepay.sabpaisa.in/SabPaisa/txnenquiry"
      : "https://stage-securepay.sabpaisa.in/SabPaisa/txnenquiry")
  ).trim(),
  callbackUrl: (
    process.env.SABPAISA_CALLBACK_URL ||
    "https://golidoli.com/api/payment/sabpaisa-response"
  ).trim(),
  mcc: (process.env.SABPAISA_MCC || "5812").trim(),
  channelId: (process.env.SABPAISA_CHANNEL_ID || "W").trim(),
};

/**
 * Validates if SabPaisa credentials are present (Supports both PG 3.0 & Classic)
 */
function isConfigured() {
  const hasPG3 = !!(SABPAISA_CONFIG.apiKey && SABPAISA_CONFIG.secretKey && SABPAISA_CONFIG.merchantId);
  const hasClassic = !!(
    SABPAISA_CONFIG.clientCode &&
    SABPAISA_CONFIG.authKey &&
    SABPAISA_CONFIG.authIV
  );
  return hasPG3 || hasClassic;
}

/**
 * Create Payment via SabPaisa PG 3.0 REST API
 * POST https://merchant-api.sabpaisa.in/api/v2/payments
 */
async function createPG3Payment({
  merchantTxnId,
  amountInRupees,
  customerName,
  customerEmail,
  customerMobile,
  returnUrl,
  udf1,
  udf2,
  udf3,
}) {
  const amountPaise = Math.round(Number(amountInRupees) * 100);
  const currency = "INR";
  const timestamp = Math.floor(Date.now() / 1000);

  // Official Checksum String: merchantId|merchantTxnId|amount|currency|timestamp
  const message = `${SABPAISA_CONFIG.merchantId}|${merchantTxnId}|${amountPaise}|${currency}|${timestamp}`;
  const checksum = crypto
    .createHmac("sha256", SABPAISA_CONFIG.secretKey)
    .update(message)
    .digest("hex");

  const phone = customerMobile || "9999999999";

  const payload = {
    merchantId: SABPAISA_CONFIG.merchantId,
    merchantTxnId,
    amount: amountPaise,
    currency,
    timestamp,
    customerName: customerName || "Customer",
    customerEmail: customerEmail || "customer@golidoli.com",
    customerPhone: phone,
    customerMobile: phone,
    checksum,
    returnUrl: returnUrl || SABPAISA_CONFIG.returnUrl,
    udf1: udf1 || "",
    udf2: udf2 || "",
    udf3: udf3 || "",
  };

  const response = await axios.post(
    `${SABPAISA_CONFIG.baseUrl}/api/v2/payments`,
    payload,
    {
      headers: {
        "X-Api-Key": SABPAISA_CONFIG.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const rawData = response.data || {};
  const innerData = (rawData.data && typeof rawData.data === "object") ? rawData.data : {};

  const paymentId =
    rawData.paymentId ||
    innerData.paymentId ||
    rawData.payment_id ||
    innerData.payment_id ||
    null;

  const checkoutUrl =
    rawData.checkoutUrl ||
    innerData.checkoutUrl ||
    rawData.checkout_url ||
    innerData.checkout_url ||
    null;

  const clientSecret =
    rawData.clientSecret ||
    innerData.clientSecret ||
    rawData.client_secret ||
    innerData.client_secret ||
    rawData.secret ||
    innerData.secret ||
    null;

  const status =
    rawData.status ||
    innerData.status ||
    rawData.statusCode ||
    innerData.statusCode ||
    "SUCCESS";

  const traceId =
    rawData.traceId ||
    innerData.traceId ||
    rawData.trace_id ||
    innerData.trace_id ||
    response.headers?.["x-trace-id"] ||
    null;

  // Safe debugging logs: keys & field existence only, never sensitive credentials/URLs
  console.log("SabPaisa PG 3.0 payment creation response check:", {
    status,
    hasPaymentId: !!paymentId,
    hasCheckoutUrl: !!checkoutUrl,
    hasClientSecret: !!clientSecret,
    hasTraceId: !!traceId,
    topKeys: Object.keys(rawData),
    innerKeys: Object.keys(innerData),
  });

  return {
    ...innerData,
    ...rawData,
    paymentId,
    checkoutUrl,
    clientSecret,
    status,
    traceId,
  };
}

/**
 * Transaction Status Enquiry via SabPaisa PG 3.0 REST API
 * POST https://merchant-api.sabpaisa.in/api/v2/payments/enquiry
 */
async function enquirePG3Transaction(merchantTxnId) {
  const payload = {
    merchantId: SABPAISA_CONFIG.merchantId,
    clientCode: SABPAISA_CONFIG.merchantId,
    merchantTxnId,
    clientTxnId: merchantTxnId,
  };

  const headers = {
    "X-Api-Key": SABPAISA_CONFIG.apiKey,
    "X-Merchant-Id": SABPAISA_CONFIG.merchantId,
    "Content-Type": "application/json",
  };

  const url = `${SABPAISA_CONFIG.baseUrl}/api/v2/payments/enquiry`;

  console.log("SabPaisa PG 3.0 Enquiry Call:", {
    url,
    merchantTxnId,
    merchantId: SABPAISA_CONFIG.merchantId,
    hasApiKey: !!SABPAISA_CONFIG.apiKey,
  });

  try {
    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000,
    });

    console.log("SabPaisa PG 3.0 Enquiry Result:", {
      status: response.data?.status || response.data?.statusCode,
      keys: Object.keys(response.data || {}),
    });

    return response.data;
  } catch (postErr) {
    console.warn("SabPaisa PG 3.0 POST Enquiry Error:", {
      status: postErr.response?.status,
      message: postErr.response?.data?.message || postErr.message,
    });

    // If POST route is 404 or 405 on some gateway versions, try GET endpoint
    if (postErr.response?.status === 404 || postErr.response?.status === 405) {
      try {
        const getUrl = `${SABPAISA_CONFIG.baseUrl}/api/v2/payments/${encodeURIComponent(merchantTxnId)}`;
        const getRes = await axios.get(getUrl, {
          headers: {
            "X-Api-Key": SABPAISA_CONFIG.apiKey,
            "X-Merchant-Id": SABPAISA_CONFIG.merchantId,
            Accept: "application/json",
          },
          timeout: 15000,
        });
        return getRes.data;
      } catch (getErr) {
        console.warn("SabPaisa PG 3.0 GET Enquiry Fallback Error:", getErr.message);
      }
    }

    throw postErr;
  }
}

/**
 * Timing-safe HMAC-SHA256 signature verification for SabPaisa PG 3.0 Webhooks
 */
function verifyWebhookSignature(rawBody, receivedSignature, customSecret = null) {
  if (!receivedSignature || !rawBody) {
    return false;
  }

  const secret =
    customSecret ||
    SABPAISA_CONFIG.webhookSecret ||
    SABPAISA_CONFIG.secretKey ||
    SABPAISA_CONFIG.authKey;

  if (!secret) {
    console.warn("⚠️ Cannot verify webhook signature: No secret key configured");
    return false;
  }

  try {
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");

    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const cleanReceived = receivedSignature.trim().toLowerCase();
    const cleanComputed = computedSignature.toLowerCase();

    if (cleanReceived.length !== cleanComputed.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanReceived, "utf8"),
      Buffer.from(cleanComputed, "utf8")
    );
  } catch (err) {
    console.error("Webhook Signature Verification Error:", err);
    return false;
  }
}

/**
 * Universal Enquiry (PG 3.0 or Classic AES Fallback)
 */
async function enquireTransaction(clientTxnId) {
  if (!clientTxnId) throw new Error("clientTxnId is required for enquiry");

  // If PG 3.0 configured, use official PG 3.0 enquiry
  if (SABPAISA_CONFIG.apiKey && SABPAISA_CONFIG.secretKey) {
    try {
      const data = await enquirePG3Transaction(clientTxnId);
      return data;
    } catch (err) {
      console.warn("PG 3.0 Enquiry Call Warning:", err.response?.data || err.message);
    }
  }

  // Classic AES Enquiry Fallback
  const queryParams = {
    clientCode: SABPAISA_CONFIG.clientCode,
    clientTxnId: clientTxnId,
  };

  const encData = encryptData(queryParams);
  const requestPayload = {
    clientCode: SABPAISA_CONFIG.clientCode,
    encData: encData,
  };

  const response = await axios.post(
    SABPAISA_CONFIG.enquiryUrl,
    querystring.stringify(requestPayload),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/plain, */*",
      },
      timeout: 15000,
    }
  );

  let responseData = response.data;
  if (typeof responseData === "string") {
    try {
      responseData = parseSabPaisaResponse(responseData);
    } catch (err) {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        responseData = querystring.parse(responseData);
      }
    }
  } else if (responseData && responseData.encResponse) {
    responseData = parseSabPaisaResponse(responseData.encResponse);
  }

  return responseData;
}

/**
 * Classic AES Helpers (Preserved)
 */
function getCipherAlgorithm(key) {
  const keyBytes = Buffer.byteLength(key, "utf8");
  return keyBytes === 32 ? "aes-256-cbc" : "aes-128-cbc";
}

function encryptData(data) {
  if (!data) throw new Error("Data to encrypt cannot be empty");

  let plainText = "";
  if (typeof data === "object") {
    plainText = Object.entries(data)
      .map(([k, v]) => `${k}=${v !== undefined && v !== null ? v : ""}`)
      .join("&");
  } else {
    plainText = String(data);
  }

  const algorithm = getCipherAlgorithm(SABPAISA_CONFIG.authKey);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(SABPAISA_CONFIG.authKey, "utf8"),
    Buffer.from(SABPAISA_CONFIG.authIV, "utf8")
  );

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function decryptData(encText) {
  if (!encText) throw new Error("Encrypted text cannot be empty");

  let cleanEnc = encText.trim();
  if (cleanEnc.includes("%")) {
    try {
      cleanEnc = decodeURIComponent(cleanEnc);
    } catch (e) {}
  }
  cleanEnc = cleanEnc.replace(/ /g, "+");

  const algorithm = getCipherAlgorithm(SABPAISA_CONFIG.authKey);
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(SABPAISA_CONFIG.authKey, "utf8"),
    Buffer.from(SABPAISA_CONFIG.authIV, "utf8")
  );

  let decrypted = decipher.update(cleanEnc, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function parseSabPaisaResponse(encResponse) {
  const decrypted = decryptData(encResponse);
  try {
    if (decrypted.trim().startsWith("{") && decrypted.trim().endsWith("}")) {
      return JSON.parse(decrypted);
    }
  } catch (e) {}
  return querystring.parse(decrypted);
}

function formatTransDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

if (isConfigured()) {
  console.log(`✅ SabPaisa configured successfully (Mode: ${SABPAISA_CONFIG.mode || "live"})`);
} else {
  console.warn("⚠️ SabPaisa credentials missing in .env. Payment system is disabled.");
}

module.exports = {
  SABPAISA_CONFIG,
  isConfigured,
  createPG3Payment,
  enquirePG3Transaction,
  verifyWebhookSignature,
  encryptData,
  decryptData,
  parseSabPaisaResponse,
  enquireTransaction,
  formatTransDate,
};
