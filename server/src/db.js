const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users db:', err);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users db:', err);
    throw err;
  }
}

function findUserByEmail(email) {
  if (!email) return null;
  const users = readUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

function findUserById(id) {
  if (!id) return null;
  const users = readUsers();
  return users.find(u => u.id === id) || null;
}

function createUser({ name, email, passwordHash, role = 'trader' }) {
  const users = readUsers();
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: passwordHash,
    createdAt: new Date().toISOString(),
    role
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  readUsers
};
