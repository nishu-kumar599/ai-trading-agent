const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { isMongoConnected } = require('./config/database');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize users file with a default demo trader account if empty
function initializeDB() {
  if (!fs.existsSync(USERS_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('demo1234', salt);

    const initialUsers = [
      {
        id: 'usr_demo_trader_001',
        name: 'Demo Trader',
        email: 'demo@aitrading.com',
        password: demoPasswordHash,
        createdAt: new Date().toISOString(),
        role: 'trader'
      }
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
    console.log('📦 Database initialized with demo trader: demo@aitrading.com / demo1234');
  }
}

initializeDB();

function readUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error('Error reading users db:', err.message);
  }
  return [];
}

function writeUsersToDisk(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users db:', err.message);
  }
}

// Sync users between MongoDB and Disk
async function syncUsersWithMongo() {
  if (!isMongoConnected()) return;
  try {
    const User = require('./models/User');
    const mongoCount = await User.countDocuments();
    const diskUsers = readUsersFromDisk();

    if (mongoCount === 0 && diskUsers.length > 0) {
      console.log('🍃 [Database] Seeding MongoDB with existing user accounts...');
      for (const u of diskUsers) {
        await User.create({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role || 'trader',
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
        });
      }
      console.log(`🍃 [Database] Seeded ${diskUsers.length} users to MongoDB.`);
    }
  } catch (err) {
    console.warn('⚠️ [Database] User sync warning:', err.message);
  }
}

async function findUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  if (isMongoConnected()) {
    try {
      const User = require('./models/User');
      const doc = await User.findOne({ email: cleanEmail }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('Mongo findUserByEmail fallback to disk:', err.message);
    }
  }

  const users = readUsersFromDisk();
  return users.find(u => u.email.toLowerCase() === cleanEmail) || null;
}

async function findUserById(id) {
  if (!id) return null;

  if (isMongoConnected()) {
    try {
      const User = require('./models/User');
      const doc = await User.findOne({ id }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('Mongo findUserById fallback to disk:', err.message);
    }
  }

  const users = readUsersFromDisk();
  return users.find(u => u.id === id) || null;
}

async function createUser({ name, email, passwordHash, role = 'trader' }) {
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: passwordHash,
    createdAt: new Date().toISOString(),
    role
  };

  // 1. Write to local JSON disk
  const users = readUsersFromDisk();
  users.push(newUser);
  writeUsersToDisk(users);

  // 2. Write to MongoDB if connected
  if (isMongoConnected()) {
    try {
      const User = require('./models/User');
      await User.create({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        createdAt: new Date(newUser.createdAt)
      });
      console.log(`🍃 [Database] User saved to MongoDB: ${newUser.email}`);
    } catch (err) {
      console.warn('Mongo createUser error (saved to disk):', err.message);
    }
  }

  return newUser;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  readUsers: readUsersFromDisk,
  syncUsersWithMongo
};
