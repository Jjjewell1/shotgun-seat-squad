const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'shotgun-data.json');
const APP_URL = process.env.APP_URL || '';

app.use(cors());
app.use(express.json());

const adminSessions = new Set();

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

// === PUSHOVER ===

async function sendPushNotification(title, message, url) {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const appToken = process.env.PUSHOVER_APP_TOKEN;
  if (!userKey || !appToken) return;
  try {
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: appToken,
        user: userKey,
        title,
        message,
        url: url || undefined,
        url_title: url ? 'Approve or Deny' : undefined
      })
    });
  } catch (err) {
    console.error('Pushover notification failed:', err.message);
  }
}

const CAR_PUNS = [
  "Buckle up, {name}! 🎉",
  "{name} calls shotgun! 🎯",
  "All aboard the {name} express! 🚂",
  "Shotgun secured by {name}! 💺",
  "The {name} era has begun! 👑",
  "Riding dirty... I mean, riding shotgun — {name}! 😎",
  "{name} is calling the tunes! 🎵",
  "Front seat royalty: {name}! 🏰",
  "{name} has claimed the throne! 🪑",
  "Seatbelt on, {name} — let's roll! 🛞",
  "No backseat for {name} today! 🚀",
  "{name} gets the window AND the tunes! 🎶",
  "Shotgun goes to... {name}! Drumroll please... 🥁",
  "{name} is riding up front! Driver, step on it! ⚡",
  "The shotgun gods have spoken: {name}! 🔮",
  "{name} just won the front seat lottery! 🎰",
  "VIP seat goes to {name}! 🌟",
  "Shotgun champion: {name}! Trophy included! 🏆",
  "Navigator duties go to {name}! Map included! 🗺️",
  "Co-pilot {name}, reporting for duty! ✈️"
];

const VOICE_LINES = [
  "Time to buckle up, buttercup!",
  "Shotgun! No takebacks!",
  "The road awaits, your highness!",
  "Vroom vroom, here comes trouble!",
  "Front seat VIP, coming through!",
  "All eyes on the road... and the new champion!",
  "Winner winner, car seat dinner!",
  "Legends ride up front!",
  "The throne is yours, your majesty!",
  "Saddle up, partner!",
  "Mission accepted, let's roll!",
  "The chosen one has been selected!",
  "Bow down to the shotgun monarch!",
  "Adventure awaits in the front seat!",
  "And the crowd goes wild!"
];

const EMOJI_OPTIONS = [
  '🚗', '🏎️', '🚕', '🚌', '🚓', '🚑', '🚒', '🚐', '🚚', '🚙',
  '🐶', '🐱', '🦄', '🐻', '🐼', '🦊', '🐸', '🦁', '🐯', '🐮',
  '⚡', '🌟', '🔥', '💎', '🎮', '🎵', '🚀', '✈️', '🦸', '🧑‍🚀',
  '🏀', '⚽', '🎸', '🎯', '🌈'
];

let data = {
  admin_pin: '1234',
  kids: [],
  history: [],
  current: null,
  pending_request: null,
  shotgun_picks: [],
  branding: null
};

const BRANDING_DIR = path.join(__dirname, 'branding');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(raw);
      if (!data.admin_pin) data.admin_pin = '1234';
      if (!data.shotgun_picks) data.shotgun_picks = [];
    } else {
      const defaultColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B'];
      const names = ['Kenlee', 'Marcie', 'Annie', 'Jesse'];
      const defaultAvatars = ['🚗', '🏎️', '🚕', '🚙'];
      const defaultPassphrases = ['vroom', 'zoom', 'beep', 'honk'];
      data.kids = names.map((name, i) => ({
        id: uuidv4(),
        name,
        color: defaultColors[i],
        avatar: defaultAvatars[i],
        passphrase: defaultPassphrases[i],
        game_highscores: {
          tictactoe: 0,
          dragrace_wins: 0,
          memory_best: null,
          traffic_dodge_best: 0,
          license_best: null,
          pitstop_best: 0
        }
      }));
      saveData();
    }
  } catch (err) {
    console.error('Failed to load data:', err);
  }

  let migrated = false;
  const defaultAvatars = ['🚗', '🏎️', '🚕', '🚙', '🚌', '🚓'];
  const defaultPassphrases = ['vroom', 'zoom', 'beep', 'honk', 'vroom', 'zoom'];
  data.kids.forEach((kid, i) => {
    if (!kid.avatar) { kid.avatar = defaultAvatars[i % defaultAvatars.length]; migrated = true; }
    if (!kid.passphrase) { kid.passphrase = defaultPassphrases[i % defaultPassphrases.length]; migrated = true; }
    if (!kid.game_highscores) {
      kid.game_highscores = { tictactoe: 0, dragrace_wins: 0, memory_best: null, traffic_dodge_best: 0, license_best: null, pitstop_best: 0 };
      migrated = true;
    }
  });
  if (!data.shotgun_picks) { data.shotgun_picks = []; migrated = true; }
  if (migrated) saveData();
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

