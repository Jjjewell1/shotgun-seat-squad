import { useState, useEffect, useRef, useCallback } from 'react'
import GameWrapper from './GameWrapper'

const LANE_COUNT = 3
const PLAYER_LANE = 1

export default function TrafficDodge({ kid, highscore, onHighscore, onBack }) {
  const [playerLane, setPlayerLane] = useState(PLAYER_LANE)
  const [obstacles, setObstacles] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const frameRef = useRef(null)
  const speedRef = useRef(3)

  const spawnObstacle = useCallback(() => {
    const lane = Math.floor(Math.random() * LANE_COUNT)
    const emojis = ['🚗', '🚛', '🚌', '🚐', '🚕']
    return {
      id: Date.now() + Math.random(),
      lane,
      y: -15,
      emoji: emojis[Math.floor(Math.random() * emojis.length)]
    }
  }, [])

  useEffect(() => {
    if (!playing) return

    let lastSpawn = 0
    let frameCount = 0

    const loop = () => {
      frameCount++

      if (frameCount - lastSpawn > Math.max(30, 60 - speedRef.current * 2)) {
        lastSpawn = frameCount
        setObstacles(prev => [...prev, spawnObstacle()])
      }

      setObstacles(prev => {
        const updated = prev
          .map(o => ({ ...o, y: o.y + speedRef.current }))
          .filter(o => o.y < 120)

        for (const o of updated) {
          if (o.y > 75 && o.y < 95 && o.lane === playerLane) {
            setLives(l => {
              const newLives = l - 1
              if (newLives <= 0) {
                setPlaying(false)
                setGameOver(true)
              }
              return Math.max(0, newLives)
            })
            o.y = 999
          }
        }

        return updated.filter(o => o.y < 120)
      })

      setScore(s => s + 1)
      if (frameCount % 200 === 0) speedRef.current = Math.min(speedRef.current + 0.3, 10)

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playing, playerLane, spawnObstacle])

  useEffect(() => {
    if (!playing) return
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setPlayerLane(l => Math.max(0, l - 1))
      if (e.key === 'ArrowRight' || e.key === 'd') setPlayerLane(l => Math.min(LANE_COUNT - 1, l + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [playing])

  const startGame = () => {
    setPlayerLane(PLAYER_LANE)
    setObstacles([])
    setScore(0)
    setLives(3)
    setPlaying(true)
    setGameOver(false)
    speedRef.current = 3
  }

  const endGame = () => {
    onHighscore(score)
    startGame()
  }

  const displayScore = Math.floor(score / 10)

  return (
    <GameWrapper title="Traffic Dodge" icon="🚧" onBack={onBack}>
      <div className="td-status">
        <span>Score: {displayScore}</span>
        <span>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</span>
        <span>Best: {highscore || 0}</span>
      </div>

      <div className="td-road">
        {Array.from({ length: LANE_COUNT }).map((_, lane) => (
          <div key={lane} className={`td-lane ${lane === playerLane ? 'td-lane-active' : ''}`}>
            <div className="td-lane-lines"></div>
            {lane === playerLane && (
              <span className="td-player">🚗</span>
            )}
            {obstacles.filter(o => o.lane === lane).map(o => (
              <span key={o.id} className="td-obstacle" style={{ top: `${o.y}%` }}>
                {o.emoji}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="td-mobile-controls">
        <button className="btn btn-secondary td-move-btn" onClick={() => setPlayerLane(l => Math.max(0, l - 1))}>←</button>
        <button className="btn btn-secondary td-move-btn" onClick={() => setPlayerLane(l => Math.min(LANE_COUNT - 1, l + 1))}>→</button>
      </div>

      {!playing && !gameOver && (
        <button className="btn btn-primary" onClick={startGame}>Start Game</button>
      )}

      {gameOver && (
        <div className="td-gameover">
          <div className="td-gameover-text">Game Over! Score: {displayScore}</div>
          <button className="btn btn-primary" onClick={endGame}>Play Again</button>
        </div>
      )}
    </GameWrapper>
  )
}
