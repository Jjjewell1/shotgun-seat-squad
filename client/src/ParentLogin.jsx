import { useState, useCallback } from 'react'

export default function ParentLogin({ onLogin, onBack }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      })
      const data = await res.json()
      if (data.success) {
        onLogin()
      } else {
        setError(true)
        setPin('')
      }
    } catch {
      setError(true)
      setPin('')
    }
    setLoading(false)
  }, [pin, onLogin])

  return (
    <div className="parent-login">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="parent-login-card">
        <div className="parent-login-icon">🔑</div>
        <h2 className="parent-login-title">Parent Access</h2>
        <p className="parent-login-prompt">Enter the admin PIN</p>

        <form onSubmit={handleSubmit} className="kid-login-form">
          <input
            type="password"
            className={`kid-login-input ${error ? 'kid-login-input-error' : ''}`}
            placeholder="PIN..."
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            autoFocus
            disabled={loading}
            maxLength={12}
          />
          {error && <p className="kid-login-error">Wrong PIN! Try again 🔒</p>}
          <button type="submit" className="btn btn-primary kid-login-btn" disabled={loading}>
            {loading ? 'Checking...' : 'Unlock'}
          </button>
        </form>

        <p className="parent-login-hint">Default PIN: 1234</p>
      </div>
    </div>
  )
}
