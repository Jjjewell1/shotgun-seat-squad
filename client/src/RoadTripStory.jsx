import { useState, useRef, useEffect } from 'react'

const API = '/api'

const SYSTEM_PROMPT = `You are a fun, silly, and imaginative storyteller for kids on a road trip. 
You tell interactive choose-your-own-adventure stories. 
Keep responses short (2-4 sentences max). 
Make them exciting, funny, and age-appropriate. 
Always end with a clear choice for the kid to make (A or B). 
Use emojis sparingly but fun. 
Never be scary or mean. 
The kid's name will be mentioned. Make the story about a fun road trip adventure.`

export default function RoadTripStory({ kid, onBack }) {
  const [story, setStory] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [story])

  const startStory = async () => {
    setGameStarted(true)
    setLoading(true)

    try {
      const res = await fetch(`${API}/ollama/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kid._token}`
        },
        body: JSON.stringify({
          model: 'hermes3:8b',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Start a new road trip adventure for ${kid.name}! The adventure begins at a gas station. Give 2 fun choices (A or B).` }
          ]
        })
      })
      const data = await res.json()
      if (data.success) {
        setStory([{ role: 'assistant', content: data.message }])
      } else {
        setStory([{ role: 'assistant', content: 'Oops! My storyteller brain took a nap. Try again!' }])
      }
    } catch (err) {
      setStory([{ role: 'assistant', content: 'Oops! My storyteller brain took a nap. Try again!' }])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (choice) => {
    if (loading) return
    setInput('')
    setLoading(true)

    const userMessage = { role: 'user', content: choice }
    setStory(prev => [...prev, userMessage])

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...story.map(m => ({ role: m.role, content: m.content })),
      userMessage
    ]

    try {
      const res = await fetch(`${API}/ollama/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kid._token}`
        },
        body: JSON.stringify({ model: 'hermes3:8b', messages })
      })
      const data = await res.json()
      if (data.success) {
        setStory(prev => [...prev, { role: 'assistant', content: data.message }])
      } else {
        setStory(prev => [...prev, { role: 'assistant', content: 'Hmm, my brain glitched! What do you do next?' }])
      }
    } catch (err) {
      setStory(prev => [...prev, { role: 'assistant', content: 'Connection hiccup! Try again?' }])
    } finally {
      setLoading(false)
    }
  }

  if (!gameStarted) {
    return (
      <div className="game-screen">
        <div className="game-header">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2>📖 Road Trip Story</h2>
        </div>
        <div className="game-intro">
          <div className="game-intro-icon">🗺️</div>
          <h3>Choose Your Adventure!</h3>
          <p>A magical storytelling adventure where YOU make the choices! Every decision leads to a different ending. How many endings can you find?</p>
          <button className="btn btn-primary btn-lg" onClick={startStory}>
            Start Adventure!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <h2>📖 Road Trip Story</h2>
      </div>

      <div className="story-chat">
        {story.map((msg, i) => (
          <div key={i} className={`story-message story-${msg.role}`}>
            <div className="story-bubble">
              {msg.content.split('\n').map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="story-message story-assistant">
            <div className="story-bubble story-typing">
              <span>✍️</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!loading && story.length > 0 && story[story.length - 1].role === 'assistant' && (
        <div className="story-choices">
          {extractChoices(story[story.length - 1].content).map((choice, i) => (
            <button
              key={i}
              className="btn btn-primary story-choice-btn"
              onClick={() => sendMessage(choice)}
            >
              {choice}
            </button>
          ))}
          <button
            className="btn btn-secondary story-custom-btn"
            onClick={() => {
              const custom = prompt('Type your own choice:')
              if (custom?.trim()) sendMessage(custom.trim())
            }}
          >
            Or type your own...
          </button>
        </div>
      )}
    </div>
  )
}

function extractChoices(text) {
  const choices = []
  const lines = text.split('\n')
  for (const line of lines) {
    const aMatch = line.match(/^[Aa]\)[:\s]+(.+)/)
    const bMatch = line.match(/^[Bb]\)[:\s]+(.+)/)
    if (aMatch) choices.push(aMatch[1].trim())
    if (bMatch) choices.push(bMatch[1].trim())
  }
  if (choices.length < 2) {
    if (text.toLowerCase().includes('a)')) choices.push('Option A')
    if (text.toLowerCase().includes('b)')) choices.push('Option B')
  }
  return choices.slice(0, 2)
}
