require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../models/plan.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const paymentController = require('../controllers/payment.controller');
const adminSubController = require('../controllers/admin/subscription.controller');
const axios = require('axios');

async function runFullIntegrationTest() {
  console.log('--- STARTING SABPAISA PG 3.0 STAGING PAYMENT FLOW TEST ---');

  // Connect DB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB successfully');

  // Find or create test user and plan
  let testUser = await User.findOne();
  if (!testUser) {
    testUser = await User.create({ name: 'Test User', email: 'test_sabpaisa@golidoli.com', phone: '9876543210', role: 'USER' });
  }

  let testPlan = await Plan.findOne();
  if (!testPlan) {
    testPlan = await Plan.create({ name: 'VIP Test Plan', duration: 30, price: 199, isActive: true });
  }

  const userId = testUser._id.toString();
  const planId = testPlan._id.toString();

  // ==========================================
  // TEST 1: Payment Initiation & MongoDB Record
  // ==========================================
  console.log('\n[TEST 1] Initiating Payment Session...');

  // Mock SabPaisa API response for payment session creation & enquiry
  const origPost = axios.post;
  axios.post = async (url, payload, options) => {
    if (url.includes('/api/v2/payments/enquiry')) {
      return {
        data: {
          status: 'SUCCESS',
          statusCode: '0000',
          paidAmount: testPlan.price,
          amountPaise: testPlan.price * 100,
          paymentId: 'SP_STAGE_PAY_123',
          spTxnId: 'SP_STAGE_PAY_123',
          clientTxnId: payload.clientTxnId,
        }
      };
    }
    return {
      data: {
        status: 'SUCCESS',
        paymentId: 'SP_STAGE_PAY_123',
        checkoutUrl: 'https://staging-sb-merchant-api.sabpaisa.in/checkout/SP_STAGE_PAY_123',
        clientSecret: 'TEST_SECRET_ABC_999',
        traceId: 'trc-test-001'
      }
    };
  };

  let initStatus = 0;
  let initData = null;
  const initReq = {
    body: { planId, userName: 'Test User', userEmail: 'test@golidoli.com', userContact: '9876543210' },
    user: { id: userId, role: 'USER' }
  };
  const initRes = {
    status: (s) => { initStatus = s; return initRes; },
    json: (d) => { initData = d; return d; }
  };

  await paymentController.initiatePayment(initReq, initRes);

  console.log('Initiate HTTP Status:', initStatus);
  console.log('Initiate Success:', initData?.success);
  console.log('Payment URL includes clientSecret:', initData?.paymentUrl?.includes('clientSecret=TEST_SECRET_ABC_999'));
  console.log('ClientTxnId:', initData?.clientTxnId);

  // Check MongoDB for pending record
  const pendingPayment = await Payment.findOne({ clientTxnId: initData.clientTxnId });
  console.log('MongoDB Pending Record Found:', !!pendingPayment);
  console.log('MongoDB Pending Status:', pendingPayment?.status);
  console.log('MongoDB Amount:', pendingPayment?.amount);

  if (!pendingPayment || pendingPayment.status !== 'pending') {
    throw new Error('TEST 1 FAILED: Pending payment not properly saved in MongoDB');
  }

  // ==========================================
  // TEST 2: Successful Verification & Subscription Activation
  // ==========================================
  console.log('\n[TEST 2] Verifying Transaction (Success Case)...');

  let verifyStatus = 0;
  let verifyData = null;
  const verifyReq = {
    body: { clientTxnId: initData.clientTxnId },
    user: { id: userId, role: 'USER' }
  };
  const verifyRes = {
    status: (s) => { verifyStatus = s; return verifyRes; },
    json: (d) => { verifyData = d; return d; }
  };

  await paymentController.checkPaymentStatus(verifyReq, verifyRes);

  console.log('Verify HTTP Status:', verifyStatus);
  console.log('Verify Success:', verifyData?.success);
  console.log('Verify Status:', verifyData?.status);
  console.log('Subscription ID Created:', verifyData?.subscription?._id);

  // Check MongoDB after verification
  const updatedPayment = await Payment.findOne({ clientTxnId: initData.clientTxnId });
  console.log('MongoDB Updated Payment Status:', updatedPayment?.status);
  console.log('MongoDB Updated Linked Subscription:', updatedPayment?.subscription);

  const activatedSub = await Subscription.findOne({ subscriptionId: initData.clientTxnId });
  console.log('MongoDB Activated Subscription Status:', activatedSub?.status);
  console.log('MongoDB Subscription End Date:', activatedSub?.endDate);

  if (updatedPayment?.status !== 'success' || !activatedSub || activatedSub.status !== 'active') {
    throw new Error('TEST 2 FAILED: Payment status not updated to success or subscription not activated');
  }

  // ==========================================
  // TEST 3: Duplicate / Idempotency Check
  // ==========================================
  console.log('\n[TEST 3] Testing Idempotent Re-verification...');

  let dupeStatus = 0;
  let dupeData = null;
  await paymentController.checkPaymentStatus(verifyReq, {
    status: (s) => { dupeStatus = s; return { json: (d) => { dupeData = d; } }; }
  });

  const subCount = await Subscription.countDocuments({ subscriptionId: initData.clientTxnId });
  console.log('Total subscriptions for this clientTxnId:', subCount);
  if (subCount !== 1) {
    throw new Error('TEST 3 FAILED: Duplicate subscription created upon re-verification');
  }
  console.log('Idempotency Verified! Exactly one subscription preserved.');

  // ==========================================
  // TEST 4: Failed Payment Test
  // ==========================================
  console.log('\n[TEST 4] Testing Failed Payment Flow...');

  // Setup failed payment
  const failedTxnId = 'TXN_FAIL_' + Date.now();
  await Payment.create({
    user: userId,
    plan: planId,
    clientTxnId: failedTxnId,
    merchantTxnId: failedTxnId,
    amount: 199,
    status: 'pending'
  });

  // Mock gateway returning failed
  axios.post = async () => ({
    data: {
      status: 'FAILED',
      statusCode: '0300',
      clientTxnId: failedTxnId
    }
  });

  let failStatus = 0;
  let failData = null;
  await paymentController.checkPaymentStatus(
    { body: { clientTxnId: failedTxnId }, user: { id: userId, role: 'USER' } },
    { status: (s) => { failStatus = s; return { json: (d) => { failData = d; } }; } }
  );

  const failedRec = await Payment.findOne({ clientTxnId: failedTxnId });
  const failedSub = await Subscription.findOne({ subscriptionId: failedTxnId });

  console.log('Failed Payment Record Status in MongoDB:', failedRec?.status);
  console.log('Subscription Created for Failed Payment (should be null):', failedSub);

  if (failedRec?.status !== 'failed' || failedSub !== null) {
    throw new Error('TEST 4 FAILED: Failed payment was incorrectly handled');
  }

  // ==========================================
  // TEST 5: Admin Panel Listing Visibility
  // ==========================================
  console.log('\n[TEST 5] Testing Admin Panel Payment Listing...');

  let adminStatus = 0;
  let adminData = null;
  await adminSubController.getAllSubscriptions(
    {},
    { status: (s) => { adminStatus = s; return { json: (d) => { adminData = d; } }; } }
  );

  console.log('Admin All Subscriptions Count:', adminData?.subscriptions?.length);
  const foundSuccess = adminData?.subscriptions?.find(s => s.clientTxnId === initData.clientTxnId);
  const foundFailed = adminData?.subscriptions?.find(s => s.clientTxnId === failedTxnId);

  console.log('Admin found verified success transaction:', !!foundSuccess, 'Status:', foundSuccess?.status);
  console.log('Admin found failed transaction:', !!foundFailed, 'Status:', foundFailed?.status);

  if (!foundSuccess || !foundFailed) {
    throw new Error('TEST 5 FAILED: Admin panel does not list all payment states');
  }

  // Clean up test records
  await Payment.deleteMany({ clientTxnId: { $in: [initData.clientTxnId, failedTxnId] } });
  await Subscription.deleteMany({ subscriptionId: { $in: [initData.clientTxnId, failedTxnId] } });
  console.log('\nCleaned up test records from MongoDB successfully');

  console.log('\n🎉 ALL 5 INTEGRATION TESTS PASSED PERFECTLY! 🎉');
  process.exit(0);
}

runFullIntegrationTest().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
