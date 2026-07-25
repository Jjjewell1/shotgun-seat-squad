const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'shotgun-data.json');

app.use(cors());
app.use(express.json());

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
  current: null
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(raw);
      if (!data.admin_pin) data.admin_pin = '1234';
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

// === AUTH ENDPOINTS ===

app.post('/api/auth/admin', (req, res) => {
  const { pin } = req.body;
  if (pin === data.admin_pin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Wrong PIN' });
  }
});

app.post('/api/auth/admin/pin', (req, res) => {
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
  if (kid.passphrase.toLowerCase() === passphrase.toLowerCase()) {
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

app.post('/api/kids', (req, res) => {
  const { name, color, avatar, passphrase } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
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

app.patch('/api/kids/:id', (req, res) => {
  const { id } = req.params;
  const kid = data.kids.find(k => k.id === id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const { name, color, avatar, passphrase } = req.body;
  if (name !== undefined) kid.name = name;
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

app.delete('/api/kids/:id', (req, res) => {
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

app.post('/api/shotgun/assign', (req, res) => {
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

app.post('/api/shotgun/clear', (req, res) => {
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
    })() : null
  });
});

app.get('/api/emoji-options', (req, res) => {
  res.json(EMOJI_OPTIONS);
});

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
