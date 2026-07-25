import { useState, useEffect } from 'react'

const API = '/api'

export default function Landing({ onSelectKid, onSelectParent }) {
  const [kids, setKids] = useState([])

  useEffect(() => {
    fetch(`${API}/kids`).then(r => r.json()).then(setKids)
  }, [])

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

        <p className="landing-prompt">Who's riding today?</p>

        <div className="landing-kids-grid">
          {kids.map(kid => (
            <button
              key={kid.id}
              className="landing-kid-card"
              style={{ '--kid-color': kid.color }}
              onClick={() => onSelectKid(kid)}
            >
              <span className="landing-kid-avatar">{kid.avatar}</span>
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
