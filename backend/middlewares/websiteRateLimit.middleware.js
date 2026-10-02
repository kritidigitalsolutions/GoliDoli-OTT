const attemptsMap = new Map();

// Periodic cleanup of stale rate-limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsMap.entries()) {
    if (now - record.resetTime > 60000) {
      attemptsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiter middleware for website login attempts
 * Limits to 15 attempts per 60 seconds per IP address
 */
const websiteLoginRateLimiter = (req, res, next) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown_ip";

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 15;

  let record = attemptsMap.get(clientIp);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    attemptsMap.set(clientIp, record);
    return next();
  }

  record.count += 1;

  if (record.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please wait ${retryAfterSeconds} seconds before trying again.`,
      retryAfter: retryAfterSeconds,
    });
  }

  return next();
};

module.exports = { websiteLoginRateLimiter };