loadData();

function getKidStats(kidId) {
  const rides = data.history.filter(h => h.kid_id === kidId);
  const totalMinutes = rides.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);

  let currentStreak = 0;
  const reversed = [...data.history].reverse();
  for (const entry of reversed) {
    if (entry.kid_id === kidId) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    total_rides: rides.length,
    total_minutes: totalMinutes,
    current_streak: currentStreak,
    last_ride: rides.length > 0 ? rides[rides.length - 1].assigned_at : null
  };
}

function getFairnessScore(kidId) {
  const stats = getKidStats(kidId);
  return stats.total_rides + (stats.total_minutes / 30);
}

function computeAchievements(kidId) {
  const stats = getKidStats(kidId);
  const allStats = data.kids.map(k => ({ id: k.id, ...getKidStats(k.id) }));
  const maxRides = Math.max(...allStats.map(s => s.total_rides), 0);
  const achievements = [];

  if (stats.total_rides >= 1) achievements.push({ id: 'first_ride', name: 'First Ride', icon: '🚗' });
  if (stats.current_streak >= 3) achievements.push({ id: 'on_fire', name: 'On Fire', icon: '🔥' });
  if (stats.total_rides === maxRides && stats.total_rides > 0) achievements.push({ id: 'royalty', name: 'Shotgun Royalty', icon: '👑' });
  if (stats.total_minutes >= 60) achievements.push({ id: 'road_warrior', name: 'Road Warrior', icon: '⏱' });
  if (stats.total_rides >= 10) achievements.push({ id: 'veteran', name: 'Veteran', icon: '🏆' });
  const leaderDiff = maxRides - stats.total_rides;
  if (leaderDiff <= 1 && leaderDiff >= 0 && stats.total_rides > 0) achievements.push({ id: 'near_top', name: 'Near the Top', icon: '⭐' });

  return achievements;
}

function getRandomPun(name) {
  const pun = CAR_PUNS[Math.floor(Math.random() * CAR_PUNS.length)];
  return pun.replace(/{name}/g, name);
}

function getRandomVoiceLine() {
  return VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)];
}

// === AUTH ENDPOINTS ===

app.post('/api/auth/admin', (req, res) => {
  const { pin } = req.body;
  if (pin === data.admin_pin) {
    const token = uuidv4();
    adminSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Wrong PIN' });
  }
});

app.post('/api/auth/admin/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

app.post('/api/auth/admin/pin', requireAdmin, (req, res) => {
  const { old_pin, new_pin } = req.body;
  if (old_pin !== data.admin_pin) {
    return res.status(401).json({ success: false, error: 'Wrong current PIN' });
  }
  if (!new_pin || new_pin.length < 4) {
    return res.status(400).json({ success: false, error: 'PIN must be at least 4 digits' });
  }
  data.admin_pin = new_pin;
  saveData();
  res.json({ success: true });
});

app.post('/api/auth/kid', (req, res) => {
  const { kid_id, passphrase } = req.body;
  const kid = data.kids.find(k => k.id === kid_id);
  if (!kid) return res.status(404).json({ success: false, error: 'Kid not found' });
  if (!kid.passphrase) {
    kid.passphrase = 'vroom';
    saveData();
  }
  if (kid.passphrase.toLowerCase() === passphrase.toLowerCase()) {
    if (!kid.avatar) kid.avatar = '🚗';
    res.json({ success: true, kid: { id: kid.id, name: kid.name, avatar: kid.avatar, color: kid.color } });
  } else {
    res.status(401).json({ success: false, error: 'Wrong passphrase' });
  }
});

// === KID ENDPOINTS ===

app.get('/api/kids', (req, res) => {
  const kids = data.kids.map(kid => {
    const stats = getKidStats(kid.id);
    return {
      ...kid,
      total_rides: stats.total_rides,
      last_ride: stats.last_ride
    };
  });
  res.json(kids);
});

app.post('/api/kids', requireAdmin, (req, res) => {
  const { name, color, avatar, passphrase } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (name.length > 20) return res.status(400).json({ error: 'Name must be 20 characters or less' });
  const kid = {
    id: uuidv4(),
    name,
    color: color || '#6B7280',
    avatar: avatar || '🚗',
    passphrase: passphrase || 'vroom',
    game_highscores: {
      tictactoe: 0,
      dragrace_wins: 0,
      memory_best: null,
      traffic_dodge_best: 0,
      license_best: null,
      pitstop_best: 0
    }
  };
  data.kids.push(kid);
  saveData();
  res.status(201).json(kid);
});

app.patch('/api/kids/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const kid = data.kids.find(k => k.id === id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const { name, color, avatar, passphrase } = req.body;
  if (name !== undefined) {
    if (name.length > 20) return res.status(400).json({ error: 'Name must be 20 characters or less' });
    kid.name = name;
  }
  if (color !== undefined) kid.color = color;
  if (avatar !== undefined) kid.avatar = avatar;
  if (passphrase !== undefined) kid.passphrase = passphrase;
  saveData();
  res.json(kid);
});

