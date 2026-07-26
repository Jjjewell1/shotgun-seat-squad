import { useState, useEffect, useRef } from 'react'

const VOICE_LINES = [
  "Time to buckle up, buttercup!",
  "Shotgun! No takebacks!",
  "The road awaits, your highness!",
  "Vroom vroom, here comes trouble!",
  "Front seat VIP, coming through!",
  "All eyes on the road... and the new champion!",
  "Winner winner, car seat dinner!",
  "Legends ride up front!",
  "The throne is yours, your majesty!",
  "Saddle up, partner!",
  "Mission accepted, let's roll!",
  "The chosen one has been selected!",
  "Bow down to the shotgun monarch!",
  "Adventure awaits in the front seat!",
  "And the crowd goes wild!"
]

function speakWinner(name) {
  if (!window.speechSynthesis) return
  const line = VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)]
  const utterance = new SpeechSynthesisUtterance(`${name}! ${line}`)
  const voices = window.speechSynthesis.getVoices()
  const femaleVoice = voices.find(v =>
    /female|samantha|zira|google.*us.*female|karen|moira|tessa|fiona|alice/i.test(v.name)
  ) || voices.find(v => /en/i.test(v.lang))
  if (femaleVoice) utterance.voice = femaleVoice
  utterance.rate = 0.95
  utterance.pitch = 1.1
  utterance.volume = 1.0
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export default function ShufflePicker({ kids, winner, onComplete, kidColor }) {
  const [phase, setPhase] = useState('shuffle')
  const [shuffledAvatars, setShuffledAvatars] = useState([])
  const [revealed, setRevealed] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const avatars = kids.map(k => k.avatar)
    let count = 0
    const max = 15

    intervalRef.current = setInterval(() => {
      count++
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)]
      setShuffledAvatars(prev => [...prev.slice(-2), randomAvatar])

      if (count >= max) {
        clearInterval(intervalRef.current)
        setPhase('reveal')
        setTimeout(() => {
          setRevealed(true)
          if (winner) speakWinner(winner.name)
          setTimeout(() => onComplete(), 3000)
        }, 400)
      }
    }, 100)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [kids, winner, onComplete])

  return (
    <div className="shuffle-overlay">
      <div className="shuffle-single-card-container">
        {phase === 'shuffle' && (
          <div className="shuffle-single-card shuffling">
            <div className="shuffle-card-inner">
              <span className="shuffle-card-back">🚗</span>
            </div>
            <div className="shuffle-avatar-flash">
              {shuffledAvatars.map((a, i) => (
                <span key={i} className="shuffle-flash-avatar">{a}</span>
              ))}
            </div>
          </div>
        )}

        {phase === 'reveal' && winner && (
          <div className={`shuffle-single-card ${revealed ? 'revealed' : ''}`}>
            <div className="shuffle-card-inner">
              <span className="shuffle-card-avatar">{winner.avatar}</span>
              <span className="shuffle-card-name" style={{ color: winner.color || kidColor }}>{winner.name}</span>
            </div>
          </div>
        )}
      </div>

      {revealed && (
        <div className="shuffle-result">
          <div className="shuffle-result-text" style={{ color: kidColor || winner?.color }}>
            ShotGun goes to...
          </div>
        </div>
      )}
    </div>
  )
}
