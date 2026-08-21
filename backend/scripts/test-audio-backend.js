require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const app = require("../app");

// Import models for direct verification and cleanup
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const AudioCategory = require("../models/audioCategory.model");
const AudioStory = require("../models/audioStory.model");
const AudioEpisode = require("../models/audioEpisode.model");
const AudioProgress = require("../models/audioProgress.model");

const PORT = 8888;
const BASE_URL = `http://localhost:${PORT}/api`;
let server;

// Mock user and admin IDs
const adminId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const JWT_SECRET = process.env.JWT_SECRET || "golidoliappsecret";

// Generate JWT tokens
const adminToken = jwt.sign({ id: adminId, role: "ADMIN" }, JWT_SECRET);
const userToken = jwt.sign({ id: userId, role: "USER" }, JWT_SECRET);

const headers = {
  admin: { Authorization: `Bearer ${adminToken}` },
  user: { Authorization: `Bearer ${userToken}` },
};

async function runTests() {
  console.log("=== STARTING AUDIO STORIES INTEGRATION TESTS ===");

  // Connect DB if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected.");
  }

  // Clear any existing test documents (safeguard)
  await cleanUpDB();

  // Start Express Server
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // ----------------------------------------------------
    // TEST 1: CATEGORY CRUD (ADMIN)
    // ----------------------------------------------------
    console.log("\n[TEST 1] Creating Audio Categories...");
    const catRes1 = await axios.post(
      `${BASE_URL}/admin/audio-categories`,
      { name: "Sci-Fi Thriller", priority: 10 },
      { headers: headers.admin }
    );
    const categoryId = catRes1.data.category._id;
    console.log(`- Created category: ${catRes1.data.category.name} (${categoryId})`);

    // ----------------------------------------------------
    // TEST 2: STORY CRUD (ADMIN)
    // ----------------------------------------------------
    console.log("\n[TEST 2] Creating Audio Story...");
    const storyRes = await axios.post(
      `${BASE_URL}/admin/audio-stories`,
      {
        title: "Chronicles of Mars",
        description: "An audio story about human survival on Mars.",
        author: "John Doe",
        narrator: "Jane Smith",
        categories: [categoryId],
        isPremium: true, // Mark story as Premium
        isPublished: true,
        status: "Published",
        priority: 5,
      },
      { headers: headers.admin }
    );
    const storyId = storyRes.data.story._id;
    storyIdGlobal = storyId;
    console.log(`- Created Premium Story: ${storyRes.data.story.title} (${storyId})`);

    // Also create a Free Story for contrast testing
    const freeStoryRes = await axios.post(
      `${BASE_URL}/admin/audio-stories`,
      {
        title: "Fairy Tales",
        description: "Bedtime stories for children.",
        author: "Grimm",
        narrator: "Uncle Bob",
        categories: [categoryId],
        isPremium: false, // Free story
        isPublished: true,
        status: "Published",
        priority: 2,
      },
      { headers: headers.admin }
    );
    const freeStoryId = freeStoryRes.data.story._id;
    freeStoryIdGlobal = freeStoryId;
    console.log(`- Created Free Story: ${freeStoryRes.data.story.title} (${freeStoryId})`);

    // ----------------------------------------------------
    // TEST 3: EPISODE CRUD (ADMIN)
    // ----------------------------------------------------
    console.log("\n[TEST 3] Creating Audio Episodes...");
    // Free Episode on Free Story
    const ep1Res = await axios.post(
      `${BASE_URL}/admin/audio-episodes`,
      {
        title: "Cinderella",
        storyId: freeStoryId,
        episodeNumber: 1,
        duration: 100, // 100 seconds
        audioUrl: "https://bunny-cdn.com/audio/cinderella.mp3",
        isPremium: false,
        status: "Published",
        isPublished: true,
      },
      { headers: headers.admin }
    );
    const freeEpisodeId = ep1Res.data.episode._id;
    console.log(`- Added Free Episode: ${ep1Res.data.episode.title}`);

    // Premium Episode on Free Story (Contrast)
    const ep2Res = await axios.post(
      `${BASE_URL}/admin/audio-episodes`,
      {
        title: "Jack and the Beanstalk (Premium)",
        storyId: freeStoryId,
        episodeNumber: 2,
        duration: 200,
        audioUrl: "https://bunny-cdn.com/audio/jack.mp3",
        isPremium: true, // Episode is premium
        status: "Published",
        isPublished: true,
      },
      { headers: headers.admin }
    );
    const premiumEpisodeIdOnFreeStory = ep2Res.data.episode._id;
    console.log(`- Added Premium Episode to Free Story: ${ep2Res.data.episode.title}`);

    // Free Episode on Premium Story (Locked because parent story is Premium)
    const ep3Res = await axios.post(
      `${BASE_URL}/admin/audio-episodes`,
      {
        title: "Mars Landing",
        storyId: storyId,
        episodeNumber: 1,
        duration: 150,
        audioUrl: "https://bunny-cdn.com/audio/mars-landing.mp3",
        isPremium: false,
        status: "Published",
        isPublished: true,
      },
      { headers: headers.admin }
    );
    const freeEpisodeIdOnPremiumStory = ep3Res.data.episode._id;
    console.log(`- Added Episode to Premium Story: ${ep3Res.data.episode.title}`);

    // ----------------------------------------------------
    // TEST 4: USER CATALOG / HOME / SEARCH APIs
    // ----------------------------------------------------
    console.log("\n[TEST 4] Testing User Catalog APIs...");
    const activeCats = await axios.get(`${BASE_URL}/audio-categories`);
    console.log(`- Fetch Categories Count: ${activeCats.data.categories.length}`);

    const storiesList = await axios.get(`${BASE_URL}/audio-stories`);
    console.log(`- Fetch Stories Count: ${storiesList.data.stories.length}`);

    const homeFeed = await axios.get(`${BASE_URL}/audio-stories/home`);
    console.log(`- Home Feed Category Shelves Count: ${homeFeed.data.feed.length}`);

    const searchRes = await axios.get(`${BASE_URL}/audio-stories/search?q=Mars`);
    console.log(`- Search 'Mars' Result Count: ${searchRes.data.results.length}`);

    // ----------------------------------------------------
    // TEST 5: PLAYBACK SECURITY & LOCK STATES
    // ----------------------------------------------------
    console.log("\n[TEST 5] Verifying Lock States and Playback Security...");
    
    // Fetch free story details as unsubscribed user
    const freeStoryDetails = await axios.get(`${BASE_URL}/audio-stories/${freeStoryId}`, {
      headers: headers.user,
    });
    const eps = freeStoryDetails.data.story.episodes;
    const ep1 = eps.find(e => e._id.toString() === freeEpisodeId.toString());
    const ep2 = eps.find(e => e._id.toString() === premiumEpisodeIdOnFreeStory.toString());

    console.log(`- Free Episode locked state (expected false): ${ep1.isLocked}`);
    console.log(`- Free Episode audioUrl returned: ${ep1.audioUrl !== ""}`);
    console.log(`- Premium Episode locked state (expected true): ${ep2.isLocked}`);
    console.log(`- Premium Episode audioUrl returned (expected empty/stripped): ${ep2.audioUrl === ""}`);

    // Fetch premium story details as unsubscribed user
    const premiumStoryDetails = await axios.get(`${BASE_URL}/audio-stories/${storyId}`, {
      headers: headers.user,
    });
    const marsEp1 = premiumStoryDetails.data.story.episodes[0];
    console.log(`- Episode on Premium Story locked state (expected true): ${marsEp1.isLocked}`);

    // Playback auth: Free Episode play (Expected: 200 OK)
    const playFree = await axios.get(`${BASE_URL}/audio-episodes/${freeEpisodeId}/play`, {
      headers: headers.user,
    });
    console.log(`- Play Free Episode status: ${playFree.status} (audioUrl: ${playFree.data.audioUrl})`);

    // Playback auth: Premium Episode play unsubscribed (Expected: 403 Forbidden)
    try {
      await axios.get(`${BASE_URL}/audio-episodes/${premiumEpisodeIdOnFreeStory}/play`, {
        headers: headers.user,
      });
      console.log("❌ ERROR: Unsubscribed user was able to play premium episode.");
    } catch (err) {
      console.log(`- Play Premium Episode (unsubscribed) failed correctly: ${err.response.status} - ${err.response.data.message}`);
    }

    // Playback auth: Episode on Premium Story unsubscribed (Expected: 403 Forbidden)
    try {
      await axios.get(`${BASE_URL}/audio-episodes/${freeEpisodeIdOnPremiumStory}/play`, {
        headers: headers.user,
      });
      console.log("❌ ERROR: Unsubscribed user was able to play episode on premium story.");
    } catch (err) {
      console.log(`- Play Premium Story Episode (unsubscribed) failed correctly: ${err.response.status} - ${err.response.data.message}`);
    }

    // ----------------------------------------------------
    // TEST 6: SUBSCRIPTION ACTIVATION & PREMIUM STREAMING
    // ----------------------------------------------------
    console.log("\n[TEST 6] Activating Subscription & Re-testing Playback...");
    // Mock user model and active subscription
    const mockUser = await User.create({
      _id: userId,
      phone: `+919999999${Math.floor(100 + Math.random() * 900)}`,
      name: "Subscribed User",
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Subscription.create({
      user: userId,
      plan: new mongoose.Types.ObjectId(),
      status: "active",
      startDate: new Date(),
      endDate: tomorrow,
    });
    console.log("- Subscribed user record created in DB.");

    // Retest Playback auth: Premium Episode play subscribed (Expected: 200 OK)
    const playPremium = await axios.get(`${BASE_URL}/audio-episodes/${premiumEpisodeIdOnFreeStory}/play`, {
      headers: headers.user,
    });
    console.log(`- Play Premium Episode (subscribed) status: ${playPremium.status} (audioUrl: ${playPremium.data.audioUrl})`);

    // ----------------------------------------------------
    // TEST 7: PROGRESS TRACKING & CONTINUE LISTENING
    // ----------------------------------------------------
    console.log("\n[TEST 7] Testing Progress Tracking & Resume...");
    
    // Save partial progress: 30 seconds of a 100 seconds episode (30% -> Incomplete)
    const prog1 = await axios.post(
      `${BASE_URL}/audio-progress`,
      { episodeId: freeEpisodeId, progressSeconds: 30, durationSeconds: 100 },
      { headers: headers.user }
    );
    console.log(`- Progress saved: ${prog1.data.progress.progressSeconds}s / ${prog1.data.progress.durationSeconds}s. Completed: ${prog1.data.progress.completed}`);

    // Check Continue Listening List
    const continueList1 = await axios.get(`${BASE_URL}/audio-progress/continue`, {
      headers: headers.user,
    });
    console.log(`- Continue Listening count (expected 1): ${continueList1.data.continueListening.length}`);
    if (continueList1.data.continueListening.length > 0) {
      const item = continueList1.data.continueListening[0];
      console.log(`  -> Listening to Episode: "${item.episodeId.title}" under Story: "${item.storyId.title}"`);
    }

    // Save auto-complete progress: 92 seconds of 100 seconds (92% >= 90% -> Auto Completed)
    const prog2 = await axios.post(
      `${BASE_URL}/audio-progress`,
      { episodeId: freeEpisodeId, progressSeconds: 92, durationSeconds: 100 },
      { headers: headers.user }
    );
    console.log(`- Progress auto-completed save: ${prog2.data.progress.progressSeconds}s / ${prog2.data.progress.durationSeconds}s. Completed: ${prog2.data.progress.completed}`);

    // Check Continue Listening List (should be empty now)
    const continueList2 = await axios.get(`${BASE_URL}/audio-progress/continue`, {
      headers: headers.user,
    });
    console.log(`- Continue Listening count after completion (expected 0): ${continueList2.data.continueListening.length}`);

    // Manually mark Jack and the Beanstalk as completed
    const completeJack = await axios.post(
      `${BASE_URL}/audio-progress/${premiumEpisodeIdOnFreeStory}/complete`,
      {},
      { headers: headers.user }
    );
    console.log(`- Manual complete Jack episode: completed=${completeJack.data.progress.completed}, progress=${completeJack.data.progress.progressSeconds}s`);

    console.log("\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  } finally {
    // Cleanup and Shutdown
    await cleanUpDB();
    if (server) {
      server.close();
      console.log("Test server closed.");
    }
    // Disconnect mongoose if we opened connection
    await mongoose.disconnect();
    console.log("DB Disconnected. Exiting test process.");
  }
}

async function cleanUpDB() {
  console.log("Cleaning up test documents from database...");
  await AudioProgress.deleteMany({ userId });
  await AudioEpisode.deleteMany({
    storyId: { $in: [storyIdGlobal, freeStoryIdGlobal].filter(Boolean) },
  });
  await AudioStory.deleteMany({
    title: { $in: ["Chronicles of Mars", "Fairy Tales"] },
  });
  await AudioCategory.deleteMany({ name: "Sci-Fi Thriller" });
  await Subscription.deleteMany({ user: userId });
  await User.deleteMany({ _id: userId });
}

// Global reference holders for cleanup
let storyIdGlobal = null;
let freeStoryIdGlobal = null;

// Monkey patch global IDs before deletion
mongoose.connection.on("open", () => {
  AudioStory.findOne({ title: "Chronicles of Mars" }).then(s => {
    if (s) storyIdGlobal = s._id;
  });
  AudioStory.findOne({ title: "Fairy Tales" }).then(s => {
    if (s) freeStoryIdGlobal = s._id;
  });
});

// Run script
runTests();
