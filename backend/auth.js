// ✅ auth.js (NEW FILE in backend)
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const usersFile = path.join(__dirname, './data/users.json');
const SECRET = 'devnest-secret';

function loadUsers() {
  if (!fs.existsSync(usersFile)) return [];
  const data = fs.readFileSync(usersFile, 'utf-8');
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function createUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Username and password required');

  const users = loadUsers();
  if (users.find(u => u.username === username)) return res.status(409).send('User already exists');

  users.push({ username, password });
  saveUsers(users);
  res.status(201).send('User created');
}

function loginUser(req, res) {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).send('Invalid credentials');

  const token = jwt.sign({ username }, SECRET, { expiresIn: '1d' });
  res.json({ token });
}

module.exports = { createUser, loginUser };
