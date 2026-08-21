require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Microdrama = require("../models/microdrama.model");

const updateDatabase = async () => {
  try {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    // Check counts before update
    const [totalMovies, moviesWithoutPopular] = await Promise.all([
      Movie.countDocuments(),
      Movie.countDocuments({ isPopular: { $exists: false } })
    ]);

    const [totalSeries, seriesWithoutPopular] = await Promise.all([
      Series.countDocuments(),
      Series.countDocuments({ isPopular: { $exists: false } })
    ]);

    const [totalMicrodramas, microdramasWithoutPopular] = await Promise.all([
      Microdrama.countDocuments(),
      Microdrama.countDocuments({ isPopular: { $exists: false } })
    ]);

    console.log("\n--- Current Database Status ---");
    console.log(`Movies: Total = ${totalMovies}, Missing isPopular = ${moviesWithoutPopular}`);
    console.log(`Series: Total = ${totalSeries}, Missing isPopular = ${seriesWithoutPopular}`);
    console.log(`Microdramas: Total = ${totalMicrodramas}, Missing isPopular = ${microdramasWithoutPopular}`);

    // Update documents where isPopular is missing or null
    const movieResult = await Movie.updateMany(
      { $or: [{ isPopular: { $exists: false } }, { isPopular: null }] },
      { $set: { isPopular: false } }
    );

    const seriesResult = await Series.updateMany(
      { $or: [{ isPopular: { $exists: false } }, { isPopular: null }] },
      { $set: { isPopular: false } }
    );

    const microdramaResult = await Microdrama.updateMany(
      { $or: [{ isPopular: { $exists: false } }, { isPopular: null }] },
      { $set: { isPopular: false } }
    );

    console.log("\n--- Update Results ---");
    console.log(`Movies updated: ${movieResult.modifiedCount}`);
    console.log(`Series updated: ${seriesResult.modifiedCount}`);
    console.log(`Microdramas updated: ${microdramaResult.modifiedCount}`);

    // Verify all records now have isPopular
    const sampleMovies = await Movie.find({}, "title isPopular").limit(3).lean();
    const sampleSeries = await Series.find({}, "title isPopular").limit(3).lean();
    const sampleMicrodramas = await Microdrama.find({}, "title isPopular").limit(3).lean();

    console.log("\n--- Sample Verified Records ---");
    console.log("Movies sample:", sampleMovies);
    console.log("Series sample:", sampleSeries);
    console.log("Microdramas sample:", sampleMicrodramas);

    console.log("\n✅ Database update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating database:", error);
    process.exit(1);
  }
};

updateDatabase();
