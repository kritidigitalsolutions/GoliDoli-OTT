require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const AIReel = require("../models/aiReel.model");

const deleteAllAIReels = async () => {
  try {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    console.log("Deleting all AI Reels from database...");
    const result = await AIReel.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} AI Reels.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Deletion failed:", error);
    process.exit(1);
  }
};

deleteAllAIReels();
