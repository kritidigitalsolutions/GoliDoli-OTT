const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let firebaseInitialized = false;

try {
  // Option 1: Initialize using environment variables if present
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.trim();
      if (privateKey.endsWith(',')) {
        privateKey = privateKey.slice(0, -1).trim();
      }
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully via environment variables.");
  } else {
    // Option 2: Fallback to local serviceAccountKey.json if present
    const serviceAccountPath = path.join(__dirname, "../firebase/serviceAccountkey.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin SDK initialized successfully via serviceAccountKey.json.");
    } else {
      console.warn("⚠️ Firebase credentials missing in both environment variables and serviceAccountKey.json. FCM service running in mock/stub mode.");
    }
  }
} catch (error) {
  console.error("❌ Firebase Admin SDK Initialization Error:", error);
}

module.exports = {
  admin,
  firebaseInitialized,
};
