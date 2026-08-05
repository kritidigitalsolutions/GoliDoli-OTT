require("dotenv").config();

const mongoose = require("mongoose");

const migrateMovieTextIndex = async () => {
  const uri = process.env.MONGO_URI?.trim();

  if (!uri) {
    throw new Error("MONGO_URI is missing in .env");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const collection = mongoose.connection.collection("movies");
  const indexes = await collection.indexes();
  const oldTextIndex = indexes.find(
    (index) =>
      index.key?._fts === "text" &&
      index.weights?.title === 1 &&
      index.weights?.description === 1 &&
      index.name !== "movie_text_search"
  );

  if (oldTextIndex) {
    await collection.dropIndex(oldTextIndex.name);
    console.log(`Dropped legacy text index: ${oldTextIndex.name}`);
  }

  await collection.createIndex(
    { title: "text", description: "text" },
    {
      name: "movie_text_search",
      language_override: "_searchLanguage",
    }
  );

  console.log("Movie text index is ready.");
};

migrateMovieTextIndex()
  .catch((error) => {
    console.error("Movie text-index migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
