export default function Podium({ stats }) {
  if (stats.length === 0) return null

  const sorted = [...stats].sort((a, b) => b.fairness_score - a.fairness_score)
  const podium = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const heights = [160, 120, 90]
  const labels = ['1st', '2nd', '3rd']
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  const order = podium.length >= 3 ? [1, 0, 2] : podium.length === 2 ? [0, 1] : [0]

  return (
    <div className="podium-container">
      <div className="podium-stage">
        {order.map((sortIdx, stageIdx) => {
          if (sortIdx >= podium.length) return null
          const kid = podium[sortIdx]
          return (
            <div key={kid.id} className="podium-column" style={{ order: stageIdx }}>
              <div className="podium-avatar">{kid.avatar}</div>
              <div className="podium-name" style={{ color: kid.color }}>{kid.name}</div>
              <div className="podium-score">{kid.total_rides} rides</div>
              <div className="podium-block" style={{
                height: heights[sortIdx],
                background: `linear-gradient(180deg, ${medalColors[sortIdx]}, ${medalColors[sortIdx]}88)`,
                boxShadow: `0 4px 20px ${medalColors[sortIdx]}44`
              }}>
                <span className="podium-label">{labels[sortIdx]}</span>
              </div>
              {kid.achievements && kid.achievements.length > 0 && (
                <div className="podium-badges">
                  {kid.achievements.map(a => (
                    <span key={a.id} className="badge-mini" title={a.name}>{a.icon}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <div className="podium-remaining">
          <div className="section-title" style={{ marginTop: '20px' }}>Full Rankings</div>
          {sorted.map((kid, i) => (
            <div key={kid.id} className="rank-row">
              <span className="rank-position">#{i + 1}</span>
              <span className="rank-avatar">{kid.avatar}</span>
              <span className="rank-name" style={{ color: kid.color }}>{kid.name}</span>
              <span className="rank-score">{kid.total_rides} rides &middot; {kid.fairness_score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
