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

// Data store
let data = {
  kids: [],
  history: [],
  current: null
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(raw);
    } else {
      // Seed with default kids
      const defaultColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B'];
      const names = ['Kenlee', 'Marcie', 'Annie', 'Jesse'];
      data.kids = names.map((name, i) => ({
        id: uuidv4(),
        name,
        color: defaultColors[i]
      }));
      saveData();
    }
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

// Initialize
loadData();

// GET all kids with their stats
app.get('/api/kids', (req, res) => {
  const kids = data.kids.map(kid => {
    const rides = data.history.filter(h => h.kid_id === kid.id);
    return {
      ...kid,
      total_rides: rides.length,
      last_ride: rides.length > 0 ? rides[rides.length - 1].assigned_at : null
    };
  });
  res.json(kids);
});

// POST a new kid
app.post('/api/kids', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const kid = {
    id: uuidv4(),
    name,
    color: color || '#6B7280'
  };
  data.kids.push(kid);
  saveData();
  res.status(201).json(kid);
});

// DELETE a kid
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

// GET current assignment
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
    color: kid.color
  });
});

// POST assign shotgun to a kid
app.post('/api/shotgun/assign', (req, res) => {
  const { kid_id } = req.body;
  if (!kid_id) return res.status(400).json({ error: 'kid_id is required' });

  const kid = data.kids.find(k => k.id === kid_id);
  if (!kid) return res.status(404).json({ error: 'Kid not found' });

  const now = new Date().toISOString();

  // Close out current assignment if one exists
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

  // Set new assignment
  data.current = { kid_id, started_at: now };

  // Add to history
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
    started_at: now
  });
});

// POST clear current assignment
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

// GET rotation order (who's next based on least rides)
app.get('/api/shotgun/next', (req, res) => {
  if (data.kids.length === 0) return res.json(null);
  
  const rideCounts = data.kids.map(kid => ({
    ...kid,
    total_rides: data.history.filter(h => h.kid_id === kid.id).length
  }));
  
  rideCounts.sort((a, b) => a.total_rides - b.total_rides);
  
  // If there's a tie, shuffle among tied kids
  const minRides = rideCounts[0].total_rides;
  const tied = rideCounts.filter(k => k.total_rides === minRides);
  const next = tied[Math.floor(Math.random() * tied.length)];
  
  res.json(next);
});

// GET history
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
        color: kid ? kid.color : '#6B7280'
      };
    });
  res.json(history);
});

// GET stats
app.get('/api/stats', (req, res) => {
  const stats = data.kids.map(kid => {
    const rides = data.history.filter(h => h.kid_id === kid.id);
    const totalMinutes = rides.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
    return {
      id: kid.id,
      name: kid.name,
      color: kid.color,
      total_rides: rides.length,
      total_minutes: totalMinutes,
      last_ride: rides.length > 0 ? rides[rides.length - 1].assigned_at : null
    };
  });
  stats.sort((a, b) => b.total_rides - a.total_rides);
  res.json(stats);
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
