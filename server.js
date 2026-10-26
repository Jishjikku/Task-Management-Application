require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { sign, auth } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Models ----------
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true }));

const Task = mongoose.model('Task', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: Date
}, { timestamps: true }));

// ---------- Real-time (optional feature): each user has a private room ----------
io.on('connection', (socket) => {
  try {
    const { id } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.join(id);
  } catch { socket.disconnect(); }
});
const notify = (userId) => io.to(String(userId)).emit('tasks:changed');

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: { name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user: { name: user.name, email: user.email } });
});

// ---------- Tasks (CRUD) – every query is scoped to the logged-in user (authorization) ----------
app.get('/api/tasks', auth, async (req, res) => {
  res.json(await Task.find({ user: req.user.id }).sort({ createdAt: -1 }));
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = await Task.create({ user: req.user.id, title, description, status, priority, dueDate: dueDate || undefined });
    notify(req.user.id);
    res.status(201).json(task);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title, description, status, priority, dueDate },
      { new: true, runValidators: true, omitUndefined: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    notify(req.user.id);
    res.json(task);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  notify(req.user.id);
  res.json({ ok: true });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => server.listen(PORT, () => console.log(`Task Manager running on http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
