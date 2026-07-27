import { useState, useEffect, useCallback } from 'react'
import BadgeDisplay from './BadgeDisplay'
import Podium from './Podium'
import ShufflePicker from './ShufflePicker'
import useConfetti from './useConfetti'
import KidProfileEditor from './KidProfileEditor'
import TicTacToe from './games/TicTacToe'
import DragRace from './games/DragRace'
import TrafficDodge from './games/TrafficDodge'
import MemoryMatch from './games/MemoryMatch'
import LicensePlate from './games/LicensePlate'
import PitStop from './games/PitStop'

const API = '/api'

const GAMES = [
  { id: 'tictactoe', name: 'Car Tic-Tac-Toe', icon: '❌⭕', component: TicTacToe },
  { id: 'dragrace', name: 'Drag Race', icon: '🏎️', component: DragRace },
  { id: 'traffic_dodge', name: 'Traffic Dodge', icon: '🚧', component: TrafficDodge },
  { id: 'memory', name: 'Memory Match', icon: '🃏', component: MemoryMatch },
  { id: 'license', name: 'License Plate', icon: '🔢', component: LicensePlate },
  { id: 'pitstop', name: 'Pit Stop', icon: '⛽', component: PitStop }
]

export default function KidDashboard({ kid, onLogout }) {
  const [dashboard, setDashboard] = useState(null)
  const [activeTab, setActiveTab] = useState('stats')
  const [activeGame, setActiveGame] = useState(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [showPicker, setShowPicker] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [fairPool, setFairPool] = useState([])
  const [kidData, setKidData] = useState(kid)
  const fireConfetti = useConfetti()

  const refreshDashboard = useCallback(() => {
    fetch(`${API}/kid/${kid.id}/dashboard`)
      .then(r => r.json())
      .then(setDashboard)
  }, [kid.id])

  useEffect(() => {
    refreshDashboard()
    fetch(`${API}/shotgun/fair-pool`).then(r => r.json()).then(setFairPool)
  }, [refreshDashboard])

  useEffect(() => {
    if (!dashboard?.current?.started_at) {
      setElapsed('00:00:00')
      return
    }
    const timer = setInterval(() => {
      const start = new Date(dashboard.current.started_at)
      const diff = Math.floor((Date.now() - start) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60).toString()).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [dashboard])

  const handleHighscore = async (game, score) => {
    await fetch(`${API}/kids/${kid.id}/highscores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, score })
    })
    refreshDashboard()
  }

  const handlePickShotgun = () => {
    setShowPicker(true)
  }

  const handlePickerComplete = async (winner) => {
    setShowPicker(false)

    if (winner) {
      await fetch(`${API}/shotgun/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_by: kid.id, kid_id: winner.id })
      })
      fireConfetti([winner.color, '#f59e0b', '#fff'])
      refreshDashboard()
    }
  }

  const pollForApproval = useCallback(() => {
    if (!dashboard?.pending_request) return
    const interval = setInterval(async () => {
      const res = await fetch(`${API}/shotgun/request`)
      const req = await res.json()
      if (!req) {
        clearInterval(interval)
        refreshDashboard()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [dashboard?.pending_request, refreshDashboard])

  useEffect(() => {
    const cleanup = pollForApproval()
    return cleanup
  }, [pollForApproval])

  if (!dashboard) return <div className="loading">Loading...</div>

  if (showProfile) {
    return (
      <div className="kid-dashboard">
        <KidProfileEditor
          kid={kidData}
          onSaved={(updatedKid) => {
            setKidData(prev => ({ ...prev, ...updatedKid }))
          }}
          onBack={() => setShowProfile(false)}
        />
      </div>
    )
  }

  if (activeGame) {
    const gameDef = GAMES.find(g => g.id === activeGame)
    const GameComponent = gameDef.component
    return (
      <div className="kid-dashboard">
        <GameComponent
          kid={kid}
          highscore={dashboard.game_highscores?.[activeGame]}
          onHighscore={(score) => handleHighscore(activeGame, score)}
          onBack={() => setActiveGame(null)}
        />
      </div>
    )
  }

  return (
    <div className="kid-dashboard">
      {showPicker && (
        <ShufflePicker
          kids={fairPool}
          onComplete={handlePickerComplete}
        />
      )}

      <header className="kid-header">
        <div className="kid-header-info">
          <span className="kid-header-avatar" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }} title="Tap to edit profile">
            {kidData.avatar_photo ? (
              <img src={kidData.avatar_photo} alt={kidData.name} className="kid-header-avatar-img" />
            ) : (
              kidData.avatar
            )}
          </span>
          <div>
            <h1 className="kid-header-name" style={{ color: kidData.color }}>{kidData.name}'s Dashboard</h1>
            <p className="kid-header-rank">Rank: #{dashboard.rank} of {dashboard.leaderboard.length}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowProfile(true)}>✏️ Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>Log Out</button>
        </div>
      </header>

      {dashboard.current && (
        <div className="kid-current-section">
          <div className="kid-current-label">Currently Riding Shotgun</div>
          <div className="kid-current-info">
            <span>{dashboard.current.avatar}</span>
            <span style={{ color: dashboard.current.color, fontWeight: 700 }}>{dashboard.current.name}</span>
            <span className="kid-current-timer">{elapsed}</span>
          </div>
        </div>
      )}

      {dashboard.pending_request && (
        <div className="kid-pending-section">
          <div className="kid-pending-text">
            ⏳ Request sent! Waiting for parent approval...
          </div>
          <div className="kid-pending-target">
            {dashboard.pending_request.kid_avatar} {dashboard.pending_request.kid_name}
          </div>
        </div>
      )}

      {!dashboard.pending_request && !dashboard.current && (
        <div className="kid-pick-section">
          <button className="btn btn-primary kid-pick-btn" onClick={handlePickShotgun}>
            🎲 Pick Shotgun!
          </button>
        </div>
      )}

      {dashboard.next && dashboard.next.id === kid.id && (
        <div className="kid-next-banner" style={{ borderColor: kid.color }}>
          🎉 You're next up for shotgun!
        </div>
      )}

      <div className="kid-tabs">
        <button className={`kid-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>My Stats</button>
        <button className={`kid-tab ${activeTab === 'badges' ? 'active' : ''}`} onClick={() => setActiveTab('badges')}>My Badges</button>
        <button className={`kid-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
        <button className={`kid-tab ${activeTab === 'games' ? 'active' : ''}`} onClick={() => setActiveTab('games')}>Games</button>
      </div>

      {activeTab === 'stats' && (
        <div className="kid-stats-panel">
          <div className="kid-stat-card" style={{ borderColor: kid.color }}>
            <div className="kid-stat-icon">🚗</div>
            <div className="kid-stat-value">{dashboard.stats.total_rides}</div>
            <div className="kid-stat-label">Total Rides</div>
          </div>
          <div className="kid-stat-card" style={{ borderColor: kid.color }}>
            <div className="kid-stat-icon">⏱</div>
            <div className="kid-stat-value">{dashboard.stats.total_minutes}m</div>
            <div className="kid-stat-label">Total Time</div>
          </div>
          <div className="kid-stat-card" style={{ borderColor: kid.color }}>
            <div className="kid-stat-icon">🔥</div>
            <div className="kid-stat-value">{dashboard.stats.current_streak}</div>
            <div className="kid-stat-label">Current Streak</div>
          </div>
          <div className="kid-stat-card" style={{ borderColor: kid.color }}>
            <div className="kid-stat-icon">⚖️</div>
            <div className="kid-stat-value">{dashboard.stats.fairness_score}</div>
            <div className="kid-stat-label">Fairness Score</div>
          </div>

          {dashboard.achievements.length > 0 && (
            <div className="kid-earned-badges">
              <h3>Earned Badges</h3>
              <BadgeDisplay earned={dashboard.achievements} compact />
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="kid-badges-panel">
          <BadgeDisplay earned={dashboard.achievements} />
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="kid-leaderboard-panel">
          <Podium stats={dashboard.leaderboard.map(s => ({
            ...s,
            achievements: [],
            fairness_score: s.fairness_score || 0,
            total_rides: s.total_rides || 0
          }))} />
        </div>
      )}

      {activeTab === 'games' && (
        <div className="kid-games-panel">
          <div className="kid-games-grid">
            {GAMES.map(game => (
              <button
                key={game.id}
                className="kid-game-card"
                onClick={() => setActiveGame(game.id)}
              >
                <span className="kid-game-icon">{game.icon}</span>
                <span className="kid-game-name">{game.name}</span>
                {dashboard.game_highscores?.[game.id] != null && (
                  <span className="kid-game-highscore">Best: {dashboard.game_highscores[game.id]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
