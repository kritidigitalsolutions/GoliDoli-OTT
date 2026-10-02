const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: __dirname + "/../.env" });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET || "golidoliappsecret";

async function runTests() {
  console.log("=== Testing POST /api/auth/website-login ===");
  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = "") {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
    }
  }

  // Step 1: Obtain a valid mobile JWT using dummy OTP login
  console.log("\n1. Generating/obtaining valid mobile JWT...");
  let mobileToken = null;
  let testUserId = null;

  try {
    const verifyRes = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      phone: "+919999999999",
      otp: "1234",
    });
    mobileToken = verifyRes.data.token || verifyRes.data.userToken || verifyRes.data.data?.token;
    testUserId = verifyRes.data.user?._id || verifyRes.data.user?.id;
    console.log("Mobile JWT successfully obtained. User ID:", testUserId);
  } catch (err) {
    console.log("Dummy OTP verify note:", err.response?.data || err.message);
    // If user already exists or token can be directly signed:
    if (testUserId) {
      mobileToken = jwt.sign({ id: testUserId, role: "USER" }, JWT_SECRET, { expiresIn: "1h" });
    }
  }

  // Fallback if test user token needed
  if (!mobileToken) {
    const User = require("../models/user.model");
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI);
    const existing = await User.findOne();
    if (existing) {
      testUserId = existing._id.toString();
      mobileToken = jwt.sign({ id: testUserId, role: "USER" }, JWT_SECRET, { expiresIn: "1h" });
      console.log("Used existing DB user for test token:", testUserId);
    }
    await mongoose.disconnect();
  }

  // Test Case 1: Valid Mobile JWT -> Website Login Success
  console.log("\n2. Testing Success Case with Authorization header...");
  try {
    const res = await axios.post(
      `${BASE_URL}/api/auth/website-login`,
      {},
      {
        headers: {
          Authorization: `Bearer ${mobileToken}`,
        },
      }
    );

    assert(res.status === 200, "HTTP Status is 200");
    assert(res.data.success === true, "success is true");
    assert(res.data.message === "Website login successful", "message is 'Website login successful'");
    assert(typeof res.data.token === "string" && res.data.token.length > 20, "Returned token is a valid JWT string");

    // Verify generated website token
    const decodedWebsiteToken = jwt.verify(res.data.token, JWT_SECRET);
    assert(decodedWebsiteToken.id === testUserId, "Website token decodes with correct user ID");

    // Check top-level keys
    const topKeys = Object.keys(res.data).sort();
    assert(
      JSON.stringify(topKeys) === JSON.stringify(["message", "success", "token", "user"].sort()),
      "Response has ONLY top-level fields: success, message, token, user",
      `Got: ${JSON.stringify(topKeys)}`
    );

    // Check user keys
    const userKeys = Object.keys(res.data.user).sort();
    const expectedUserKeys = ["email", "id", "name", "phone", "profileImage", "role"].sort();
    assert(
      JSON.stringify(userKeys) === JSON.stringify(expectedUserKeys),
      "User object has ONLY: id, name, email, phone, profileImage, role",
      `Got: ${JSON.stringify(userKeys)}`
    );

    console.log("Sample Success Response Body:\n", JSON.stringify(res.data, null, 2));
  } catch (err) {
    assert(false, "Valid Mobile JWT Login", err.response?.data ? JSON.stringify(err.response.data) : err.message);
  }

  // Test Case 2: Missing Authorization Header
  console.log("\n3. Testing Missing Authorization Header...");
  try {
    await axios.post(`${BASE_URL}/api/auth/website-login`, {});
    assert(false, "Missing Authorization Header should return 401");
  } catch (err) {
    assert(err.response?.status === 401, "Status is 401 for missing token");
    assert(err.response?.data?.success === false, "success is false");
    assert(err.response?.data?.message === "Authorization token is required", "Correct error message");
  }

  // Test Case 3: Invalid Token
  console.log("\n4. Testing Invalid Token...");
  try {
    await axios.post(
      `${BASE_URL}/api/auth/website-login`,
      {},
      {
        headers: {
          Authorization: "Bearer invalid.jwt.token",
        },
      }
    );
    assert(false, "Invalid token should return 401");
  } catch (err) {
    assert(err.response?.status === 401, "Status is 401 for invalid token");
    assert(err.response?.data?.success === false, "success is false");
    assert(err.response?.data?.message === "Invalid token", "message is 'Invalid token'");
  }

  // Test Case 4: Expired Token
  console.log("\n5. Testing Expired Token...");
  try {
    const expiredToken = jwt.sign({ id: testUserId, role: "USER" }, JWT_SECRET, { expiresIn: "-1s" });
    await axios.post(
      `${BASE_URL}/api/auth/website-login`,
      {},
      {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      }
    );
    assert(false, "Expired token should return 401");
  } catch (err) {
    assert(err.response?.status === 401, "Status is 401 for expired token");
    assert(err.response?.data?.message === "Token has expired", "message is 'Token has expired'");
  }

  // Test Case 5: Nonexistent User
  console.log("\n6. Testing Nonexistent User...");
  try {
    const fakeToken = jwt.sign({ id: "000000000000000000000000", role: "USER" }, JWT_SECRET, { expiresIn: "1h" });
    await axios.post(
      `${BASE_URL}/api/auth/website-login`,
      {},
      {
        headers: {
          Authorization: `Bearer ${fakeToken}`,
        },
      }
    );
    assert(false, "Nonexistent user should return 404");
  } catch (err) {
    assert(err.response?.status === 404, "Status is 404 for nonexistent user");
    assert(err.response?.data?.message === "User not found", "message is 'User not found'");
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed}/${total} assertions passed.`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
