const axios = require("axios");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET || "golidoliappsecret";

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 Testing GoliDoli OTT Delete Account Requests Complete Workflow");
  console.log("==================================================================\n");

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

  // Connect to DB directly to create isolated test fixtures
  await mongoose.connect(process.env.MONGO_URI);
  const User = require("../models/user.model");
  const Admin = require("../models/admin.model");
  const DeleteAccountRequest = require("../models/deleteAccountRequest.model");

  // Create or retrieve Test Admin
  let testAdmin = await Admin.findOne();
  if (!testAdmin) {
    testAdmin = await Admin.create({
      name: "Test Admin",
      email: "testadmin@golidoli.com",
      password: "password123",
      role: "ADMIN",
    });
  }

  const adminToken = jwt.sign(
    { id: testAdmin._id, role: "ADMIN", email: testAdmin.email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  // Clean up any previous test users & requests
  const testPhone1 = "+919999000001";
  const testPhone2 = "+919999000002";
  await User.deleteMany({ phone: { $in: [testPhone1, testPhone2] } });

  // Create Test User 1 (will be approved and cascade deleted)
  const testUser1 = await User.create({
    name: "Test User For Approval",
    email: "test.approval@golidoli.test",
    phone: testPhone1,
    role: "USER",
    status: "Active",
    authProvider: "PHONE",
  });

  // Create Test User 2 (will be rejected and remain active)
  const testUser2 = await User.create({
    name: "Test User For Rejection",
    email: "test.rejection@golidoli.test",
    phone: testPhone2,
    role: "USER",
    status: "Active",
    authProvider: "GOOGLE",
  });

  await DeleteAccountRequest.deleteMany({
    userId: { $in: [testUser1._id.toString(), testUser2._id.toString()] },
  });

  const userToken1 = jwt.sign({ id: testUser1._id, role: "USER" }, JWT_SECRET, { expiresIn: "2h" });
  const userToken2 = jwt.sign({ id: testUser2._id, role: "USER" }, JWT_SECRET, { expiresIn: "2h" });

  console.log("Fixtures created successfully.");
  console.log(`Test User 1 ID: ${testUser1._id}`);
  console.log(`Test User 2 ID: ${testUser2._id}`);
  console.log(`Admin ID: ${testAdmin._id}\n`);

  try {
    // -------------------------------------------------------------
    // 1. Flutter Mobile API: User 1 submits deletion request
    // -------------------------------------------------------------
    console.log("--- 1. Testing Mobile App Deletion Request Submission ---");
    let req1Id = null;
    const subRes1 = await axios.post(
      `${BASE_URL}/api/user/delete-account-request`,
      {
        reasonCategory: "Privacy Concerns",
        reasonDetails: "I want my account and personal data completely wiped.",
      },
      { headers: { Authorization: `Bearer ${userToken1}` } }
    );

    assert(subRes1.status === 201, "Status 201 on submission");
    assert(subRes1.data.success === true, "Response success is true");
    assert(subRes1.data.request?.status === "Pending", "Request status is Pending");
    assert(subRes1.data.request?.reasonCategory === "Privacy Concerns", "Category saved accurately");
    assert(subRes1.data.request?.userName === "Test User For Approval", "User name snapshot captured");
    assert(subRes1.data.request?.userEmail === "test.approval@golidoli.test", "User email snapshot captured");
    req1Id = subRes1.data.request?._id;

    // -------------------------------------------------------------
    // 2. Prevent duplicate pending requests
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Duplicate Pending Request Prevention ---");
    try {
      await axios.post(
        `${BASE_URL}/api/user/delete-account-request`,
        { reasonCategory: "Too Expensive" },
        { headers: { Authorization: `Bearer ${userToken1}` } }
      );
      assert(false, "Duplicate submission must return error");
    } catch (err) {
      assert(err.response?.status === 400, "Returns 400 on duplicate pending submission");
      assert(
        err.response?.data?.message?.includes("already have a pending"),
        "Informative duplicate rejection message returned"
      );
    }

    // -------------------------------------------------------------
    // 3. User checks deletion request status
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Mobile App Request Status Query ---");
    const statusRes = await axios.get(`${BASE_URL}/api/user/delete-account-request`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    assert(statusRes.status === 200, "Status query returns 200");
    assert(statusRes.data.hasRequest === true, "hasRequest is true");
    assert(statusRes.data.request?._id === req1Id, "Correct pending request returned");

    // -------------------------------------------------------------
    // 4. User 2 submits deletion request (for rejection testing)
    // -------------------------------------------------------------
    console.log("\n--- 4. User 2 Submits Deletion Request (For Rejection Test) ---");
    let req2Id = null;
    const subRes2 = await axios.post(
      `${BASE_URL}/api/user/delete-account-request`,
      {
        reasonCategory: "Accidental Submission",
        reasonDetails: "I tapped delete by accident in profile settings.",
      },
      { headers: { Authorization: `Bearer ${userToken2}` } }
    );
    assert(subRes2.status === 201, "User 2 submitted request successfully");
    req2Id = subRes2.data.request?._id;

    // -------------------------------------------------------------
    // 5. Admin Authorization Protection
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Admin Authorization Guard ---");
    try {
      await axios.get(`${BASE_URL}/api/admin/delete-account-requests`);
      assert(false, "Unauthenticated access should fail");
    } catch (err) {
      assert(err.response?.status === 401, "Returns 401 without auth token");
    }

    try {
      await axios.get(`${BASE_URL}/api/admin/delete-account-requests`, {
        headers: { Authorization: `Bearer ${userToken1}` },
      });
      assert(false, "User token on admin route should fail");
    } catch (err) {
      assert(err.response?.status === 403, "Returns 403 when authenticated as USER instead of ADMIN");
    }

    // -------------------------------------------------------------
    // 6. Admin List Endpoint (Pagination, Counts, Filters)
    // -------------------------------------------------------------
    console.log("\n--- 6. Testing Admin List & Summary Counts ---");
    const adminListRes = await axios.get(`${BASE_URL}/api/admin/delete-account-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminListRes.status === 200, "Admin list returns 200");
    assert(adminListRes.data.success === true, "Admin list success is true");
    assert(typeof adminListRes.data.counts?.total === "number", "Counts total is numeric");
    assert(adminListRes.data.counts?.pending >= 2, "Pending count reflects new submissions");
    assert(Array.isArray(adminListRes.data.requests), "Requests is an array");

    // Test Search filter
    const searchRes = await axios.get(
      `${BASE_URL}/api/admin/delete-account-requests?search=test.approval`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(searchRes.data.requests.length >= 1, "Search by userEmail finds request");
    assert(
      searchRes.data.requests[0]?.userEmail === "test.approval@golidoli.test",
      "Search returned matching user"
    );

    // -------------------------------------------------------------
    // 7. Admin Single Request Endpoint
    // -------------------------------------------------------------
    console.log("\n--- 7. Testing Admin Single Request Endpoint ---");
    const singleRes = await axios.get(`${BASE_URL}/api/admin/delete-account-requests/${req1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(singleRes.status === 200, "Single request returns 200");
    assert(singleRes.data.request?._id === req1Id, "Correct request ID returned");

    // -------------------------------------------------------------
    // 8. Reject Workflow: Reject Request 2
    // -------------------------------------------------------------
    console.log("\n--- 8. Testing Reject Request Workflow ---");
    const rejectRes = await axios.patch(
      `${BASE_URL}/api/admin/delete-account-requests/${req2Id}/reject`,
      { adminRemarks: "User confirmed request was accidental via support." },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(rejectRes.status === 200, "Reject endpoint returns 200");
    assert(rejectRes.data.request?.status === "Rejected", "Request status updated to Rejected");
    assert(rejectRes.data.request?.adminRemarks.includes("accidental"), "Admin remarks recorded");
    assert(rejectRes.data.request?.reviewedAt != null, "reviewedAt timestamp recorded");

    // Verify User 2 account remains active
    const checkUser2 = await User.findById(testUser2._id);
    assert(checkUser2 != null, "User 2 account still exists in DB");
    assert(checkUser2.status === "Active", "User 2 account remains Active");

    // -------------------------------------------------------------
    // 9. Repeated Action Guard on Request 2
    // -------------------------------------------------------------
    console.log("\n--- 9. Testing Guard Against Repeated Actions ---");
    try {
      await axios.patch(
        `${BASE_URL}/api/admin/delete-account-requests/${req2Id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert(false, "Already rejected request cannot be approved");
    } catch (err) {
      assert(err.response?.status === 400, "Returns 400 when attempting to approve already reviewed request");
      assert(err.response?.data?.message?.includes("already been rejected"), "Clear error message returned");
    }

    // -------------------------------------------------------------
    // 10. Approve Workflow: Approve Request 1 & Cascade Delete
    // -------------------------------------------------------------
    console.log("\n--- 10. Testing Approve Workflow & Cascade User Deletion ---");
    const approveRes = await axios.patch(
      `${BASE_URL}/api/admin/delete-account-requests/${req1Id}/approve`,
      { adminRemarks: "GDPR cleanup approved and verified." },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(approveRes.status === 200, "Approve endpoint returns 200");
    assert(approveRes.data.request?.status === "Approved", "Request status updated to Approved");
    assert(approveRes.data.request?.adminRemarks.includes("GDPR cleanup"), "Admin remarks recorded");
    assert(approveRes.data.request?.reviewedAt != null, "reviewedAt timestamp recorded");

    // Verify User 1 account was deleted from User collection
    const checkUser1 = await User.findById(testUser1._id);
    assert(checkUser1 === null, "User 1 document was cascade-deleted from database");

    // -------------------------------------------------------------
    // 11. Deletion Safety: Deleted User token is rejected
    // -------------------------------------------------------------
    console.log("\n--- 11. Testing Token Invalidation for Deleted User ---");
    try {
      await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${userToken1}` },
      });
      assert(false, "Deleted user's token should be rejected");
    } catch (err) {
      assert(err.response?.status === 401, "Deleted user token returns 401 Unauthorized");
      assert(
        err.response?.data?.message?.includes("no longer exists") ||
          err.response?.data?.message?.includes("deleted"),
        "Appropriate deactivation message returned"
      );
    }

    // -------------------------------------------------------------
    // 12. Audit Persistence: Admin panel can still read request 1
    // -------------------------------------------------------------
    console.log("\n--- 12. Testing Audit Persistence in Admin Panel ---");
    const auditRes = await axios.get(`${BASE_URL}/api/admin/delete-account-requests/${req1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200, "Audit record retrieves successfully after user deletion");
    assert(auditRes.data.request?.status === "Approved", "Audit record maintains Approved status");
    assert(auditRes.data.request?.userName === "Test User For Approval", "User name snapshot persists");
    assert(auditRes.data.request?.userEmail === "test.approval@golidoli.test", "User email snapshot persists");
    assert(auditRes.data.request?.userId === testUser1._id.toString(), "User ID snapshot persists");

    // Clean up test user 2 and test requests
    await User.findByIdAndDelete(testUser2._id);
    await DeleteAccountRequest.deleteMany({
      _id: { $in: [req1Id, req2Id] },
    });
    console.log("\nCleaned up test data.");
  } catch (err) {
    console.error("Test execution error:", err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }

  console.log(`\n==================================================================`);
  console.log(`Test Results: ${passed}/${total} assertions passed.`);
  console.log(`==================================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
