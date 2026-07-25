import { useState, useEffect, useCallback } from 'react'
import Landing from './Landing'
import ParentLogin from './ParentLogin'
import KidLogin from './KidLogin'
import KidDashboard from './KidDashboard'
import ShufflePicker from './ShufflePicker'
import useConfetti from './useConfetti'
import Podium from './Podium'
import BadgeDisplay from './BadgeDisplay'

const API = '/api'

function ParentDashboard({ onLogout }) {
  const [kids, setKids] = useState([])
  const [current, setCurrent] = useState(null)
  const [nextKid, setNextKid] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [newKidName, setNewKidName] = useState('')
  const [elapsed, setElapsed] = useState('00:00:00')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerWinner, setPickerWinner] = useState(null)
  const [lastPun, setLastPun] = useState('')
  const [showPinChange, setShowPinChange] = useState(false)
  const [pinOld, setPinOld] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [editingKid, setEditingKid] = useState(null)
  const [editAvatar, setEditAvatar] = useState('')
  const [editPassphrase, setEditPassphrase] = useState('')
  const [emojiOptions, setEmojiOptions] = useState([])
  const fireConfetti = useConfetti()

  const fetchData = useCallback(async () => {
    try {
      const [kidsRes, currentRes, nextRes, historyRes, statsRes, emojiRes] = await Promise.all([
        fetch(`${API}/kids`),
        fetch(`${API}/shotgun/current`),
        fetch(`${API}/shotgun/next`),
        fetch(`${API}/shotgun/history?limit=20`),
        fetch(`${API}/stats`),
        fetch(`${API}/emoji-options`)
      ])
      setKids(await kidsRes.json())
      setCurrent(await currentRes.json())
      setNextKid(await nextRes.json())
      setHistory(await historyRes.json())
      setStats(await statsRes.json())
      setEmojiOptions(await emojiRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!current?.started_at) { setElapsed('00:00:00'); return }
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(current.started_at)) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [current])

  const assignShotgun = async (kidId) => {
    const res = await fetch(`${API}/shotgun/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_id: kidId })
    })
    const data = await res.json()
    setLastPun(data.pun || '')
    const kid = kids.find(k => k.id === kidId)
    if (kid) fireConfetti([kid.color, '#f59e0b', '#fff'])
    fetchData()
  }

  const handleShuffleAssign = async () => {
    if (!nextKid) return
    setShowPicker(true)
    setPickerWinner(null)
  }

  const handlePickerComplete = async () => {
    if (!nextKid) return
    await assignShotgun(nextKid.id)
    setShowPicker(false)
  }

  const clearShotgun = async () => {
    await fetch(`${API}/shotgun/clear`, { method: 'POST' })
    setLastPun('')
    fetchData()
  }

  const addKid = async (e) => {
    e.preventDefault()
    if (!newKidName.trim()) return
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6']
    const avatars = ['🚗', '🏎️', '🚕', '🚙', '🚌', '🚓']
    await fetch(`${API}/kids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newKidName.trim(),
        color: colors[kids.length % colors.length],
        avatar: avatars[kids.length % avatars.length],
        passphrase: 'vroom'
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

  const saveKidEdit = async () => {
    if (!editingKid) return
    await fetch(`${API}/kids/${editingKid.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: editAvatar, passphrase: editPassphrase })
    })
    setEditingKid(null)
    fetchData()
  }

  const changePin = async (e) => {
    e.preventDefault()
    setPinMsg('')
    const res = await fetch(`${API}/auth/admin/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin: pinOld, new_pin: pinNew })
    })
    const data = await res.json()
    if (data.success) {
      setPinMsg('PIN changed!')
      setPinOld('')
      setPinNew('')
      setTimeout(() => { setShowPinChange(false); setPinMsg('') }, 1500)
    } else {
      setPinMsg(data.error || 'Failed')
    }
  }

  const maxRides = Math.max(...stats.map(s => s.total_rides), 1)

  return (
    <div className="app">
      {showPicker && (
        <ShufflePicker
          kids={kids}
          winner={pickerWinner}
          onComplete={handlePickerComplete}
          kidColor={nextKid?.color}
        />
      )}

      <header className="header">
        <h1>Shotgun Seat Squad</h1>
        <p>Keeping the peace, one road trip at a time</p>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={onLogout}>Log Out</button>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
        <button className={`tab ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>Manage</button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className={`current-section ${current ? 'has-assignment' : ''}`}>
            <div className="current-label">Currently Riding Shotgun</div>
            {current ? (
              <>
                <div className="current-kid" style={{ color: current.color }}>
                  {current.avatar} {current.name}
                </div>
                <div className="current-timer">{elapsed}</div>
                {lastPun && <div className="current-pun">{lastPun}</div>}
                <div className="btn-group">
                  <button className="btn btn-secondary" onClick={clearShotgun}>End Ride</button>
                </div>
              </>
            ) : (
              <div className="current-empty">Nobody - ready for the next rider!</div>
            )}
          </div>

          {nextKid && (
            <div className="next-section">
              <div className="next-info">
                <span className="next-badge">Next Up</span>
                <span className="next-name" style={{ color: nextKid.color }}>{nextKid.avatar} {nextKid.name}</span>
                {nextKid.current_streak > 0 && (
                  <span className="streak-badge">🔥 {nextKid.current_streak}-streak</span>
                )}
              </div>
              <div className="btn-group">
                <button className="btn btn-primary" onClick={handleShuffleAssign}>
                  🎲 Pick Shotgun!
                </button>
                <button className="btn btn-secondary" onClick={() => assignShotgun(nextKid.id)}>
                  Quick Assign
                </button>
              </div>
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
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: kid.color }} />
                <div className="kid-avatar-display">{kid.avatar}</div>
                <div className="kid-name" style={{ color: kid.color }}>{kid.name}</div>
                <div className="kid-stats">
                  <span className="kid-stat-value">{kid.total_rides}</span> rides
                </div>
                {stats.find(s => s.id === kid.id)?.current_streak > 2 && (
                  <div className="streak-badge">🔥 {stats.find(s => s.id === kid.id).current_streak}-streak!</div>
                )}
                {stats.find(s => s.id === kid.id)?.achievements?.length > 0 && (
                  <div className="kid-card-badges">
                    {stats.find(s => s.id === kid.id).achievements.slice(0, 3).map(a => (
                      <span key={a.id} className="badge-mini" title={a.name}>{a.icon}</span>
                    ))}
                  </div>
                )}
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
        <>
          <Podium stats={stats} />
        </>
      )}

      {activeTab === 'history' && (
        <div className="history-section">
          <div className="section-title">Recent History</div>
          {history.length > 0 ? history.map(item => (
            <div key={item.id} className="history-item">
              <span className="history-kid" style={{ color: item.color }}>{item.avatar} {item.name}</span>
              <span className="history-date">
                {new Date(item.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="history-duration">{item.duration_minutes > 0 ? `${item.duration_minutes} min` : '—'}</span>
            </div>
          )) : (
            <div className="empty-state"><p>No history yet</p></div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <>
          <form className="add-kid-form" onSubmit={addKid}>
            <input type="text" placeholder="Add a new kid..." value={newKidName} onChange={(e) => setNewKidName(e.target.value)} />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <div className="kids-grid">
            {kids.map(kid => (
              <div key={kid.id} className="kid-card manage-kid-card" onClick={() => {
                setEditingKid(kid)
                setEditAvatar(kid.avatar)
                setEditPassphrase(kid.passphrase || '')
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: kid.color }} />
                <div className="kid-avatar-display">{kid.avatar}</div>
                <div className="kid-name" style={{ color: kid.color }}>{kid.name}</div>
                <div className="kid-stats">
                  <span className="kid-stat-value">{kid.total_rides}</span> rides
                </div>
                <div className="manage-kid-actions">
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); removeKid(kid.id) }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          {editingKid && (
            <div className="modal-overlay" onClick={() => setEditingKid(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Edit {editingKid.name}</h3>
                <div className="modal-field">
                  <label>Avatar</label>
                  <div className="emoji-picker-grid">
                    {emojiOptions.map(emoji => (
                      <button
                        key={emoji}
                        className={`emoji-option ${editAvatar === emoji ? 'emoji-selected' : ''}`}
                        onClick={() => setEditAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-field">
                  <label>Secret Word</label>
                  <input type="text" value={editPassphrase} onChange={e => setEditPassphrase(e.target.value)} />
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setEditingKid(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveKidEdit}>Save</button>
                </div>
              </div>
            </div>
          )}

          <div className="settings-section">
            <button className="btn btn-secondary" onClick={() => setShowPinChange(!showPinChange)}>
              {showPinChange ? 'Cancel' : '🔑 Change Admin PIN'}
            </button>
            {showPinChange && (
              <form className="pin-change-form" onSubmit={changePin}>
                <input type="password" placeholder="Current PIN" value={pinOld} onChange={e => setPinOld(e.target.value)} />
                <input type="password" placeholder="New PIN (4+ digits)" value={pinNew} onChange={e => setPinNew(e.target.value)} />
                <button type="submit" className="btn btn-primary">Change PIN</button>
                {pinMsg && <p className="pin-msg">{pinMsg}</p>}
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('landing')
  const [selectedKid, setSelectedKid] = useState(null)

  if (view === 'landing') {
    return (
      <Landing
        onSelectKid={(kid) => { setSelectedKid(kid); setView('kid-login') }}
        onSelectParent={() => setView('parent-login')}
      />
    )
  }

  if (view === 'parent-login') {
    return (
      <ParentLogin
        onLogin={() => setView('parent')}
        onBack={() => setView('landing')}
      />
    )
  }

  if (view === 'kid-login') {
    return (
      <KidLogin
        kid={selectedKid}
        onLogin={(kid) => { setSelectedKid(kid); setView('kid') }}
        onBack={() => { setView('landing'); setSelectedKid(null) }}
      />
    )
  }

  if (view === 'parent') {
    return <ParentDashboard onLogout={() => setView('landing')} />
  }

  if (view === 'kid') {
    return <KidDashboard kid={selectedKid} onLogout={() => { setView('landing'); setSelectedKid(null) }} />
  }

  return null
}
