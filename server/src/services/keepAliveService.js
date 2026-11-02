/**
 * Render Free Tier Server Keep-Alive Sentinel
 * 
 * Render free web services spin down after 15 minutes of inactivity.
 * This sentinel pings the server's public endpoint every 10 minutes
 * (configurable via KEEP_ALIVE_INTERVAL_MINUTES, default 10 minutes)
 * to keep the container awake and responsive 24/7 without cold starts.
 */

let keepAliveTimer = null;
let lastPingTime = null;
let lastPingStatus = 'INITIALIZING';
let totalPings = 0;
let lastPingError = null;

function resolveServerUrl() {
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  // Default to the known Render production deployment URL
  return 'https://ai-trading-agent-819y.onrender.com';
}

async function pingSelf() {
  const baseUrl = resolveServerUrl();
  const pingUrl = `${baseUrl}/api/health`;

  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Render-Self-KeepAlive-Sentinel/1.0',
        'X-Keep-Alive-Ping': 'true'
      },
      signal: AbortSignal.timeout(15000)
    });

    totalPings++;
    lastPingTime = new Date().toISOString();
    lastPingStatus = res.ok ? 'SUCCESS' : `HTTP_${res.status}`;
    lastPingError = null;

    console.log(`⏱️  [Render Keep-Alive] Pinged ${pingUrl} (${res.status} ${res.statusText}) - Render kept awake (Ping #${totalPings})`);
  } catch (err) {
    totalPings++;
    lastPingTime = new Date().toISOString();
    lastPingStatus = 'FAILED';
    lastPingError = err.message;
    console.warn(`⚠️  [Render Keep-Alive] Ping to ${pingUrl} noticed: ${err.message}`);
  }
}

function startKeepAlive() {
  if (keepAliveTimer) {
    return;
  }

  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '10', 10);
  // Clamp between 5 and 14 minutes (Render sleeps at 15 minutes)
  const intervalMs = Math.max(5, Math.min(14, intervalMinutes)) * 60 * 1000;

  console.log(`⏱️  [Render Keep-Alive] Sentinel activated. Pinging ${resolveServerUrl()}/api/health every ${intervalMs / 60000} minutes.`);

  // Initial ping 30 seconds after boot to confirm connectivity
  setTimeout(() => {
    pingSelf();
  }, 30000);

  // Scheduled interval ping
  keepAliveTimer = setInterval(pingSelf, intervalMs);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function getKeepAliveStatus() {
  return {
    enabled: Boolean(keepAliveTimer),
    targetUrl: `${resolveServerUrl()}/api/health`,
    intervalMinutes: parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '10', 10),
    totalPings,
    lastPingTime,
    lastPingStatus,
    lastPingError
  };
}

module.exports = {
  startKeepAlive,
  stopKeepAlive,
  pingSelf,
  getKeepAliveStatus
};
