import { useState, useRef, useCallback } from 'react'
import GameWrapper from './GameWrapper'

export default function DragRace({ kid, highscore, onHighscore, onBack }) {
  const [playerPos, setPlayerPos] = useState(0)
  const [cpuPos, setCpuPos] = useState(0)
  const [racing, setRacing] = useState(false)
  const [result, setResult] = useState(null)
  const [wins, setWins] = useState(0)
  const [round, setRound] = useState(0)
  const playerInterval = useRef(null)
  const cpuInterval = useRef(null)
  const finishLine = 85

  const startRace = () => {
    setPlayerPos(0)
    setCpuPos(0)
    setRacing(true)
    setResult(null)
    setRound(r => r + 1)

    cpuInterval.current = setInterval(() => {
      setCpuPos(prev => {
        const next = prev + 1 + Math.random() * 2.5
        if (next >= finishLine) {
          clearInterval(cpuInterval.current)
          clearInterval(playerInterval.current)
          setRacing(false)
          setResult('lose')
          return finishLine
        }
        return next
      })
    }, 50)
  }

  const handleAccelerate = useCallback(() => {
    if (!racing) return
    setPlayerPos(prev => {
      const next = prev + 2.5 + Math.random() * 2
      if (next >= finishLine) {
        clearInterval(playerInterval.current)
        clearInterval(cpuInterval.current)
        setRacing(false)
        setResult('win')
        setWins(w => {
          const newWins = w + 1
          onHighscore(newWins)
          return newWins
        })
        return finishLine
      }
      return next
    })
  }, [racing, onHighscore])

  const endRace = result === 'win' || result === 'lose'

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
            <span className="drag-car" style={{ left: `${playerPos}%` }}>🚗</span>
          </div>
        </div>
        <div className="drag-lane">
          <span className="drag-label">CPU 🏎️</span>
          <div className="drag-road">
            <span className="drag-car" style={{ left: `${cpuPos}%` }}>🏎️</span>
          </div>
        </div>
        <div className="drag-finish">🏁</div>
      </div>

      {result && (
        <div className={`drag-result drag-result-${result}`}>
          {result === 'win' ? '🎉 You Win!' : '😢 CPU Wins!'}
        </div>
      )}

      <div className="drag-controls">
        {!racing && !result && (
          <button className="btn btn-primary drag-start-btn" onClick={startRace}>Start Race!</button>
        )}
        {racing && (
          <button
            className="btn btn-primary drag-accelerate-btn"
            onMouseDown={handleAccelerate}
            onTouchStart={handleAccelerate}
          >
            🏎️ TAP TO GO FASTER!
          </button>
        )}
        {result && (
          <button className="btn btn-primary" onClick={startRace}>Race Again</button>
        )}
      </div>
    </GameWrapper>
  )
}
