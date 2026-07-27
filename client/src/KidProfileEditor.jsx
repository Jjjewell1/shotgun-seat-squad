import { useState, useEffect } from 'react'
import CartoonAvatar from './CartoonAvatar'

const API = '/api'

const EMOJI_OPTIONS = [
  '🚗', '🏎️', '🚕', '🚌', '🚓', '🚑', '🚒', '🚐', '🚚', '🚙',
  '🐶', '🐱', '🦄', '🐻', '🐼', '🦊', '🐸', '🦁', '🐯', '🐮',
  '⚡', '🌟', '🔥', '💎', '🎮', '🎵', '🚀', '✈️', '🦸', '🧑‍🚀',
  '🏀', '⚽', '🎸', '🎯', '🌈'
]

export default function KidProfileEditor({ kid, onSaved, onBack }) {
  const [emoji, setEmoji] = useState(kid.avatar || '🚗')
  const [passphrase, setPassphrase] = useState('')
  const [passphraseConfirm, setPassphraseConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('photo')
  const [emojiOptions, setEmojiOptions] = useState(EMOJI_OPTIONS)

  useEffect(() => {
    fetch(`${API}/emoji-options`).then(r => r.json()).then(setEmojiOptions).catch(() => {})
  }, [])

  const handleEmojiSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/kids/${kid.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kid._token}`
        },
        body: JSON.stringify({ avatar: emoji })
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Emoji updated!')
        if (onSaved) onSaved(data.kid)
      } else {
        setMessage(data.error || 'Failed to save')
      }
    } catch {
      setMessage('Failed to save')
    }
    setSaving(false)
  }

  const handlePassphraseSave = async () => {
    if (!passphrase) {
      setMessage('Type a new secret word')
      return
    }
    if (passphrase !== passphraseConfirm) {
      setMessage('Words don\'t match!')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/kids/${kid.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kid._token}`
        },
        body: JSON.stringify({ passphrase })
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Secret word changed!')
        setPassphrase('')
        setPassphraseConfirm('')
      } else {
        setMessage(data.error || 'Failed to save')
      }
    } catch {
      setMessage('Failed to save')
    }
    setSaving(false)
  }

  return (
    <div className="kid-profile-editor">
      <header className="kid-header">
        <div className="kid-header-info">
          <span className="kid-header-avatar">
            {kid.avatar_photo ? (
              <img src={kid.avatar_photo} alt={kid.name} className="kid-header-avatar-img" />
            ) : (
              kid.avatar
            )}
          </span>
          <div>
            <h1 className="kid-header-name" style={{ color: kid.color }}>Edit Profile</h1>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
      </header>

      <div className="kid-tabs" style={{ marginBottom: 20 }}>
        <button className={`kid-tab ${activeSection === 'photo' ? 'active' : ''}`} onClick={() => setActiveSection('photo')}>📸 Photo</button>
        <button className={`kid-tab ${activeSection === 'emoji' ? 'active' : ''}`} onClick={() => setActiveSection('emoji')}>😊 Emoji</button>
        <button className={`kid-tab ${activeSection === 'password' ? 'active' : ''}`} onClick={() => setActiveSection('password')}>🔑 Secret Word</button>
      </div>

      {activeSection === 'photo' && (
        <div className="kid-profile-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Take a photo and turn it into a cartoon avatar!
          </p>
          <CartoonAvatar
            kid={kid}
            onAvatarSaved={(url) => {
              if (onSaved) onSaved({ ...kid, avatar_photo: url })
            }}
          />
        </div>
      )}

      {activeSection === 'emoji' && (
        <div className="kid-profile-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Pick an emoji as your avatar
          </p>
          <div className="emoji-picker-grid" style={{ marginBottom: 16 }}>
            {emojiOptions.map(e => (
              <button
                key={e}
                className={`emoji-option ${emoji === e ? 'emoji-selected' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleEmojiSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Emoji'}
          </button>
        </div>
      )}

      {activeSection === 'password' && (
        <div className="kid-profile-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Change your secret word
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
            <input
              type="password"
              className="kid-login-input"
              placeholder="New secret word..."
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
            />
            <input
              type="password"
              className="kid-login-input"
              placeholder="Type it again..."
              value={passphraseConfirm}
              onChange={e => setPassphraseConfirm(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handlePassphraseSave} disabled={saving}>
              {saving ? 'Saving...' : 'Change Secret Word'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`cartoon-message ${message.includes('Failed') || message.includes('failed') || message.includes('match') || message.includes('must') ? 'error' : 'success'}`} style={{ marginTop: 16 }}>
          {message}
        </div>
      )}
    </div>
  )
}