app.put('/api/kids/:id/highscores', (req, res) => {
  const { id } = req.params;
  const kid = data.kids.find(k => k.id === id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const { game, score } = req.body;
  if (!kid.game_highscores) {
    kid.game_highscores = {};
  }
  const current = kid.game_highscores[game];

  if (game === 'memory_best') {
    if (current === null || score < current) {
      kid.game_highscores[game] = score;
    }
  } else if (game === 'license_best') {
    if (current === null || score < current) {
      kid.game_highscores[game] = score;
    }
  } else {
    if (score > (current || 0)) {
      kid.game_highscores[game] = score;
    }
  }

  saveData();
  res.json({ game_highscores: kid.game_highscores });
});

app.delete('/api/kids/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  data.kids = data.kids.filter(k => k.id !== id);
  data.history = data.history.filter(h => h.kid_id !== id);
  if (data.current && data.current.kid_id === id) {
    data.current = null;
  }
  saveData();
  res.json({ success: true });
});

// === SHOTGUN ENDPOINTS ===

app.get('/api/shotgun/current', (req, res) => {
  if (!data.current) return res.json(null);
  const kid = data.kids.find(k => k.id === data.current.kid_id);
  if (!kid) {
    data.current = null;
    saveData();
    return res.json(null);
  }
  res.json({
    kid_id: kid.id,
    started_at: data.current.started_at,
    name: kid.name,
    color: kid.color,
    avatar: kid.avatar
  });
});

app.post('/api/shotgun/assign', requireAdmin, (req, res) => {
  const { kid_id } = req.body;
  if (!kid_id) return res.status(400).json({ error: 'kid_id is required' });

  const kid = data.kids.find(k => k.id === kid_id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const now = new Date().toISOString();

  if (data.current && data.current.kid_id) {
    const historyEntry = data.history.find(
      h => h.kid_id === data.current.kid_id && h.assigned_at === data.current.started_at
    );
    if (historyEntry) {
      const startedAt = new Date(data.current.started_at);
      const duration = Math.floor((new Date(now) - startedAt) / 60000);
      historyEntry.duration_minutes = duration;
    }
  }

  data.current = { kid_id, started_at: now };

  data.history.push({
    id: uuidv4(),
    kid_id,
    assigned_at: now,
    duration_minutes: 0
  });

  saveData();

  res.json({
    name: kid.name,
    color: kid.color,
    avatar: kid.avatar,
    started_at: now,
    pun: getRandomPun(kid.name)
  });
});

app.post('/api/shotgun/clear', requireAdmin, (req, res) => {
  if (data.current && data.current.kid_id) {
    const now = new Date().toISOString();
    const historyEntry = data.history.find(
      h => h.kid_id === data.current.kid_id && h.assigned_at === data.current.started_at
    );
    if (historyEntry) {
      const startedAt = new Date(data.current.started_at);
      const duration = Math.floor((new Date(now) - startedAt) / 60000);
      historyEntry.duration_minutes = duration;
    }
  }
  data.current = null;
  saveData();
  res.json({ success: true });
});

// === HISTORY EDIT ===

app.patch('/api/shotgun/history/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const entry = data.history.find(h => h.id === id);
  if (!entry) return res.status(404).json({ error: 'History entry not found' });

  const { duration_minutes, started_at } = req.body;
  if (duration_minutes !== undefined) {
    entry.duration_minutes = Math.max(0, parseInt(duration_minutes) || 0);
  }
  if (started_at !== undefined) {
    entry.assigned_at = started_at;
  }

  saveData();

  const kid = data.kids.find(k => k.id === entry.kid_id);
  res.json({
    ...entry,
    name: kid ? kid.name : 'Unknown',
    color: kid ? kid.color : '#6B7280',
    avatar: kid ? kid.avatar : '🚗'
  });
});

