const Rating = require("../models/rating.model");

// ⭐ ADD / UPDATE RATING (USER)
exports.addOrUpdateRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, review } = req.body;

        // validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        let existing = await Rating.findOne({ user: userId });

        // 🔁 Update
        if (existing) {
            existing.rating = rating;
            existing.review = review || existing.review;
            await existing.save();

            return res.json({
                success: true,
                message: "Rating updated",
                rating: existing
            });
        }

        // ➕ Create
        const newRating = await Rating.create({
            user: userId,
            rating,
            review
        });

        res.json({
            success: true,
            message: "Rating added",
            rating: newRating
        });

    } catch (error) {
        console.error("Rating Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// ⭐ GET ALL RATINGS (ADMIN)
exports.getAllRatings = async (req, res) => {
    try {
        const ratings = await Rating.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            ratings
        });

    } catch (error) {
        console.error("Fetch Ratings Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ⭐ SEARCH RATINGS (ADMIN)
exports.searchRatings = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'q' is required"
            });
        }

        const User = require("../models/user.model");
        const matchedUsers = await User.find({
            $or: [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }
            ]
        }).select("_id");

        const userIds = matchedUsers.map(u => u._id);

        const ratings = await Rating.find({
            $or: [
                { review: { $regex: q, $options: "i" } },
                { user: { $in: userIds } }
            ]
        })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            results: ratings
        });
    } catch (error) {
        console.error("Search Ratings Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ⭐ DELETE RATING (ADMIN)
exports.deleteRating = async (req, res) => {
    try {
        const { id } = req.params;
        const rating = await Rating.findByIdAndDelete(id);
        if (!rating) {
            return res.status(404).json({
                success: false,
                message: "Rating not found"
            });
        }
        res.json({
            success: true,
            message: "Rating deleted successfully"
        });
    } catch (error) {
        console.error("Delete Rating Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};