const RateLimit = require('express-rate-limit');

const limiter = RateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 5 minutes)
  message: '너무 많은 요청이 전달되었습니다. 5분 후에 다시 시도해 주세요.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  limiter
}