app.delete('/api/shotgun/history/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const entry = data.history.find(h => h.id === id);
  if (!entry) return res.status(404).json({ error: 'History entry not found' });
  data.history = data.history.filter(h => h.id !== id);
  saveData();
  res.json({ success: true });
});

// === PENDING REQUEST ENDPOINTS ===

app.get('/api/shotgun/request', (req, res) => {
  res.json(data.pending_request || null);
});

app.post('/api/shotgun/request', (req, res) => {
  const { requested_by, kid_id } = req.body;
  if (!requested_by || !kid_id) return res.status(400).json({ error: 'requested_by and kid_id required' });

  const requester = data.kids.find(k => k.id === requested_by);
  const target = data.kids.find(k => k.id === kid_id);
  if (!requester || !target) return res.status(404).json({ error: 'Kid not found' });

  const secretToken = uuidv4();

  data.pending_request = {
    id: uuidv4(),
    requested_by: requester.id,
    requested_by_name: requester.name,
    requested_by_avatar: requester.avatar,
    requested_by_color: requester.color,
    kid_id: target.id,
    kid_name: target.name,
    kid_avatar: target.avatar,
    kid_color: target.color,
    secret_token: secretToken,
    created_at: new Date().toISOString()
  };

  data.shotgun_picks.push({
    id: data.pending_request.id,
    requested_by: requester.id,
    requested_by_name: requester.name,
    kid_id: target.id,
    kid_name: target.name,
    created_at: data.pending_request.created_at,
    status: 'pending'
  });

  saveData();

  const approveUrl = APP_URL ? `${APP_URL}/approve/${secretToken}` : '';
  sendPushNotification(
    'Shotgun Request! 🚗',
    `${requester.name} picked ${target.name} for shotgun!`,
    approveUrl
  );

  res.json(data.pending_request);
});

app.post('/api/shotgun/request/approve', requireAdmin, (req, res) => {
  if (!data.pending_request) return res.status(404).json({ error: 'No pending request' });

  const { kid_id } = data.pending_request;
  const now = new Date().toISOString();

  if (data.current && data.current.kid_id) {
    const historyEntry = data.history.find(
      h => h.kid_id === data.current.kid_id && h.assigned_at === data.current.started_at
    );
    if (historyEntry) {
      const startedAt = new Date(data.current.started_at);
      const duration = Math.floor((new Date(now) - startedAt) / 60000);
      historyEntry.duration_minutes = duration;
    }
  }

  data.current = { kid_id, started_at: now };
  data.history.push({ id: uuidv4(), kid_id, assigned_at: now, duration_minutes: 0 });

  const pick = data.shotgun_picks.find(p => p.id === data.pending_request.id);
  if (pick) pick.status = 'approved';

  const kid = data.kids.find(k => k.id === kid_id);
  const pun = getRandomPun(kid.name);
  const approved = { ...data.pending_request, approved: true };
  data.pending_request = null;
  saveData();

  res.json({ success: true, pun, request: approved });
});

app.post('/api/shotgun/request/deny', requireAdmin, (req, res) => {
  const pick = data.shotgun_picks.find(p => p.id === data.pending_request?.id);
  if (pick) pick.status = 'denied';

  const denied = data.pending_request;
  data.pending_request = null;
  saveData();
  res.json({ success: true, request: denied });
});

// === TOKEN-BASED APPROVE/DENY (no auth needed) ===

app.get('/api/shotgun/approve/:token', (req, res) => {
  if (!data.pending_request) return res.status(404).json({ error: 'No pending request', handled: true });
  if (data.pending_request.secret_token !== req.params.token) {
    return res.status(404).json({ error: 'Invalid or expired token', handled: true });
  }
  res.json(data.pending_request);
});

