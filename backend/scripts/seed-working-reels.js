require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const AIReel = require("../models/aiReel.model");

const workingDummyReels = [
  {
    title: "Oceans & Marine Life Showcase",
    description: "A beautiful close-up of ocean waves and deep sea environment.",
    thumbnail: "https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    duration: "0:47",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 1,
  },
  {
    title: "Blooming Flowers in Springtime",
    description: "Time-lapse of vibrant garden flowers opening up.",
    thumbnail: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    duration: "0:05",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 2,
  },
  {
    title: "Big Buck Bunny Classic Animation",
    description: "Official W3Schools open-source animation test video of Big Buck Bunny.",
    thumbnail: "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: "0:10",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 3,
  },
  {
    title: "Wild Bear in the River",
    description: "W3Schools sample video showing a wild bear hunting in the river.",
    thumbnail: "https://images.pexels.com/photos/355863/pexels-photo-355863.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    duration: "0:12",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 4,
  },
  {
    title: "Running Rabbit in the Grass",
    description: "MDN sample video showing a fluffy rabbit hopping around.",
    thumbnail: "https://images.pexels.com/photos/4001296/pexels-photo-4001296.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/rabbit320.mp4",
    duration: "0:04",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 5,
  },
  {
    title: "Sintel - Cinematic Trailer",
    description: "W3C official trailer for the open-source movie Sintel.",
    thumbnail: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    duration: "0:52",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 6,
  },
  {
    title: "Big Buck Bunny - Movie Trailer",
    description: "The original animated trailer showing the forest adventure.",
    thumbnail: "https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://media.w3.org/2010/05/bunny/trailer.mp4",
    duration: "0:33",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 7,
  },
  {
    title: "W3C Sample Film Reel",
    description: "A short vintage countdown clip from the W3C testing suite.",
    thumbnail: "https://images.pexels.com/photos/1117132/pexels-photo-1117132.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://media.w3.org/2010/05/video/movie_300.mp4",
    duration: "0:08",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 8,
  },
  {
    title: "Simple Geometric Animation",
    description: "Testing shapes and color balances in motion graphics.",
    thumbnail: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://files.samples.dev/samples/video/mp4/sample-simple.mp4",
    duration: "0:06",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 9,
  },
  {
    title: "Deep Sea Diving Exploration",
    description: "Part II of ocean streams highlighting deep marine species.",
    thumbnail: "https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    duration: "0:47",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 10,
  },
  {
    title: "Vibrant Spring Garden In Bloom",
    description: "Bright floral patterns dancing in the summer wind.",
    thumbnail: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    duration: "0:05",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 11,
  },
  {
    title: "Funny Bunny Playful Moments",
    description: "Big Buck Bunny relaxing on the meadows in HD.",
    thumbnail: "https://images.pexels.com/photos/38008/pexels-photo-38008.jpeg?auto=compress&cs=tinysrgb&w=600",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: "0:10",
    views: 0,
    like: 0,
    shares: 0,
    isPublished: true,
    priority: 12,
  },
];

const seedWorkingReels = async () => {
  try {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    console.log("Clearing old AI Reels...");
    await AIReel.deleteMany({});

    console.log("Seeding 12 playable working AI Reels (with 0 views/likes/shares & priority 1-12)...");
    const result = await AIReel.insertMany(workingDummyReels);
    console.log(`Successfully seeded ${result.length} playable AI Reels in the database!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedWorkingReels();
