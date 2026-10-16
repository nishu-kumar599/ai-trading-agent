const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be configured with at least 32 characters in production environment.');
  }
} else if (!JWT_SECRET || JWT_SECRET === 'fallback_secret_ai_trading_2026') {
  // In development, generate a cryptographically random secret per process run to prevent token forgery
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  [Security] JWT_SECRET not set in environment. Generated ephemeral 256-bit secure secret for this session.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    req.user = user;
    next();
  });
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  JWT_SECRET
};

