const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('📦 [Database] MONGODB_URI not provided. Running in Local Storage Mode (server/data/*.json).');
    console.log('ℹ️  [Database] To persist permanently in cloud MongoDB, set MONGODB_URI in .env or Render environment variables.');
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
    console.warn('⚠️  [Database] MongoDB connection error:', err.message);
    console.log('📦 [Database] Falling back seamlessly to Local Storage Mode (server/data/*.json).');
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