app.post('/api/shotgun/approve/:token', (req, res) => {
  if (!data.pending_request) return res.status(404).json({ error: 'No pending request', handled: true });
  if (data.pending_request.secret_token !== req.params.token) {
    return res.status(404).json({ error: 'Invalid or expired token', handled: true });
  }

  const { kid_id } = data.pending_request;
  const now = new Date().toISOString();

  if (data.current && data.current.kid_id) {
    const historyEntry = data.history.find(
      h => h.kid_id === data.current.kid_id && h.assigned_at === data.current.started_at
    );
    if (historyEntry) {
      const startedAt = new Date(data.current.started_at);
      const duration = Math.floor((new Date(now) - startedAt) / 60000);
      historyEntry.duration_minutes = duration;
    }
  }

  data.current = { kid_id, started_at: now };
  data.history.push({ id: uuidv4(), kid_id, assigned_at: now, duration_minutes: 0 });

  const pick = data.shotgun_picks.find(p => p.id === data.pending_request.id);
  if (pick) pick.status = 'approved';

  const kid = data.kids.find(k => k.id === kid_id);
  const pun = getRandomPun(kid.name);
  const approved = { ...data.pending_request, approved: true };
  data.pending_request = null;
  saveData();

  res.json({ success: true, pun, request: approved, voice_line: getRandomVoiceLine() });
});

app.post('/api/shotgun/deny/:token', (req, res) => {
  if (!data.pending_request) return res.status(404).json({ error: 'No pending request', handled: true });
  if (data.pending_request.secret_token !== req.params.token) {
    return res.status(404).json({ error: 'Invalid or expired token', handled: true });
  }

  const pick = data.shotgun_picks.find(p => p.id === data.pending_request.id);
  if (pick) pick.status = 'denied';

  const denied = data.pending_request;
  data.pending_request = null;
  saveData();
  res.json({ success: true, request: denied });
});

// === PICK LOG ===

app.get('/api/shotgun/picks', requireAdmin, (req, res) => {
  const picks = [...data.shotgun_picks].reverse();
  res.json(picks);
});

app.delete('/api/shotgun/picks/:id', requireAdmin, (req, res) => {
  data.shotgun_picks = data.shotgun_picks.filter(p => p.id !== req.params.id);
  saveData();
  res.json({ success: true });
});

app.delete('/api/shotgun/picks', requireAdmin, (req, res) => {
  data.shotgun_picks = [];
  saveData();
  res.json({ success: true });
});

// === NEXT / HISTORY / STATS ===

app.get('/api/shotgun/next', (req, res) => {
  if (data.kids.length === 0) return res.json(null);

  const scored = data.kids.map(kid => ({
    ...kid,
    total_rides: getKidStats(kid.id).total_rides,
    total_minutes: getKidStats(kid.id).total_minutes,
    fairness_score: getFairnessScore(kid.id)
  }));

  scored.sort((a, b) => a.fairness_score - b.fairness_score);

  const minScore = scored[0].fairness_score;
  const tied = scored.filter(k => Math.abs(k.fairness_score - minScore) < 0.001);
  const next = tied[Math.floor(Math.random() * tied.length)];

  res.json(next);
});

app.get('/api/shotgun/fair-pool', (req, res) => {
  if (data.kids.length === 0) return res.json([]);

  const scored = data.kids.map(kid => ({
    ...kid,
    total_rides: getKidStats(kid.id).total_rides,
    total_minutes: getKidStats(kid.id).total_minutes,
    fairness_score: getFairnessScore(kid.id)
  }));

  scored.sort((a, b) => a.fairness_score - b.fairness_score);

  const minScore = scored[0].fairness_score;
  const fairPool = scored.filter(k => Math.abs(k.fairness_score - minScore) < 0.001);

  res.json(fairPool);
});

app.get('/api/shotgun/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const history = [...data.history]
    .reverse()
    .slice(0, limit)
    .map(entry => {
      const kid = data.kids.find(k => k.id === entry.kid_id);
      return {
        ...entry,
        name: kid ? kid.name : 'Unknown',
        color: kid ? kid.color : '#6B7280',
        avatar: kid ? kid.avatar : '🚗'
      };
    });
  res.json(history);
});

app.get('/api/stats', (req, res) => {
  const stats = data.kids.map(kid => {
    const kidStats = getKidStats(kid.id);
    return {
      id: kid.id,
      name: kid.name,
      color: kid.color,
      avatar: kid.avatar,
      total_rides: kidStats.total_rides,
      total_minutes: kidStats.total_minutes,
      current_streak: kidStats.current_streak,
      fairness_score: Math.round(getFairnessScore(kid.id) * 100) / 100,
      last_ride: kidStats.last_ride,
      achievements: computeAchievements(kid.id),
      game_highscores: kid.game_highscores || {}
    };
  });
  stats.sort((a, b) => b.total_rides - a.total_rides);
  res.json(stats);
});

