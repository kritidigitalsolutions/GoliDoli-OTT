require("dotenv").config();
const mongoose = require("mongoose");
const Movie = require("./models/movie.model");

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const movies = await Movie.find()
      .populate("genres", "name _id")
      .populate("categories", "name _id")
      .sort({ priority: 1, createdAt: -1 })
      .skip(0)
      .limit(10)
      .lean();
    console.log("Success! Found:", movies.length);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit();
}
test();
