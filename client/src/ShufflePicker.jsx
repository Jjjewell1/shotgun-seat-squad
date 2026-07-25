import { useState, useEffect, useRef } from 'react'

export default function ShufflePicker({ kids, winner, onComplete, kidColor }) {
  const [phase, setPhase] = useState('shuffle')
  const [positions, setPositions] = useState([])
  const [revealed, setRevealed] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const initial = kids.map((kid, i) => ({
      ...kid,
      index: i,
      x: 0,
      y: 0,
      visible: true,
      flipped: false
    }))
    setPositions(initial)

    let shuffleCount = 0
    const maxShuffles = 12
    const shuffleInterval = setInterval(() => {
      shuffleCount++
      setPositions(prev => {
        const shuffled = [...prev].filter(p => p.visible)
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled.map((p, idx) => ({
          ...p,
          x: (idx - (shuffled.length - 1) / 2) * 140,
          y: Math.sin(shuffleCount + idx) * 30
        }))
      })

      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval)
        setTimeout(() => startElimination(), 200)
      }
    }, 180)

    return () => clearInterval(shuffleInterval)
  }, [kids])

  const startElimination = () => {
    setPhase('eliminate')
    const visibleKids = [...positions].filter(p => p.visible)
    let eliminated = 0

    const eliminate = () => {
      if (eliminated >= visibleKids.length - 1) {
        setTimeout(() => {
          setPhase('reveal')
          setRevealed(true)
          setTimeout(() => onComplete(), 2500)
        }, 400)
        return
      }

      setPositions(prev => {
        const vis = prev.filter(p => p.visible)
        if (vis.length <= 1) return prev
        const toRemove = vis[Math.floor(Math.random() * vis.length)]
        return prev.map(p =>
          p.id === toRemove.id ? { ...p, visible: false } : p
        )
      })
      eliminated++
      setTimeout(eliminate, 250)
    }

    setTimeout(eliminate, 300)
  }

  return (
    <div className="shuffle-overlay" ref={containerRef}>
      <div className="shuffle-cards-container">
        {positions.filter(p => p.visible).map(kid => (
          <div
            key={kid.id}
            className={`shuffle-card ${phase === 'shuffle' ? 'shuffling' : ''} ${revealed ? 'revealed' : ''}`}
            style={{
              transform: `translateX(${kid.x}px) translateY(${kid.y}px) ${revealed ? 'rotateY(360deg)' : 'rotateY(0deg)'}`,
              borderColor: kid.color
            }}
          >
            <div className="shuffle-card-inner">
              {revealed ? (
                <>
                  <span className="shuffle-card-avatar">{kid.avatar}</span>
                  <span className="shuffle-card-name" style={{ color: kid.color }}>{kid.name}</span>
                </>
              ) : (
                <span className="shuffle-card-back">🚗</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {revealed && winner && (
        <div className="shuffle-result">
          <div className="shuffle-result-pun" style={{ color: kidColor }}>
            ShotGun goes to...
          </div>
        </div>
      )}
    </div>
  )
}
