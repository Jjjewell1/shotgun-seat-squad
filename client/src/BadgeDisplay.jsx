const ALL_ACHIEVEMENTS = [
  { id: 'first_ride', name: 'First Ride', icon: '🚗', description: 'Complete your first ride' },
  { id: 'on_fire', name: 'On Fire', icon: '🔥', description: '3+ ride streak' },
  { id: 'royalty', name: 'Shotgun Royalty', icon: '👑', description: 'Most total rides' },
  { id: 'road_warrior', name: 'Road Warrior', icon: '⏱', description: '60+ total minutes' },
  { id: 'veteran', name: 'Veteran', icon: '🏆', description: '10+ rides' },
  { id: 'near_top', name: 'Near the Top', icon: '⭐', description: 'Within 1 ride of the leader' }
]

export default function BadgeDisplay({ earned = [], compact = false }) {
  if (compact) {
    return (
      <div className="badge-compact">
        {earned.map(a => (
          <span key={a.id} className="badge-pill" title={a.name}>{a.icon} {a.name}</span>
        ))}
      </div>
    )
  }

  return (
    <div className="badge-grid">
      {ALL_ACHIEVEMENTS.map(achievement => {
        const isEarned = earned.some(e => e.id === achievement.id)
        return (
          <div
            key={achievement.id}
            className={`badge-card ${isEarned ? 'badge-earned' : 'badge-locked'}`}
          >
            <div className="badge-icon">{achievement.icon}</div>
            <div className="badge-name">{achievement.name}</div>
            <div className="badge-desc">{achievement.description}</div>
          </div>
        )
      })}
    </div>
  )
}
