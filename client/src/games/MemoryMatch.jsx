import { useState, useEffect } from 'react'
import GameWrapper from './GameWrapper'

const CAR_EMOJIS = ['🚗', '🏎️', '🚕', '🚌', '🚓', '🚑', '🚒', '🚐', '🚚', '🚙', '🚜', '🏍️']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MemoryMatch({ kid, highscore, onHighscore, onBack }) {
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [timer, setTimer] = useState(0)
  const [started, setStarted] = useState(false)

  const initGame = () => {
    const pairs = CAR_EMOJIS.slice(0, 6)
    const deck = shuffle([...pairs, ...pairs].map((emoji, i) => ({ id: i, emoji })))
    setCards(deck)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setTimer(0)
    setGameComplete(false)
    setStarted(false)
  }

  useEffect(() => { initGame() }, [])

  useEffect(() => {
    if (!started || gameComplete) return
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [started, gameComplete])

  useEffect(() => {
    if (flipped.length !== 2) return
    const [a, b] = flipped
    setMoves(m => m + 1)

    if (cards[a].emoji === cards[b].emoji) {
      setMatched(prev => [...prev, cards[a].emoji])
      setFlipped([])
    } else {
      const timeout = setTimeout(() => setFlipped([]), 800)
      return () => clearTimeout(timeout)
    }
  }, [flipped, cards])

  useEffect(() => {
    if (matched.length === 6 && matched.length > 0) {
      setGameComplete(true)
      const score = moves + timer
      onHighscore(score)
    }
  }, [matched, moves, timer, onHighscore])

  const handleCardClick = (index) => {
    if (!started) setStarted(true)
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(cards[index].emoji)) return
    setFlipped(prev => [...prev, index])
  }

  return (
    <GameWrapper title="Memory Match" icon="🃏" onBack={onBack}>
      <div className="mm-status">
        <span>Moves: {moves}</span>
        <span>Time: {timer}s</span>
        {highscore != null && <span>Best: {highscore}</span>}
      </div>

      <div className="mm-grid">
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(card.emoji)
          return (
            <button
              key={card.id}
              className={`mm-card ${isFlipped ? 'mm-card-flipped' : ''} ${matched.includes(card.emoji) ? 'mm-card-matched' : ''}`}
              onClick={() => handleCardClick(i)}
              disabled={matched.includes(card.emoji)}
            >
              <span className="mm-card-inner">
                {isFlipped ? card.emoji : '❓'}
              </span>
            </button>
          )
        })}
      </div>

      {gameComplete && (
        <div className="mm-complete">
          <div className="mm-complete-text">🎉 Complete! {moves} moves in {timer}s</div>
          <button className="btn btn-primary" onClick={initGame}>Play Again</button>
        </div>
      )}
    </GameWrapper>
  )
}
