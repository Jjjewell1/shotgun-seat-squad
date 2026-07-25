import { useState, useCallback } from 'react'
import GameWrapper from './GameWrapper'

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

export default function TicTacToe({ kid, highscore, onHighscore, onBack }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [roundCount, setRoundCount] = useState(0)

  const checkWinner = (squares) => {
    for (const [a,b,c] of WINNING_LINES) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const minimax = (squares, isMax) => {
    const w = checkWinner(squares)
    if (w === '🚛') return 10
    if (w === '🚗') return -10
    if (squares.every(s => s !== null)) return 0

    if (isMax) {
      let best = -Infinity
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = '🚛'
          best = Math.max(best, minimax(squares, false))
          squares[i] = null
        }
      }
      return best
    } else {
      let best = Infinity
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = '🚗'
          best = Math.min(best, minimax(squares, true))
          squares[i] = null
        }
      }
      return best
    }
  }

  const computerMove = useCallback((currentBoard) => {
    let bestScore = -Infinity
    let bestMove = -1
    const boardCopy = [...currentBoard]

    for (let i = 0; i < 9; i++) {
      if (!boardCopy[i]) {
        boardCopy[i] = '🚛'
        const s = minimax(boardCopy, false)
        boardCopy[i] = null
        if (s > bestScore) {
          bestScore = s
          bestMove = i
        }
      }
    }
    return bestMove
  }, [])

  const handlePlayerMove = (index) => {
    if (board[index] || gameOver || !isPlayerTurn) return

    const newBoard = [...board]
    newBoard[index] = '🚗'
    setBoard(newBoard)

    const w = checkWinner(newBoard)
    if (w) {
      setWinner('player')
      setGameOver(true)
      setScore(s => s + 1)
      onHighscore(score + 1)
      return
    }
    if (newBoard.every(s => s !== null)) {
      setGameOver(true)
      return
    }

    setIsPlayerTurn(false)

    setTimeout(() => {
      const move = computerMove(newBoard)
      if (move >= 0) {
        newBoard[move] = '🚛'
        setBoard([...newBoard])
        const w2 = checkWinner(newBoard)
        if (w2) {
          setWinner('computer')
          setGameOver(true)
        } else if (newBoard.every(s => s !== null)) {
          setGameOver(true)
        } else {
          setIsPlayerTurn(true)
        }
      }
    }, 400)
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsPlayerTurn(true)
    setGameOver(false)
    setWinner(null)
    setRoundCount(r => r + 1)
  }

  return (
    <GameWrapper title="Car Tic-Tac-Toe" icon="❌⭕" onBack={onBack}>
      <div className="ttt-status">
        <span>You: 🚗</span>
        <span className="ttt-score">Wins: {score} {highscore > 0 ? `(Best: ${highscore})` : ''}</span>
        <span>Computer: 🛻</span>
      </div>

      {gameOver && (
        <div className={`ttt-result ${winner === 'player' ? 'ttt-win' : winner === 'computer' ? 'ttt-lose' : 'ttt-draw'}`}>
          {winner === 'player' ? '🎉 You Win!' : winner === 'computer' ? '😢 Computer Wins!' : '🤝 Draw!'}
        </div>
      )}

      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            className="ttt-cell"
            onClick={() => handlePlayerMove(i)}
            disabled={!!cell || gameOver}
          >
            <span className="ttt-cell-content">{cell || ''}</span>
          </button>
        ))}
      </div>

      {gameOver && (
        <button className="btn btn-primary" onClick={resetGame}>Play Again</button>
      )}
    </GameWrapper>
  )
}
