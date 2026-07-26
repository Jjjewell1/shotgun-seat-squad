import { useState, useEffect, useCallback } from 'react'
import Landing from './Landing'
import ParentLogin from './ParentLogin'
import KidLogin from './KidLogin'
import KidDashboard from './KidDashboard'
import ApprovePage from './ApprovePage'
import ShufflePicker from './ShufflePicker'
import useConfetti from './useConfetti'
import Podium from './Podium'
import BadgeDisplay from './BadgeDisplay'

const API = '/api'

function ParentDashboard({ onLogout, adminToken }) {
  const [kids, setKids] = useState([])
  const [current, setCurrent] = useState(null)
  const [nextKid, setNextKid] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState([])
  const [picks, setPicks] = useState([])
  const [fairPool, setFairPool] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [newKidName, setNewKidName] = useState('')
  const [elapsed, setElapsed] = useState('00:00:00')
  const [showPicker, setShowPicker] = useState(false)
  const [lastPun, setLastPun] = useState('')
  const [showPinChange, setShowPinChange] = useState(false)
  const [pinOld, setPinOld] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [editingKid, setEditingKid] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editPassphrase, setEditPassphrase] = useState('')
  const [emojiOptions, setEmojiOptions] = useState([])
  const [pendingRequest, setPendingRequest] = useState(null)
  const [editingHistory, setEditingHistory] = useState(null)
  const [editDuration, setEditDuration] = useState('')
  const [adjustMinutes, setAdjustMinutes] = useState('')
  const fireConfetti = useConfetti()

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }

  const fetchData = useCallback(async () => {
    try {
      const [kidsRes, currentRes, nextRes, historyRes, statsRes, emojiRes, pendingRes, picksRes, fairPoolRes] = await Promise.all([
        fetch(`${API}/kids`),
        fetch(`${API}/shotgun/current`),
        fetch(`${API}/shotgun/next`),
        fetch(`${API}/shotgun/history?limit=50`),
        fetch(`${API}/stats`),
        fetch(`${API}/emoji-options`),
        fetch(`${API}/shotgun/request`),
        fetch(`${API}/shotgun/picks`, { headers: authHeaders }),
        fetch(`${API}/shotgun/fair-pool`)
      ])
      setKids(await kidsRes.json())
      setCurrent(await currentRes.json())
      setNextKid(await nextRes.json())
      setHistory(await historyRes.json())
      setStats(await statsRes.json())
      setEmojiOptions(await emojiRes.json())
      setPendingRequest(await pendingRes.json())
      setPicks(await picksRes.json())
      setFairPool(await fairPoolRes.json())
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
      headers: authHeaders,
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
  }

  const handlePickerComplete = async (winner) => {
    if (winner) await assignShotgun(winner.id)
    setShowPicker(false)
  }

  const clearShotgun = async () => {
    await fetch(`${API}/shotgun/clear`, { method: 'POST', headers: authHeaders })
    setLastPun('')
    fetchData()
  }

  const approveRequest = async () => {
    const res = await fetch(`${API}/shotgun/request/approve`, {
      method: 'POST',
      headers: authHeaders
    })
    const data = await res.json()
    if (data.success) {
      setLastPun(data.pun || '')
      if (data.request?.kid_avatar) fireConfetti(['#f59e0b', '#fff'])
    }
    fetchData()
  }

  const denyRequest = async () => {
    await fetch(`${API}/shotgun/request/deny`, {
      method: 'POST',
      headers: authHeaders
    })
    fetchData()
  }

  const saveHistoryEdit = async () => {
    if (!editingHistory) return
    await fetch(`${API}/shotgun/history/${editingHistory.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ duration_minutes: parseInt(editDuration) || 0 })
    })
    setEditingHistory(null)
    fetchData()
  }

  const adjustActiveTime = async () => {
    if (!current || !adjustMinutes) return
    const minutes = parseInt(adjustMinutes)
    if (isNaN(minutes)) return

    await fetch(`${API}/shotgun/clear`, { method: 'POST', headers: authHeaders })

    const kid = kids.find(k => k.id === current.kid_id)
    if (kid) {
      await fetch(`${API}/shotgun/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ kid_id: current.kid_id })
      })
    }

    setAdjustMinutes('')
    fetchData()
  }

  const addKid = async (e) => {
    e.preventDefault()
    if (!newKidName.trim()) return
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6']
    const avatars = ['🚗', '🏎️', '🚕', '🚙', '🚌', '🚓']
    await fetch(`${API}/kids`, {
      method: 'POST',
      headers: authHeaders,
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
    await fetch(`${API}/kids/${kidId}`, { method: 'DELETE', headers: authHeaders })
    fetchData()
  }

  const saveKidEdit = async () => {
    if (!editingKid) return
    await fetch(`${API}/kids/${editingKid.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: editName, avatar: editAvatar, passphrase: editPassphrase })
    })
    setEditingKid(null)
    fetchData()
  }

  const changePin = async (e) => {
    e.preventDefault()
    setPinMsg('')
    const res = await fetch(`${API}/auth/admin/pin`, {
      method: 'POST',
      headers: authHeaders,
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

  const deletePick = async (id) => {
    if (!confirm('Delete this pick entry?')) return
    await fetch(`${API}/shotgun/picks/${id}`, { method: 'DELETE', headers: authHeaders })
    fetchData()
  }

  const clearPicks = async () => {
    if (!confirm('Clear all pick log entries?')) return
    await fetch(`${API}/shotgun/picks`, { method: 'DELETE', headers: authHeaders })
    fetchData()
  }

  const maxRides = Math.max(...stats.map(s => s.total_rides), 1)

  return (
    <div className="app">
      {showPicker && (
        <ShufflePicker
          kids={fairPool}
          onComplete={handlePickerComplete}
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
        <button className={`tab ${activeTab === 'picks' ? 'active' : ''}`} onClick={() => setActiveTab('picks')}>Pick Log</button>
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

          {current && (
            <div className="adjust-time-section">
              <div className="adjust-time-label">Manually Set Ride Time</div>
              <div className="adjust-time-row">
                <input
                  type="number"
                  className="adjust-time-input"
                  placeholder="Minutes"
                  value={adjustMinutes}
                  onChange={e => setAdjustMinutes(e.target.value)}
                  min="0"
                />
                <button className="btn btn-secondary btn-sm" onClick={adjustActiveTime} disabled={!adjustMinutes}>
                  Set Time
                </button>
              </div>
              <div className="adjust-time-hint">Sets the ride time and restarts the timer for {current.name}</div>
            </div>
          )}

          {pendingRequest && (
            <div className="pending-request-banner">
              <div className="pending-request-info">
                <span className="pending-request-avatar">{pendingRequest.kid_avatar}</span>
                <div>
                  <div className="pending-request-text">
                    <strong style={{ color: pendingRequest.requested_by_color }}>{pendingRequest.requested_by_name}</strong>
                    {' '}picked{' '}
                    <strong style={{ color: pendingRequest.kid_color }}>{pendingRequest.kid_name}</strong>
                  </div>
                  <div className="pending-request-sub">Approve this shotgun pick?</div>
                </div>
              </div>
              <div className="pending-request-actions">
                <button className="btn btn-primary btn-sm" onClick={approveRequest}>✅ Approve</button>
                <button className="btn btn-secondary btn-sm" onClick={denyRequest}>❌ Deny</button>
              </div>
            </div>
          )}

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
          <div className="history-header">
            <div className="section-title">Recent History</div>
            {history.length > 0 && (
              <div className="history-totals">
                <span className="history-total-item">
                  <span className="history-total-value">{history.length}</span> rides
                </span>
                <span className="history-total-item">
                  <span className="history-total-value">{history.reduce((sum, h) => sum + (h.duration_minutes || 0), 0)}</span> min total
                </span>
              </div>
            )}
          </div>
          {history.length > 0 ? history.map((item, idx) => (
            <div key={item.id} className="history-item">
              <span className="history-kid" style={{ color: item.color }}>
                <span className="history-trip-num">#{history.length - idx}</span>
                {item.avatar} {item.name}
              </span>
              <span className="history-date">
                {new Date(item.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
              {editingHistory?.id === item.id ? (
                <span className="history-edit-inline">
                  <input
                    type="number"
                    className="history-edit-input"
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    min="0"
                    autoFocus
                  />
                  <span className="history-edit-unit">min</span>
                  <button className="btn btn-primary btn-xs" onClick={saveHistoryEdit}>Save</button>
                  <button className="btn btn-danger btn-xs" onClick={() => {
                    if (confirm('Delete this history entry?')) {
                      fetch(`${API}/shotgun/history/${item.id}`, { method: 'DELETE', headers: authHeaders }).then(() => {
                        setEditingHistory(null)
                        fetchData()
                      })
                    }
                  }}>Delete</button>
                  <button className="btn btn-secondary btn-xs" onClick={() => setEditingHistory(null)}>Cancel</button>
                </span>
              ) : (
                <span
                  className="history-duration editable"
                  onClick={() => { setEditingHistory(item); setEditDuration(String(item.duration_minutes || 0)) }}
                  title="Click to edit"
                >
                  {item.duration_minutes > 0 ? `${item.duration_minutes} min` : '—'}
                  <span className="edit-pencil">✏️</span>
                </span>
              )}
            </div>
          )) : (
            <div className="empty-state"><p>No history yet</p></div>
          )}
        </div>
      )}

      {activeTab === 'picks' && (
        <div className="picks-section">
          <div className="picks-header">
            <div className="section-title">Pick Log</div>
            {picks.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={clearPicks}>Clear All</button>
            )}
          </div>
          {picks.length > 0 ? picks.map(pick => (
            <div key={pick.id} className={`pick-item pick-${pick.status}`}>
              <div className="pick-info">
                <span className="pick-requester">{pick.requested_by_name}</span>
                <span className="pick-arrow">→</span>
                <span className="pick-target">{pick.kid_name}</span>
                <span className={`pick-status pick-status-${pick.status}`}>{pick.status}</span>
              </div>
              <div className="pick-meta">
                <span className="pick-date">
                  {new Date(pick.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
                <button className="btn btn-danger btn-xs" onClick={() => deletePick(pick.id)}>Delete</button>
              </div>
            </div>
          )) : (
            <div className="empty-state"><p>No picks yet</p></div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <>
          <form className="add-kid-form" onSubmit={addKid}>
            <input type="text" placeholder="Add a new kid..." value={newKidName} onChange={(e) => setNewKidName(e.target.value)} maxLength={20} />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <div className="kids-grid">
            {kids.map(kid => (
              <div key={kid.id} className="kid-card manage-kid-card" onClick={() => {
                setEditingKid(kid)
                setEditName(kid.name)
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
                  <label>Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={20} />
                </div>
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
  const path = window.location.pathname
  if (path.startsWith('/approve/')) {
    return <ApprovePage />
  }

  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('admin') === '1' ? 'parent-login' : 'landing'
  })
  const [selectedKid, setSelectedKid] = useState(null)
  const [adminToken, setAdminToken] = useState(null)

  const handleParentLogout = async () => {
    if (adminToken) {
      await fetch(`${API}/auth/admin/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } })
    }
    setAdminToken(null)
    setView('landing')
  }

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
        onLogin={(token) => { setAdminToken(token); setView('parent') }}
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
    return <ParentDashboard onLogout={handleParentLogout} adminToken={adminToken} />
  }

  if (view === 'kid') {
    return <KidDashboard kid={selectedKid} onLogout={() => { setView('landing'); setSelectedKid(null) }} />
  }

  return null
}
