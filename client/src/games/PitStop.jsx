import { useState, useEffect, useRef, useCallback } from 'react'
import GameWrapper from './GameWrapper'

export default function PitStop({ kid, highscore, onHighscore, onBack }) {
  const [needle, setNeedle] = useState(0)
  const [direction, setDirection] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [message, setMessage] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const animRef = useRef(null)
  const speedRef = useRef(3)

  const GREEN_START = 42
  const GREEN_END = 58

  useEffect(() => {
    if (!playing) return
    const animate = () => {
      setNeedle(prev => {
        let next = prev + speedRef.current * direction
        if (next >= 100) { next = 100; setDirection(-1) }
        if (next <= 0) { next = 0; setDirection(1) }
        return next
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [playing, direction])

  const handleStop = useCallback(() => {
    if (!playing) return
    setPlaying(false)
    cancelAnimationFrame(animRef.current)

    const pos = needle
    if (pos >= GREEN_START && pos <= GREEN_END) {
      const centerDist = Math.abs(pos - 50)
      const points = Math.round((1 - centerDist / 10) * 10)
      const newScore = score + points
      setScore(newScore)
      setMessage(`+${points} points! 🎯`)
      speedRef.current = Math.min(speedRef.current + 0.3, 8)
    } else {
      const newLives = lives - 1
      setLives(newLives)
      setMessage('Missed the green! 💥')
      if (newLives <= 0) {
        setGameOver(true)
        onHighscore(score)
        return
      }
    }

    setTimeout(() => {
      setMessage('')
      if (lives > 0 || lives - 1 > 0) {
        setPlaying(true)
      }
    }, 1000)
  }, [playing, needle, score, lives, onHighscore])

  const startGame = () => {
    setScore(0)
    setLives(3)
    setGameOver(false)
    setMessage('')
    setNeedle(0)
    setDirection(1)
    speedRef.current = 3
    setPlaying(true)
  }

  return (
    <GameWrapper title="Pit Stop" icon="⛽" onBack={onBack}>
      <div className="ps-status">
        <span>Score: {score}</span>
        <span>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</span>
        <span>Best: {highscore || 0}</span>
      </div>

      <div className="ps-gauge">
        <div className="ps-gauge-bg">
          <div className="ps-green-zone" style={{ left: `${GREEN_START}%`, width: `${GREEN_END - GREEN_START}%` }}></div>
          <div className="ps-needle" style={{ left: `${needle}%` }}></div>
          <div className="ps-gauge-labels">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        <div className="ps-gauge-pointer"></div>
      </div>

      {message && (
        <div className={`ps-message ${message.includes('Missed') ? 'ps-message-bad' : 'ps-message-good'}`}>
          {message}
        </div>
      )}

      <div className="ps-controls">
        {!playing && !gameOver && (
          <button className="btn btn-primary" onClick={startGame}>Start!</button>
        )}
        {playing && (
          <button className="btn btn-primary ps-stop-btn" onClick={handleStop}>
            ⛽ STOP IN THE GREEN!
          </button>
        )}
        {gameOver && (
          <div className="ps-gameover">
            <div>Game Over! Score: {score}</div>
            <button className="btn btn-primary" onClick={startGame}>Play Again</button>
          </div>
        )}
      </div>
    </GameWrapper>
  )
}
