const User = require("../../models/user.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const Microdrama = require("../../models/microdrama.model");
const AudioStory = require("../../models/audioStory.model");
const Help = require("../../models/help.model");
const Plan = require("../../models/plan.model");
const Notification = require("../../models/notification.model");
const Category = require("../../models/category.model");
const HomeBanner = require("../../models/homeBanner.model");

exports.globalSearch = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    const regex = new RegExp(query, "i");

    // Perform queries in parallel
    const [users, movies, series, microdramas, audioStories, helpItems, plans, notifications, categories, banners] = await Promise.all([
      User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex }
        ]
      }).limit(5).select("name email phone profileImage avatar"),

      Movie.find({
        $or: [
          { title: regex },
          { genre: regex },
          { director: regex },
          { cast: regex }
        ]
      }).limit(5).select("title genre releaseYear poster banner"),

      Series.find({
        $or: [
          { title: regex },
          { genre: regex },
          { director: regex }
        ]
      }).limit(5).select("title genre releaseYear poster banner"),

      Microdrama.find({
        $or: [
          { title: regex },
          { genre: regex }
        ]
      }).limit(5).select("title genre poster banner"),

      AudioStory.find({
        $or: [
          { title: regex },
          { author: regex },
          { narrator: regex }
        ]
      }).limit(5).select("title author narrator coverImage poster"),

      Help.find({
        $or: [
          { question: regex },
          { answer: regex },
          { category: regex }
        ]
      }).limit(5).select("question category"),

      Plan.find({
        $or: [
          { name: regex },
          { description: regex }
        ]
      }).limit(5).select("name price duration"),

      Notification ? Notification.find({
        $or: [
          { title: regex },
          { message: regex },
          { type: regex }
        ]
      }).limit(5).select("title message type imageUrl") : Promise.resolve([]),

      Category ? Category.find({
        $or: [
          { name: regex },
          { title: regex }
        ]
      }).limit(5).select("name title icon") : Promise.resolve([]),

      HomeBanner ? HomeBanner.find({
        $or: [
          { title: regex },
          { subtitle: regex }
        ]
      }).limit(5).select("title subtitle image banner") : Promise.resolve([])
    ]);

    const results = [];

    users.forEach((u) => {
      results.push({
        _id: u._id,
        title: u.name || u.email || "User Account",
        subtitle: u.email || u.phone || "User Account",
        image: u.profileImage || u.avatar || null,
        type: "User",
        link: "/dashboard/users"
      });
    });

    movies.forEach((m) => {
      results.push({
        _id: m._id,
        title: m.title,
        subtitle: m.genre ? (Array.isArray(m.genre) ? m.genre.join(", ") : m.genre) : "Movie",
        image: m.poster || m.banner || null,
        type: "Movie",
        link: "/dashboard/content"
      });
    });

    series.forEach((s) => {
      results.push({
        _id: s._id,
        title: s.title,
        subtitle: s.genre ? (Array.isArray(s.genre) ? s.genre.join(", ") : s.genre) : "Series",
        image: s.poster || s.banner || null,
        type: "Series",
        link: "/dashboard/content"
      });
    });

    microdramas.forEach((md) => {
      results.push({
        _id: md._id,
        title: md.title,
        subtitle: md.genre ? (Array.isArray(md.genre) ? md.genre.join(", ") : md.genre) : "Microdrama",
        image: md.poster || md.banner || null,
        type: "Microdrama",
        link: "/dashboard/content"
      });
    });

    audioStories.forEach((a) => {
      results.push({
        _id: a._id,
        title: a.title,
        subtitle: a.author ? `By ${a.author}` : "Audio Story",
        image: a.coverImage || a.poster || null,
        type: "Audio Story",
        link: "/dashboard/audio-content"
      });
    });

    plans.forEach((p) => {
      results.push({
        _id: p._id,
        title: p.name,
        subtitle: `₹${p.price || 0} / ${p.duration || "month"}`,
        type: "Plan",
        link: "/dashboard/plans"
      });
    });

    notifications.forEach((n) => {
      results.push({
        _id: n._id,
        title: n.title,
        subtitle: n.message ? n.message.slice(0, 50) + "..." : "Notification Alert",
        image: n.imageUrl || null,
        type: "Notification",
        link: "/dashboard/notifications"
      });
    });

    categories.forEach((c) => {
      results.push({
        _id: c._id,
        title: c.name || c.title || "Category",
        subtitle: "Media Category",
        type: "Category",
        link: "/dashboard/categories"
      });
    });

    banners.forEach((b) => {
      results.push({
        _id: b._id,
        title: b.title || "Home Banner",
        subtitle: b.subtitle || "Featured Slider",
        image: b.image || b.banner || null,
        type: "Banner",
        link: "/dashboard/home-banners"
      });
    });

    helpItems.forEach((h) => {
      results.push({
        _id: h._id,
        title: h.question,
        subtitle: h.category || "Help & Support",
        type: "Help",
        link: "/dashboard/help"
      });
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message
    });
  }
};


