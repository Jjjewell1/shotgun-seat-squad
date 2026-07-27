import { useState, useEffect, useCallback } from 'react'

const API = '/api'

export default function Landing({ onSelectKid, onSelectParent }) {
  const [kids, setKids] = useState([])
  const [current, setCurrent] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [elapsed, setElapsed] = useState('')

  const fetchData = useCallback(() => {
    fetch(`${API}/kids`).then(r => r.json()).then(setKids)
    fetch(`${API}/shotgun/current`).then(r => r.json()).then(setCurrent)
    fetch(`${API}/shotgun/request`).then(r => r.json()).then(setPendingRequest)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!current?.started_at) {
      setElapsed('')
      return
    }
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(current.started_at)) / 1000)
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [current])

  return (
    <div className="landing">
      <div className="landing-roads">
        <div className="road-line road-line-1"></div>
        <div className="road-line road-line-2"></div>
        <div className="road-line road-line-3"></div>
      </div>

      <div className="landing-content">
        <div className="landing-car-anim">🚗</div>
        <h1 className="landing-title">Shotgun Seat Squad</h1>
        <p className="landing-subtitle">Keeping the peace, one road trip at a time</p>

        {current && (
          <div className="landing-current-banner">
            <div className="landing-current-info">
              <span className="landing-current-avatar">
                {current.avatar_photo ? (
                  <img src={current.avatar_photo} alt={current.name} className="landing-kid-avatar-img" />
                ) : (
                  current.avatar
                )}
              </span>
              <div className="landing-current-text">
                <span className="landing-current-name" style={{ color: current.color }}>{current.name}</span>
                <span className="landing-current-label">is riding shotgun</span>
              </div>
              {elapsed && <span className="landing-current-timer">{elapsed}</span>}
            </div>
          </div>
        )}

        {pendingRequest && (
          <div className="landing-pending-banner">
            ⏳ Shotgun request pending — waiting for parent approval
          </div>
        )}

        <p className="landing-prompt">Who's riding today?</p>

        <div className="landing-kids-grid">
          {kids.map(kid => (
            <button
              key={kid.id}
              className="landing-kid-card"
              style={{ '--kid-color': kid.color }}
              onClick={() => onSelectKid(kid)}
            >
              <span className="landing-kid-avatar">
                {kid.avatar_photo ? (
                  <img src={kid.avatar_photo} alt={kid.name} className="landing-kid-avatar-img" />
                ) : (
                  kid.avatar
                )}
              </span>
              <span className="landing-kid-name">{kid.name}</span>
            </button>
          ))}
        </div>

        {kids.length === 0 && (
          <p className="landing-empty">No kids added yet. Have a parent set things up first!</p>
        )}

        <button className="landing-parent-btn" onClick={onSelectParent}>
          <span className="landing-parent-icon">🔑</span>
          Parent Login
        </button>
      </div>
    </div>
  )
}
