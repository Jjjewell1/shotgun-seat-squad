import { useState, useRef, useCallback, useEffect } from 'react'
import GameWrapper from './GameWrapper'

export default function DragRace({ kid, highscore, onHighscore, onBack }) {
  const [playerPos, setPlayerPos] = useState(0)
  const [cpuPos, setCpuPos] = useState(0)
  const [racing, setRacing] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [result, setResult] = useState(null)
  const [wins, setWins] = useState(0)
  const [round, setRound] = useState(0)
  const [boost, setBoost] = useState(100)
  const [exhausts, setExhausts] = useState([])
  const [cpuExhausts, setCpuExhausts] = useState([])
  const boostRef = useRef(100)
  const playerRef = useRef(0)
  const cpuRef = useRef(0)
  const racingRef = useRef(false)
  const finishLine = 85

  useEffect(() => {
    const interval = setInterval(() => {
      if (boostRef.current < 100) {
        boostRef.current = Math.min(100, boostRef.current + 2)
        setBoost(boostRef.current)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const addExhaust = useCallback((lane, pos) => {
    const id = Date.now() + Math.random()
    const side = Math.random() > 0.5 ? -8 : 8
    setExhausts(prev => [...prev.slice(-8), { id, pos, side }])
    setTimeout(() => {
      setExhausts(prev => prev.filter(e => e.id !== id))
    }, 400)
  }, [])

  const startRace = () => {
    setPlayerPos(0)
    setCpuPos(0)
    playerRef.current = 0
    cpuRef.current = 0
    setRacing(false)
    setResult(null)
    setBoost(100)
    boostRef.current = 100
    setExhausts([])
    racingRef.current = false

    setCountdown(3)
    let count = 3
    const countInterval = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        setCountdown(null)
        clearInterval(countInterval)
        setRacing(true)
        racingRef.current = true
        setRound(r => r + 1)
        startCpuLoop()
      }
    }, 800)
  }

  const startCpuLoop = () => {
    let stallCounter = 0
    const cpuLoop = setInterval(() => {
      if (!racingRef.current) {
        clearInterval(cpuLoop)
        return
      }

      stallCounter++
      let speed

      if (stallCounter % 20 === 0) {
        speed = Math.random() < 0.3 ? 0 : 0.5 + Math.random() * 2
      } else {
        speed = 0.8 + Math.random() * 1.8
      }

      cpuRef.current = Math.min(finishLine, cpuRef.current + speed)
      setCpuPos(cpuRef.current)

      if (cpuRef.current >= finishLine) {
        racingRef.current = false
        setRacing(false)
        setResult('lose')
        clearInterval(cpuLoop)
      }
    }, 60)
  }

  const handleAccelerate = useCallback(() => {
    if (!racingRef.current || boostRef.current < 10) return

    const cost = 8
    boostRef.current = Math.max(0, boostRef.current - cost)
    setBoost(boostRef.current)

    const speed = 3 + Math.random() * 3
    playerRef.current = Math.min(finishLine, playerRef.current + speed)
    setPlayerPos(playerRef.current)

    addExhaust('player', playerRef.current)

    if (playerRef.current >= finishLine) {
      racingRef.current = false
      setRacing(false)
      setResult('win')
      setWins(w => {
        const newWins = w + 1
        onHighscore(newWins)
        return newWins
      })
    }
  }, [onHighscore, addExhaust])

  useEffect(() => {
    if (!racing) return
    const handleKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleAccelerate()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [racing, handleAccelerate])

  const boostPercent = Math.round(boost)

  return (
    <GameWrapper title="Drag Race" icon="🏎️" onBack={onBack}>
      <div className="drag-status">
        <span>Round: {round}</span>
        <span>Wins: {wins} {highscore > 0 ? `(Best: ${highscore})` : ''}</span>
      </div>

      <div className="drag-track">
        <div className="drag-lane">
          <span className="drag-label">You 🚗</span>
          <div className="drag-road">
            {exhausts.map(e => (
              <span key={e.id} className="drag-exhaust" style={{ left: `${e.pos}%`, bottom: `calc(50% + ${e.side}px)` }}>💨</span>
            ))}
            <span className={`drag-car ${racing ? 'drag-car-bouncing' : ''}`} style={{ left: `${playerPos}%` }}>🚗</span>
          </div>
        </div>
        <div className="drag-lane">
          <span className="drag-label">CPU 🏎️</span>
          <div className="drag-road">
            <span className={`drag-car ${racing ? 'drag-car-bouncing' : ''}`} style={{ left: `${cpuPos}%` }}>🏎️</span>
          </div>
        </div>
        <div className="drag-finish">🏁</div>
      </div>

      {countdown && (
        <div className="drag-countdown">{countdown}</div>
      )}

      {result && (
        <div className={`drag-result drag-result-${result}`}>
          {result === 'win' ? '🎉 You Win!' : '😢 CPU Wins!'}
          <div className="drag-result-detail">
            {result === 'win' ? 'Great reflexes!' : 'Almost! Tap faster next time!'}
          </div>
        </div>
      )}

      {racing && (
        <div className="drag-boost-container">
          <span className="drag-boost-label">BOOST</span>
          <div className="drag-boost-track">
            <div
              className="drag-boost-fill"
              style={{
                width: `${boostPercent}%`,
                background: boostPercent > 30 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#ef4444'
              }}
            ></div>
          </div>
          <span className="drag-boost-pct">{boostPercent}%</span>
        </div>
      )}

      <div className="drag-controls">
        {!racing && !result && !countdown && (
          <button className="btn btn-primary drag-start-btn" onClick={startRace}>Start Race!</button>
        )}
        {racing && (
          <button
            className="btn btn-primary drag-accelerate-btn"
            onMouseDown={handleAccelerate}
            onTouchStart={handleAccelerate}
          >
            🏎️ TAP TO BOOST!
          </button>
        )}
        {!racing && result && (
          <button className="btn btn-primary" onClick={startRace}>Race Again</button>
        )}
      </div>
    </GameWrapper>
  )
}
