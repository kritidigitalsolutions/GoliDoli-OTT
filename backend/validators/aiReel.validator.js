const validateAIReel = (req, res, next) => {
  const { title } = req.body;

  if (req.method === "POST" && (!title || typeof title !== "string" || !title.trim())) {
    return res.status(400).json({
      success: false,
      message: "AI Reel title is required",
    });
  }

  next();
};

module.exports = { validateAIReel };
