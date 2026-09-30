/**
 * Notification Service (Telegram & In-App Alert Feed)
 * Dispatches real-time trading alerts:
 * - Order Executions
 * - Zero-Loss Breakeven Locks
 * - Target 1 Partial Profit (50% Scale-Out)
 * - Target 2 Full Achievements
 * - 15:15 IST Market Close Auto-Squareoff
 * - Emergency Panic Squareoff
 */

const https = require('https');

let inAppNotifications = [];

// Optional Telegram credentials from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || null;

/**
 * Send alert to Telegram bot if credentials are configured
 * @param {string} text 
 */
function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  try {
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      // Consume response silently
      res.on('data', () => {});
    });

    req.on('error', (err) => {
      console.warn('⚠️ [Notification] Telegram alert send error:', err.message);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.warn('⚠️ [Notification] Telegram request failed:', err.message);
  }
}

/**
 * Dispatch an alert to both In-App Feed and Telegram
 * @param {string} type 'EXECUTE', 'PROFIT_LOCK', 'TARGET_1', 'TARGET_2', 'STOP_LOSS', 'SQUARE_OFF', 'PANIC_EXIT'
 * @param {string} title 
 * @param {string} message 
 * @param {Object} metadata 
 */
function dispatchAlert(type, title, message, metadata = {}) {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    displayTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    metadata
  };

  inAppNotifications.unshift(alert);
  if (inAppNotifications.length > 60) {
    inAppNotifications = inAppNotifications.slice(0, 60);
  }

  // Format Telegram notification with emojis
  let emoji = '🔔';
  if (type === 'EXECUTE') emoji = '🚀';
  else if (type === 'PROFIT_LOCK') emoji = '🛡️';
  else if (type === 'TARGET_1') emoji = '🎯';
  else if (type === 'TARGET_2') emoji = '🏆';
  else if (type === 'STOP_LOSS') emoji = '⚠️';
  else if (type === 'SQUARE_OFF') emoji = '⏰';
  else if (type === 'PANIC_EXIT') emoji = '🚨';

  const telegramText = `*${emoji} [AI Trading Agent]*\n*${title}*\n${message}`;
  sendTelegramMessage(telegramText);

  return alert;
}

module.exports = {
  dispatchAlert,
  getNotifications: () => inAppNotifications,
  clearNotifications: () => { inAppNotifications = []; return true; }
};
