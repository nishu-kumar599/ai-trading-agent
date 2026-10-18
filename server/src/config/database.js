const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      const msg = 'CRITICAL: MONGODB_URI is not configured in production environment! Running in ephemeral local JSON storage mode will result in data loss upon container restart or redeploy.';
      console.error('🚨 ' + msg);
      if (process.env.REQUIRE_MONGODB === 'true' || process.env.STRICT_DB === 'true') {
        throw new Error(msg);
      }
    } else {
      console.log('📦 [Database] MONGODB_URI not provided. Running in Local Storage Mode (server/data/*.json).');
      console.log('ℹ️  [Database] To persist permanently in cloud MongoDB, set MONGODB_URI in .env or Render environment variables.');
    }
    isConnected = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    isConnected = true;
    console.log('🍃 [Database] Connected successfully to MongoDB Cloud Database!');
    return true;
  } catch (err) {
    console.error('⚠️  [Database] MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production' && (process.env.REQUIRE_MONGODB === 'true' || process.env.STRICT_DB === 'true')) {
      throw new Error(`CRITICAL: Production MongoDB connection failed: ${err.message}. Aborting to prevent silent data loss.`);
    }
    console.log('📦 [Database] Falling back to Local Storage Mode (server/data/*.json).');
    isConnected = false;
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
});

module.exports = {
  connectDB,
  isMongoConnected: () => isConnected
};
