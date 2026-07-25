import { useState, useEffect, useCallback } from 'react'
import GameWrapper from './GameWrapper'

function generatePlate(difficulty) {
  const digits = 3 + Math.min(difficulty, 3)
  let num = ''
  for (let i = 0; i < digits; i++) {
    num += Math.floor(Math.random() * 10)
  }
  return num
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LicensePlate({ kid, highscore, onHighscore, onBack }) {
  const [level, setLevel] = useState(1)
  const [plate, setPlate] = useState('')
  const [showPlate, setShowPlate] = useState(true)
  const [tiles, setTiles] = useState([])
  const [placed, setPlaced] = useState([])
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)

  const startLevel = useCallback(() => {
    const p = generatePlate(level)
    setPlate(p)
    setShowPlate(true)
    setTiles(shuffle(p.split('')))
    setPlaced(Array(p.length).fill(''))
    setTimer(0)
  }, [level])

  useEffect(() => { startLevel() }, [level])

  useEffect(() => {
    if (!started || gameOver) return
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [started, gameOver])

  useEffect(() => {
    if (!showPlate || !started) return
    const timeout = setTimeout(() => setShowPlate(false), Math.max(1500 - level * 100, 500))
    return () => clearTimeout(timeout)
  }, [showPlate, started, level])

  const handleTileClick = (tileIndex) => {
    if (!started) setStarted(true)
    if (showPlate) return

    const nextEmpty = placed.findIndex(p => p === '')
    if (nextEmpty === -1) return

    const newPlaced = [...placed]
    newPlaced[nextEmpty] = tiles[tileIndex]
    setPlaced(newPlaced)

    const newTiles = [...tiles]
    newTiles[tileIndex] = null
    setTiles(newTiles)

    if (newPlaced.every(p => p !== '')) {
      const attempt = newPlaced.join('')
      if (attempt === plate) {
        const timeBonus = Math.max(0, 30 - timer)
        const newScore = score + level * 10 + timeBonus
        setScore(newScore)

        if (level >= 5) {
          setGameOver(true)
          onHighscore(newScore)
        } else {
          setLevel(l => l + 1)
        }
      } else {
        setGameOver(true)
        onHighscore(score)
      }
    }
  }

  const handleSlotClick = (slotIndex) => {
    if (placed[slotIndex] === '') return
    const newPlaced = [...placed]
    const char = newPlaced[slotIndex]
    newPlaced[slotIndex] = ''

    const emptyTileIndex = tiles.findIndex(t => t === null)
    if (emptyTileIndex >= 0) {
      const newTiles = [...tiles]
      newTiles[emptyTileIndex] = char
      setTiles(newTiles)
    }
    setPlaced(newPlaced)
  }

  const resetGame = () => {
    setLevel(1)
    setScore(0)
    setGameOver(false)
    setStarted(false)
    startLevel()
  }

  return (
    <GameWrapper title="License Plate Puzzle" icon="🔢" onBack={onBack}>
      <div className="lp-status">
        <span>Level: {level}/5</span>
        <span>Score: {score}</span>
        <span>Time: {timer}s</span>
      </div>

      {showPlate && (
        <div className="lp-plate-display">
          <div className="lp-plate">
            <div className="lp-plate-text">{plate}</div>
          </div>
          <p className="lp-plate-hint">Memorize this plate!</p>
        </div>
      )}

      {!showPlate && !gameOver && (
        <>
          <div className="lp-slots">
            {placed.map((slot, i) => (
              <button
                key={i}
                className="lp-slot"
                onClick={() => handleSlotClick(i)}
              >
                {slot || '_'}
              </button>
            ))}
          </div>

          <div className="lp-tiles">
            {tiles.map((tile, i) => (
              <button
                key={i}
                className={`lp-tile ${tile === null ? 'lp-tile-used' : ''}`}
                onClick={() => tile !== null && handleTileClick(i)}
                disabled={tile === null}
              >
                {tile || ''}
              </button>
            ))}
          </div>
        </>
      )}

      {gameOver && (
        <div className="lp-gameover">
          <div className="lp-gameover-text">
            {level > 5 ? '🎉 You Beat All Levels!' : 'Game Over!'}
            <br />Score: {score}
          </div>
          <button className="btn btn-primary" onClick={resetGame}>Play Again</button>
        </div>
      )}
    </GameWrapper>
  )
}
