require("dotenv").config();
const mongoose = require("mongoose");
const HomeBanner = require("./models/homeBanner.model");

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const banners = await HomeBanner.find().sort({ order: 1 });
  console.log(banners.map(b => ({ id: b._id, order: b.order, content: b.contentId })));
  process.exit();
}
check();
