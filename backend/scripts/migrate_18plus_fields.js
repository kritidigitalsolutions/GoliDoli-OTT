/**
 * Migration: Add is18plus and isHide fields to all existing content
 * Run with: node scripts/migrate_18plus_fields.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI?.trim();
if (!MONGO_URI) { console.error("❌ MONGO_URI missing in .env"); process.exit(1); }

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const collections = ["movies", "series", "microdramas"];

  for (const col of collections) {
    const collection = mongoose.connection.collection(col);

    // Set is18plus: false and isHide: false where these fields don't exist
    const result = await collection.updateMany(
      { $or: [{ is18plus: { $exists: false } }, { isHide: { $exists: false } }] },
      { $set: { is18plus: false, isHide: false } }
    );

    console.log(`📦 ${col}: ${result.modifiedCount} document(s) updated`);
  }

  console.log("\n✅ Migration complete.");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
