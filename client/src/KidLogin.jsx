import { useState } from 'react'

export default function KidLogin({ kid, onLogin, onBack }) {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!passphrase.trim()) return
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth/kid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_id: kid.id, passphrase: passphrase.trim() })
      })
      const data = await res.json()
      if (data.success) {
        onLogin(data.kid)
      } else {
        setError(true)
        setPassphrase('')
      }
    } catch {
      setError(true)
      setPassphrase('')
    }
    setLoading(false)
  }

  return (
    <div className="kid-login">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="kid-login-card" style={{ '--kid-color': kid.color }}>
        <div className="kid-login-avatar">{kid.avatar}</div>
        <h2 className="kid-login-name" style={{ color: kid.color }}>{kid.name}</h2>
        <p className="kid-login-prompt">Type your secret word</p>

        <form onSubmit={handleSubmit} className="kid-login-form">
          <input
            type="password"
            className={`kid-login-input ${error ? 'kid-login-input-error' : ''}`}
            placeholder="Secret word..."
            value={passphrase}
            onChange={e => { setPassphrase(e.target.value); setError(false) }}
            autoFocus
            disabled={loading}
          />
          {error && <p className="kid-login-error">Wrong word! Try again 🤔</p>}
          <button type="submit" className="btn btn-primary kid-login-btn" disabled={loading}>
            {loading ? 'Checking...' : 'Go!'}
          </button>
        </form>
      </div>
    </div>
  )
}
