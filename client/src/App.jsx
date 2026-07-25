import { useState, useEffect, useCallback } from 'react'

const API = '/api'

function App() {
  const [kids, setKids] = useState([])
  const [current, setCurrent] = useState(null)
  const [nextKid, setNextKid] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [newKidName, setNewKidName] = useState('')
  const [elapsed, setElapsed] = useState('00:00:00')

  const fetchData = useCallback(async () => {
    try {
      const [kidsRes, currentRes, nextRes, historyRes, statsRes] = await Promise.all([
        fetch(`${API}/kids`),
        fetch(`${API}/shotgun/current`),
        fetch(`${API}/shotgun/next`),
        fetch(`${API}/shotgun/history?limit=20`),
        fetch(`${API}/stats`)
      ])
      setKids(await kidsRes.json())
      setCurrent(await currentRes.json())
      setNextKid(await nextRes.json())
      setHistory(await historyRes.json())
      setStats(await statsRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!current?.started_at) {
      setElapsed('00:00:00')
      return
    }

    const timer = setInterval(() => {
      const start = new Date(current.started_at)
      const now = new Date()
      const diff = Math.floor((now - start) / 1000)
      const hours = String(Math.floor(diff / 3600)).padStart(2, '0')
      const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const seconds = String(diff % 60).padStart(2, '0')
      setElapsed(`${hours}:${minutes}:${seconds}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [current])

  const assignShotgun = async (kidId) => {
    await fetch(`${API}/shotgun/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_id: kidId })
    })
    fetchData()
  }

  const clearShotgun = async () => {
    await fetch(`${API}/shotgun/clear`, { method: 'POST' })
    fetchData()
  }

  const addKid = async (e) => {
    e.preventDefault()
    if (!newKidName.trim()) return
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316']
    await fetch(`${API}/kids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newKidName.trim(),
        color: colors[kids.length % colors.length]
      })
    })
    setNewKidName('')
    fetchData()
  }

  const removeKid = async (kidId) => {
    if (!confirm('Remove this kid from the squad?')) return
    await fetch(`${API}/kids/${kidId}`, { method: 'DELETE' })
    fetchData()
  }

  const maxRides = Math.max(...stats.map(s => s.total_rides), 1)

  return (
    <div className="app">
      <header className="header">
        <h1>Shotgun Seat Squad</h1>
        <p>Keeping the peace, one road trip at a time</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className={`current-section ${current ? 'has-assignment' : ''}`}>
            <div className="current-label">Currently Riding Shotgun</div>
            {current ? (
              <>
                <div className="current-kid" style={{ color: current.color }}>
                  {current.name}
                </div>
                <div className="current-timer">{elapsed}</div>
              </>
            ) : (
              <div className="current-empty">Nobody - ready for the next rider!</div>
            )}
            {current && (
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={clearShotgun}>
                  End Ride
                </button>
              </div>
            )}
          </div>

          {nextKid && (
            <div className="next-section">
              <div className="next-info">
                <span className="next-badge">Next Up</span>
                <span className="next-name" style={{ color: nextKid.color }}>
                  {nextKid.name}
                </span>
              </div>
              <button className="btn btn-primary" onClick={() => assignShotgun(nextKid.id)}>
                Assign Shotgun
              </button>
            </div>
          )}

          <div className="kids-grid">
            {kids.map(kid => (
              <div 
                key={kid.id} 
                className={`kid-card ${current?.kid_id === kid.id ? 'active' : ''}`}
                style={{ '--kid-color': kid.color }}
                onClick={() => assignShotgun(kid.id)}
              >
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                  background: kid.color 
                }} />
                <div className="kid-name" style={{ color: kid.color }}>{kid.name}</div>
                <div className="kid-stats">
                  <span className="kid-stat-value">{kid.total_rides}</span> rides
                </div>
              </div>
            ))}
          </div>

          {kids.length === 0 && (
            <div className="empty-state">
              <div className="car-emoji">🚗</div>
              <p>Add your kids to get started!</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <div className="stats-section">
          <div className="section-title">Ride Counts</div>
          {stats.map(stat => (
            <div key={stat.id} className="stat-bar">
              <span className="stat-name" style={{ color: stat.color }}>{stat.name}</span>
              <div className="stat-bar-track">
                <div 
                  className="stat-bar-fill"
                  style={{ 
                    width: `${(stat.total_rides / maxRides) * 100}%`,
                    background: stat.color 
                  }}
                >
                  {stat.total_rides > 0 && `${stat.total_rides} rides`}
                </div>
              </div>
              <span className="stat-count">{stat.total_rides}</span>
            </div>
          ))}
          {stats.length === 0 && (
            <div className="empty-state">
              <p>No rides recorded yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-section">
          <div className="section-title">Recent History</div>
          {history.length > 0 ? history.map(item => (
            <div key={item.id} className="history-item">
              <span className="history-kid" style={{ color: item.color }}>{item.name}</span>
              <span className="history-date">
                {new Date(item.assigned_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
              <span className="history-duration">
                {item.duration_minutes > 0 ? `${item.duration_minutes} min` : '—'}
              </span>
            </div>
          )) : (
            <div className="empty-state">
              <p>No history yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <>
          <form className="add-kid-form" onSubmit={addKid}>
            <input
              type="text"
              placeholder="Add a new kid..."
              value={newKidName}
              onChange={(e) => setNewKidName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
          <div className="kids-grid">
            {kids.map(kid => (
              <div key={kid.id} className="kid-card">
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                  background: kid.color 
                }} />
                <div className="kid-name" style={{ color: kid.color }}>{kid.name}</div>
                <div className="kid-stats">
                  <span className="kid-stat-value">{kid.total_rides}</span> rides
                </div>
                <button 
                  className="btn btn-danger" 
                  style={{ marginTop: '12px', padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={(e) => { e.stopPropagation(); removeKid(kid.id); }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App
