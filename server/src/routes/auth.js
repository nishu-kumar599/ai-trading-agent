const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  findUserByEmail, 
  findUserById, 
  createUser,
  recordUserLogin,
  setResetPasswordToken,
  verifyAndResetPassword,
  changeUserPassword,
  updateUserProfile
} = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// Rate limiting map for forgot-password requests (email -> timestamp)
const resetRateLimitMap = new Map();

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validations
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in or reset your password.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with ₹100,000 virtual balance
    const newUser = await createUser({
      name,
      email,
      passwordHash,
      role: 'trader'
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to AlphaTrade AI.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        virtualBalance: newUser.virtualBalance || 100000.00,
        phone: newUser.phone || '',
        createdAt: newUser.createdAt,
        lastLoginAt: newUser.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. If you forgot your password, please use the reset link.'
      });
    }

    // Record login timestamp
    await recordUserLogin(user.id);
    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance || 100000.00,
        phone: user.phone || '',
        createdAt: user.createdAt,
        lastLoginAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Enforce rate limiting: 1 request per 60 seconds per email
    const now = Date.now();
    const lastRequest = resetRateLimitMap.get(cleanEmail);
    if (lastRequest && (now - lastRequest < 60000)) {
      const waitSeconds = Math.ceil((60000 - (now - lastRequest)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many password reset requests. Please wait ${waitSeconds} seconds before trying again.`
      });
    }
    resetRateLimitMap.set(cleanEmail, now);

    const user = await findUserByEmail(cleanEmail);
    if (user) {
      // Cryptographically secure 6-digit verification code
      const resetCode = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

      await setResetPasswordToken(cleanEmail, resetCode, expiresAt);
      console.log(`🔐 [Password Reset] Secure verification code issued for ${cleanEmail} (Expires in 15m)`);

      // Dispatch verification code via configured email delivery service
      const deliveryResult = await sendPasswordResetEmail(cleanEmail, resetCode);
      if (!deliveryResult.success && process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: deliveryResult.error || 'Password reset email delivery failed. Please contact support.'
        });
      }
    }

    // Security requirement: Always return identical generic message to prevent account enumeration
    return res.json({
      success: true,
      message: 'If an account with that email address exists, a 6-digit password reset verification code has been dispatched. Valid for 15 minutes.',
      email: cleanEmail
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again later.'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required.'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    const result = await verifyAndResetPassword(email, code, newPasswordHash);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    const user = result.user;
    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Password has been successfully reset! You are now logged in.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance || 100000.00,
        phone: user.phone || '',
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password: ' + error.message
    });
  }
});

// POST /api/auth/change-password (Authenticated from Dashboard)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password. Please verify and try again.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await changeUserPassword(user.id, newPasswordHash);

    return res.json({
      success: true,
      message: 'Password changed successfully! Your account security is updated.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password: ' + error.message
    });
  }
});

// PUT /api/auth/profile (Authenticated profile updates)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    const updatedUser = await updateUserProfile(req.user.id, { name, phone });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        virtualBalance: updatedUser.virtualBalance || 100000.00,
        phone: updatedUser.phone || '',
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + error.message
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance || 100000.00,
        phone: user.phone || '',
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying token.'
    });
  }
});

module.exports = router;
