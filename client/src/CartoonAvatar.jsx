import { useState, useRef, useCallback, useEffect } from 'react'

const API = '/api'

function applyCartoonFilter(canvas, ctx, img) {
  const w = canvas.width
  const h = canvas.height

  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const src = new Uint8ClampedArray(imageData.data)

  const blurred = new Uint8ClampedArray(src.length)
  const radius = 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const idx = (ny * w + nx) * 4
            r += src[idx]; g += src[idx + 1]; b += src[idx + 2]
            count++
          }
        }
      }
      const idx = (y * w + x) * 4
      blurred[idx] = r / count
      blurred[idx + 1] = g / count
      blurred[idx + 2] = b / count
      blurred[idx + 3] = 255
    }
  }

  const levels = 12
  const step = 256 / levels
  for (let i = 0; i < blurred.length; i += 4) {
    blurred[i] = Math.round(blurred[i] / step) * step + step / 2
    blurred[i + 1] = Math.round(blurred[i + 1] / step) * step + step / 2
    blurred[i + 2] = Math.round(blurred[i + 2] / step) * step + step / 2
    blurred[i] = Math.min(255, blurred[i])
    blurred[i + 1] = Math.min(255, blurred[i + 1])
    blurred[i + 2] = Math.min(255, blurred[i + 2])
  }

  const edges = new Uint8ClampedArray(src.length)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      const l = blurred[idx - 4], r2 = blurred[idx + 4]
      const t = blurred[idx - w * 4], b2 = blurred[idx + w * 4]
      const gx = Math.abs(r2 - l)
      const gy = Math.abs(b2 - t)
      const edge = Math.min(255, gx + gy)

      if (edge > 30) {
        const darken = Math.max(0, 0.4)
        edges[idx] = blurred[idx] * darken
        edges[idx + 1] = blurred[idx + 1] * darken
        edges[idx + 2] = blurred[idx + 2] * darken
        edges[idx + 3] = 255
      } else {
        const s = 1.15
        edges[idx] = Math.min(255, blurred[idx] * s)
        edges[idx + 1] = Math.min(255, blurred[idx + 1] * s)
        edges[idx + 2] = Math.min(255, blurred[idx + 2] * s)
        edges[idx + 3] = 255
      }
    }
  }

  const out = new ImageData(edges, w, h)
  ctx.putImageData(out, 0, 0)
}

function getAuthHeaders(kid, adminToken) {
  const token = kid?._token || kid?._adminToken || adminToken
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export default function CartoonAvatar({ kid, adminToken, onAvatarSaved }) {
  const [original, setOriginal] = useState(null)
  const [cartoonized, setCartoonized] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setCartoonized(null)
    setMessage('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      setOriginal(ev.target.result)
      processImage(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const processImage = (src) => {
    setProcessing(true)
    setMessage('')

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
      applyCartoonFilter(canvas, ctx, img)

      const url = canvas.toDataURL('image/png')
      setCartoonized(url)
      setProcessing(false)
      setMessage('Cartoon avatar ready!')
    }
    img.onerror = () => {
      setProcessing(false)
      setMessage('Failed to process image')
    }
    img.src = src
  }

  const handleSave = async () => {
    if (!cartoonized) return
    setSaving(true)

    try {
      const response = await fetch(cartoonized)
      const blob = await response.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch(`${API}/kids/${kid.id}/avatar`, {
        method: 'POST',
        headers: getAuthHeaders(kid, adminToken),
        body: formData
      })

      const data = await res.json()
      if (data.success) {
        setMessage('Avatar saved!')
        if (onAvatarSaved) onAvatarSaved(data.avatar_url)
      } else {
        setMessage(data.error || 'Failed to save')
      }
    } catch (err) {
      setMessage('Failed to save avatar')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    try {
      await fetch(`${API}/kids/${kid.id}/avatar`, {
        method: 'DELETE',
        headers: getAuthHeaders(kid, adminToken)
      })
      setOriginal(null)
      setCartoonized(null)
      setMessage('Avatar removed')
      if (onAvatarSaved) onAvatarSaved(null)
    } catch (err) {
      setMessage('Failed to remove avatar')
    }
  }

  return (
    <div className="cartoon-avatar-section">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {kid.avatar_photo && !original && (
        <div className="cartoon-current">
          <img src={kid.avatar_photo} alt={`${kid.name}'s avatar`} className="cartoon-current-img" />
          <button className="btn btn-danger btn-sm" onClick={handleRemove}>Remove Photo</button>
        </div>
      )}

      <div className="cartoon-upload" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {original ? (
          <div className="cartoon-preview-row">
            <div className="cartoon-preview-card">
              <img src={original} alt="Original" className="cartoon-preview-img" />
              <span className="cartoon-preview-label">Photo</span>
            </div>
            <div className="cartoon-preview-arrow">→</div>
            <div className="cartoon-preview-card">
              {cartoonized ? (
                <img src={cartoonized} alt="Cartoon" className="cartoon-preview-img" />
              ) : (
                <div className="cartoon-preview-placeholder">
                  {processing ? '🎨' : '?'}
                </div>
              )}
              <span className="cartoon-preview-label">Cartoon</span>
            </div>
          </div>
        ) : (
          <div className="cartoon-upload-prompt">
            <span className="cartoon-upload-icon">📸</span>
            <span>Take or choose a photo for your avatar</span>
          </div>
        )}
      </div>

      {original && (
        <div className="cartoon-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !cartoonized}>
            {saving ? 'Saving...' : '💾 Save Avatar'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setOriginal(null); setCartoonized(null); setMessage('') }}>
            Cancel
          </button>
        </div>
      )}

      {message && (
        <div className={`cartoon-message ${message.includes('Failed') || message.includes('failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  )
}
