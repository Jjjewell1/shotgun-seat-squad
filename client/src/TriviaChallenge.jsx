import { useState, useEffect } from 'react'

const API = '/api'

const CATEGORIES = [
  { id: 'animals', icon: '🐾', name: 'Animals' },
  { id: 'science', icon: '🔬', name: 'Science' },
  { id: 'geography', icon: '🌍', name: 'Geography' },
  { id: 'movies', icon: '🎬', name: 'Movies & TV' },
  { id: 'food', icon: '🍕', name: 'Food' },
  { id: 'space', icon: '🚀', name: 'Space' },
  { id: 'history', icon: '📚', name: 'History' },
  { id: 'random', icon: '🎲', name: 'Random Mix' },
]

export default function TriviaChallenge({ kid, onBack }) {
  const [gameState, setGameState] = useState('menu') // menu, playing, result
  const [category, setCategory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalQuestions] = useState(10)

  const generateQuestions = async (cat) => {
    setLoading(true)
    setCategory(cat)

    try {
      const catName = CATEGORIES.find(c => c.id === cat)?.name || 'random'
      const res = await fetch(`${API}/ollama/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kid._token}`
        },
        body: JSON.stringify({
          model: 'hermes3:8b',
          messages: [
            {
              role: 'system',
              content: `You are a trivia question generator for kids. Generate ${totalQuestions} multiple choice trivia questions about ${catName === 'Random Mix' ? 'various fun topics' : catName}. 
Make them fun, educational, and age-appropriate (ages 6-12). 
Mix easy and medium difficulty.
Return ONLY valid JSON, no other text.`
            },
            {
              role: 'user',
              content: `Generate ${totalQuestions} trivia questions as JSON array. Each question must have:
- "q": the question text
- "options": array of 4 answer strings
- "correct": the index of correct answer (0-3)
- "fun": a fun fact about the correct answer (1 sentence)

Return ONLY the JSON array, no markdown, no explanation. Example:
[{"q":"What color is the sky?","options":["Blue","Green","Red","Yellow"],"correct":0,"fun":"The sky looks blue because of how sunlight scatters!"}]`
            }
          ]
        })
      })
      const data = await res.json()
      if (data.success) {
        try {
          let text = data.message.trim()
          if (text.startsWith('```')) {
            text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
          }
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuestions(parsed.slice(0, totalQuestions))
            setGameState('playing')
            setCurrentQ(0)
            setScore(0)
            setStreak(0)
            setSelected(null)
            setShowResult(false)
          }
        } catch (parseErr) {
          console.error('Parse error:', parseErr)
        }
      }
    } catch (err) {
      console.error('Trivia error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (idx) => {
    if (showResult) return
    setSelected(idx)
    setShowResult(true)

    const correct = questions[currentQ].correct === idx
    if (correct) {
      setScore(s => s + 1)
      setStreak(s => {
        const newStreak = s + 1
        if (newStreak > bestStreak) setBestStreak(newStreak)
        return newStreak
      })
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setGameState('result')
    } else {
      setCurrentQ(c => c + 1)
      setSelected(null)
      setShowResult(false)
    }
  }

  if (gameState === 'menu') {
    return (
      <div className="game-screen">
        <div className="game-header">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2>🧠 Trivia Challenge</h2>
        </div>
        <div className="game-intro">
          <div className="game-intro-icon">🧠</div>
          <h3>Pick a Category!</h3>
          <p>{totalQuestions} questions per round. Build streaks for bonus bragging rights!</p>
          <div className="trivia-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="btn btn-primary trivia-cat-btn"
                onClick={() => generateQuestions(cat.id)}
                disabled={loading}
              >
                <span className="trivia-cat-icon">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="game-screen">
        <div className="game-header">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2>🧠 Trivia Challenge</h2>
        </div>
        <div className="game-loading">
          <div className="game-loading-icon">🤖</div>
          <p>Generating {totalQuestions} questions...</p>
          <div className="game-loading-dots">
            <span>•</span><span>•</span><span>•</span>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'result') {
    const pct = Math.round((score / questions.length) * 100)
    const grade = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '💪'
    return (
      <div className="game-screen">
        <div className="game-header">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2>🧠 Trivia Challenge</h2>
        </div>
        <div className="game-result">
          <div className="game-result-icon">{grade}</div>
          <h3>Round Complete!</h3>
          <div className="trivia-score-big">{score}/{questions.length}</div>
          <div className="trivia-score-pct">{pct}%</div>
          {bestStreak > 2 && (
            <div className="trivia-streak-record">🔥 Best streak: {bestStreak}</div>
          )}
          <div className="game-result-actions">
            <button className="btn btn-primary" onClick={() => {
              setGameState('menu')
              setQuestions([])
            }}>Play Again</button>
            <button className="btn btn-secondary" onClick={onBack}>Back to Games</button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  const progress = ((currentQ) / questions.length) * 100

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <h2>🧠 Trivia Challenge</h2>
      </div>

      <div className="trivia-progress-bar">
        <div className="trivia-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="trivia-progress-text">
        {currentQ + 1} / {questions.length}
        {streak > 1 && <span className="trivia-streak"> 🔥 {streak}</span>}
      </div>

      <div className="trivia-question-card">
        <h3 className="trivia-question">{q.q}</h3>

        <div className="trivia-options">
          {q.options.map((opt, i) => {
            let className = 'btn trivia-option'
            if (showResult) {
              if (i === q.correct) className += ' trivia-correct'
              else if (i === selected) className += ' trivia-wrong'
              else className += ' trivia-dim'
            } else if (i === selected) {
              className += ' trivia-selected'
            }
            return (
              <button
                key={i}
                className={className}
                onClick={() => handleAnswer(i)}
                disabled={showResult}
              >
                <span className="trivia-option-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {showResult && (
          <div className={`trivia-result ${selected === q.correct ? 'trivia-result-correct' : 'trivia-result-wrong'}`}>
            {selected === q.correct ? '✅ Correct!' : '❌ Nope!'}
            <p className="trivia-fun-fact">{q.fun}</p>
            <button className="btn btn-primary" onClick={nextQuestion}>
              {currentQ + 1 >= questions.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
