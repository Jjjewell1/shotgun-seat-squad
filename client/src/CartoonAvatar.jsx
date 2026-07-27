import { useState, useRef, useCallback } from 'react'

const API = '/api'

function applyCartoonFilter(canvas, ctx, img) {
  const w = canvas.width
  const h = canvas.height

  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const levels = 8
  const step = 255 / levels

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step
    data[i + 1] = Math.round(data[i + 1] / step) * step
    data[i + 2] = Math.round(data[i + 2] / step) * step

    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    const boost = 1.2
    data[i] = Math.min(255, data[i] * (avg > 128 ? boost : 1 / boost))
    data[i + 1] = Math.min(255, data[i + 1] * (avg > 128 ? boost : 1 / boost))
    data[i + 2] = Math.min(255, data[i + 2] * (avg > 128 ? boost : 1 / boost))
  }

  ctx.putImageData(imageData, 0, 0)

  const edgeData = ctx.getImageData(0, 0, w, h)
  const edges = new Uint8ClampedArray(edgeData.data.length)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4

      const l = edgeData.data[idx - 4]
      const r = edgeData.data[idx + 4]
      const t = edgeData.data[idx - w * 4]
      const b = edgeData.data[idx + w * 4]

      const gx = Math.abs(r - l)
      const gy = Math.abs(b - t)
      const edge = Math.min(255, gx + gy)

      if (edge > 40) {
        edges[idx] = 0
        edges[idx + 1] = 0
        edges[idx + 2] = 0
        edges[idx + 3] = Math.min(255, edge * 2)
      } else {
        edges[idx] = data[idx]
        edges[idx + 1] = data[idx + 1]
        edges[idx + 2] = data[idx + 2]
        edges[idx + 3] = 255
      }
    }
  }

  const edgeImageData = new ImageData(edges, w, h)
  ctx.putImageData(edgeImageData, 0, 0)
}

export default function CartoonAvatar({ kid, adminToken, onAvatarSaved }) {
  const [original, setOriginal] = useState(null)
  const [cartoonized, setCartoonized] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const authHeaders = { 'Authorization': `Bearer ${adminToken || ''}` }

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

      const headers = kid._adminToken
        ? { 'Authorization': `Bearer ${kid._adminToken}` }
        : { 'Authorization': `Bearer ${adminToken}` }

      const res = await fetch(`${API}/kids/${kid.id}/avatar`, {
        method: 'POST',
        headers,
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
      const headers = kid._adminToken
        ? { 'Authorization': `Bearer ${kid._adminToken}` }
        : { 'Authorization': `Bearer ${adminToken}` }

      await fetch(`${API}/kids/${kid.id}/avatar`, {
        method: 'DELETE',
        headers
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