app.get('/api/kid/:id/dashboard', (req, res) => {
  const kid = data.kids.find(k => k.id === req.params.id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const kidStats = getKidStats(kid.id);
  const allScores = data.kids.map(k => ({
    id: k.id,
    name: k.name,
    avatar: k.avatar,
    color: k.color,
    ...getKidStats(k.id),
    fairness_score: Math.round(getFairnessScore(k.id) * 100) / 100
  }));
  allScores.sort((a, b) => a.fairness_score - b.fairness_score);

  const rank = allScores.findIndex(s => s.id === kid.id) + 1;

  res.json({
    kid: { id: kid.id, name: kid.name, avatar: kid.avatar, color: kid.color },
    stats: { ...kidStats, fairness_score: Math.round(getFairnessScore(kid.id) * 100) / 100 },
    rank,
    leaderboard: allScores,
    achievements: computeAchievements(kid.id),
    game_highscores: kid.game_highscores || {},
    current: data.current ? (() => {
      const ck = data.kids.find(k => k.id === data.current.kid_id);
      return ck ? { name: ck.name, avatar: ck.avatar, color: ck.color, started_at: data.current.started_at } : null;
    })() : null,
    next: data.kids.length > 0 ? (() => {
      const scored = [...allScores];
      scored.sort((a, b) => a.fairness_score - b.fairness_score);
      const minScore = scored[0].fairness_score;
      const tied = scored.filter(k => Math.abs(k.fairness_score - minScore) < 0.001);
      return tied[Math.floor(Math.random() * tied.length)];
    })() : null,
    pending_request: data.pending_request
  });
});

app.get('/api/emoji-options', (req, res) => {
  res.json(EMOJI_OPTIONS);
});

// === BRANDING ENDPOINTS ===

app.get('/api/branding', (req, res) => {
  res.json(data.branding || { hasLogo: false });
});

app.post('/api/branding/logo', requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const inputBuffer = req.file.buffer;

    // Generate all required sizes
    const sizes = {
      'favicon-16.png': { width: 16, height: 16 },
      'favicon-32.png': { width: 32, height: 32 },
      'icon-192.png': { width: 192, height: 192 },
      'icon-512.png': { width: 512, height: 512 },
      'logo.png': { width: 400, height: 400 }
    };

    const generatedFiles = {};

    for (const [filename, dims] of Object.entries(sizes)) {
      const filepath = path.join(BRANDING_DIR, filename);
      await sharp(inputBuffer)
        .resize(dims.width, dims.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(filepath);
      generatedFiles[filename] = `/branding/${filename}?t=${Date.now()}`;
    }

    // Generate SVG favicon
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <image href="/branding/icon-512.png" width="512" height="512"/>
    </svg>`;
    fs.writeFileSync(path.join(BRANDING_DIR, 'favicon.svg'), svgFavicon);
    generatedFiles['favicon.svg'] = `/branding/favicon.svg?t=${Date.now()}`;

    // Update manifest icon references
    const manifestPath = path.join(__dirname, '..', 'client', 'dist', 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.icons) {
          manifest.icons.forEach(icon => {
            if (icon.src.includes('favicon.svg')) {
              icon.src = generatedFiles['favicon.svg'];
            }
          });
        }
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      } catch (e) {
        console.error('Failed to update manifest:', e);
      }
    }

    data.branding = {
      hasLogo: true,
      uploadedAt: new Date().toISOString(),
      files: generatedFiles
    };
    saveData();

    res.json({
      success: true,
      branding: data.branding
    });
  } catch (err) {
    console.error('Branding upload error:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.delete('/api/branding/logo', requireAdmin, (req, res) => {
  try {
    const files = ['favicon-16.png', 'favicon-32.png', 'icon-192.png', 'icon-512.png', 'logo.png', 'favicon.svg'];
    files.forEach(file => {
      const filepath = path.join(BRANDING_DIR, file);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    });

    data.branding = null;
    saveData();

    res.json({ success: true });
  } catch (err) {
    console.error('Branding delete error:', err);
    res.status(500).json({ error: 'Failed to remove branding' });
  }
});

// Serve branding assets
app.use('/branding', express.static(BRANDING_DIR));

// Serve static client build in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shotgun Seat Squad server running on port ${PORT}`);
});
