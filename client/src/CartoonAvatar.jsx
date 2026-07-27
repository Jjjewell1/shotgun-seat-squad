import { useState, useRef, useEffect, useCallback } from 'react'

const API = '/api'

const STYLES = [
  { id: 'cartoon', icon: '🎨', name: 'Cartoon', desc: 'Bitmoji flat art' },
  { id: 'anime', icon: '🌸', name: 'Anime', desc: 'Manga style' },
  { id: 'pixar', icon: '🏰', name: 'Pixar', desc: '3D Disney look' },
  { id: 'watercolor', icon: '🖌️', name: 'Watercolor', desc: 'Painting style' },
  { id: 'comic', icon: '💥', name: 'Comic', desc: 'Action hero' },
  { id: 'pixel', icon: '👾', name: 'Pixel Art', desc: 'Retro 16-bit' },
  { id: 'chibi', icon: '🐱', name: 'Chibi', desc: 'Super cute' }
]

const BACKGROUNDS = [
  { id: 'white', icon: '⬜', name: 'Clean', gradient: ['#ffffff', '#ffffff'] },
  { id: 'rainbow', icon: '🌈', name: 'Rainbow', gradient: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'] },
  { id: 'space', icon: '🚀', name: 'Space', gradient: ['#0c0032', '#190061', '#240090'] },
  { id: 'beach', icon: '🏖️', name: 'Beach', gradient: ['#f7ce68', '#fbab7e', '#f7797d'] },
  { id: 'nature', icon: '🌲', name: 'Nature', gradient: ['#11998e', '#38ef7d'] },
  { id: 'city', icon: '🏙️', name: 'City', gradient: ['#373b44', '#4286f4'] },
  { id: 'lightning', icon: '⚡', name: 'Lightning', gradient: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'gaming', icon: '🎮', name: 'Gaming', gradient: ['#0f2027', '#203a43', '#2c5364'] }
]

function drawBackground(ctx, w, h, bgId) {
  const bg = BACKGROUNDS.find(b => b.id === bgId) || BACKGROUNDS[0]
  const colors = bg.gradient

  if (bgId === 'white' || colors.length < 2) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, w, h)
    return
  }

  if (bgId === 'rainbow') {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    return
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function compositeWithBackground(sdImage, bgId) {
  return new Promise((resolve) => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    drawBackground(ctx, size, size, bgId)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), 'image/png')
    }
    img.onerror = () => resolve(null)
    img.src = sdImage
  })
}

// === Canvas-based cartoon filter (fallback when ComfyUI unavailable) ===

function bilateralFilter(src, w, h, radius, sigmaSpace, sigmaColor) {
  const out = new Uint8ClampedArray(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const cr = src[idx], cg = src[idx + 1], cb = src[idx + 2]
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const nIdx = (ny * w + nx) * 4
          const pr = src[nIdx], pg = src[nIdx + 1], pb = src[nIdx + 2]
          const dist = dx * dx + dy * dy
          const colorDist = (cr - pr) ** 2 + (cg - pg) ** 2 + (cb - pb) ** 2
          const wSpace = Math.exp(-dist / (2 * sigmaSpace * sigmaSpace))
          const wColor = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor))
          const weight = wSpace * wColor
          sumR += pr * weight; sumG += pg * weight; sumB += pb * weight; sumW += weight
        }
      }
      out[idx] = sumR / sumW; out[idx + 1] = sumG / sumW; out[idx + 2] = sumB / sumW; out[idx + 3] = 255
    }
  }
  return out
}

function quantizeColors(data, levels) {
  const step = 256 / levels
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.round(data[i] / step) * step + step * 0.5)
    data[i + 1] = Math.min(255, Math.round(data[i + 1] / step) * step + step * 0.5)
    data[i + 2] = Math.min(255, Math.round(data[i + 2] / step) * step + step * 0.5)
  }
}

function detectEdges(w, h, data) {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
  }
  const sobel = new Float32Array(w * h)
  let maxMag = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y-1)*w+(x-1)], t = gray[(y-1)*w+x], tr = gray[(y-1)*w+(x+1)]
      const l = gray[y*w+(x-1)], r = gray[y*w+(x+1)]
      const bl = gray[(y+1)*w+(x-1)], b = gray[(y+1)*w+x], br = gray[(y+1)*w+(x+1)]
      const gx = -tl - 2*l - bl + tr + 2*r + br
      const gy = -tl - 2*t - tr + bl + 2*b + br
      const mag = Math.sqrt(gx*gx + gy*gy)
      sobel[y*w+x] = mag
      if (mag > maxMag) maxMag = mag
    }
  }
  if (maxMag > 0) for (let i = 0; i < sobel.length; i++) sobel[i] /= maxMag
  return sobel
}

function applyCanvasFilter(canvas, ctx, img) {
  const w = canvas.width, h = canvas.height
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const src = new Uint8ClampedArray(imageData.data)

  const smoothed = bilateralFilter(src, w, h, 4, 10, 25)
  const quantized = new Uint8ClampedArray(smoothed)
  quantizeColors(quantized, 18)

  for (let i = 0; i < quantized.length; i += 4) {
    const r = quantized[i], g = quantized[i+1], b = quantized[i+2]
    const avg = (r + g + b) / 3
    const factor = avg > 140 ? 1.18 : avg > 80 ? 1.1 : 1.0
    quantized[i] = Math.min(255, r * factor)
    quantized[i+1] = Math.min(255, g * factor)
    quantized[i+2] = Math.min(255, b * factor)
  }

  const edges = detectEdges(w, h, smoothed)
  const result = new Uint8ClampedArray(quantized.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = (y*w+x)*4, eIdx = y*w+x
      const edgeVal = edges[eIdx]
      if (edgeVal > 0.18) {
        result[pIdx] = 20; result[pIdx+1] = 18; result[pIdx+2] = 25; result[pIdx+3] = 255
      } else if (edgeVal > 0.08) {
        const t = (edgeVal - 0.08) / 0.1
        const blend = t * 0.7
        result[pIdx] = quantized[pIdx]*(1-blend) + 20*blend
        result[pIdx+1] = quantized[pIdx+1]*(1-blend) + 18*blend
        result[pIdx+2] = quantized[pIdx+2]*(1-blend) + 25*blend
        result[pIdx+3] = 255
      } else {
        result[pIdx] = quantized[pIdx]; result[pIdx+1] = quantized[pIdx+1]
        result[pIdx+2] = quantized[pIdx+2]; result[pIdx+3] = 255
      }
    }
  }
  ctx.putImageData(new ImageData(result, w, h), 0, 0)
}

function getAuthHeaders(kid, adminToken) {
  const token = kid?._token || kid?._adminToken || adminToken
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export default function CartoonAvatar({ kid, adminToken, onAvatarSaved }) {
  const [original, setOriginal] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [rawCartoonized, setRawCartoonized] = useState(null)
  const [cartoonized, setCartoonized] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState(null)
  const [message, setMessage] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('cartoon')
  const [selectedBg, setSelectedBg] = useState('white')
  const [hasSource, setHasSource] = useState(false)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/capabilities`)
      .then(r => r.json())
      .then(data => setMode(data.stableDiffusion ? 'ai' : 'canvas'))
      .catch(() => setMode('canvas'))
  }, [])

  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original)
      if (cartoonized) URL.revokeObjectURL(cartoonized)
      if (rawCartoonized) URL.revokeObjectURL(rawCartoonized)
    }
  }, [original, cartoonized, rawCartoonized])

  const applyBgComposite = useCallback(async (rawUrl, bgId) => {
    if (bgId === 'white') {
      if (cartoonized) URL.revokeObjectURL(cartoonized)
      setCartoonized(rawUrl)
      return
    }
    const composited = await compositeWithBackground(rawUrl, bgId)
    if (composited) {
      if (cartoonized) URL.revokeObjectURL(cartoonized)
      setCartoonized(composited)
    } else {
      setCartoonized(rawUrl)
    }
  }, [cartoonized])

  useEffect(() => {
    if (rawCartoonized) {
      applyBgComposite(rawCartoonized, selectedBg)
    }
  }, [selectedBg, rawCartoonized, applyBgComposite])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (original) URL.revokeObjectURL(original)
    if (cartoonized) URL.revokeObjectURL(cartoonized)
    if (rawCartoonized) URL.revokeObjectURL(rawCartoonized)
    setCartoonized(null)
    setRawCartoonized(null)
    setHasSource(false)
    setMessage('')
    const url = URL.createObjectURL(file)
    setOriginal(url)
    setOriginalFile(file)
  }

  const processWithAI = async () => {
    if (!kid?._token) return
    setProcessing(true)
    const styleName = STYLES.find(s => s.id === selectedStyle)?.name || 'Cartoon'
    setMessage(`Generating ${styleName} avatar...`)
    try {
      let data
      if (hasSource && originalFile) {
        const formData = new FormData()
        formData.append('avatar', originalFile)
        formData.append('style', selectedStyle)
        const res = await fetch(`${API}/kids/${kid.id}/avatar/cartoonize`, {
          method: 'POST',
          headers: getAuthHeaders(kid, adminToken),
          body: formData
        })
        data = await res.json()
      } else if (hasSource) {
        const res = await fetch(`${API}/kids/${kid.id}/avatar/regenerate`, {
          method: 'POST',
          headers: { ...getAuthHeaders(kid, adminToken), 'Content-Type': 'application/json' },
          body: JSON.stringify({ style: selectedStyle })
        })
        data = await res.json()
      } else {
        const formData = new FormData()
        formData.append('avatar', originalFile)
        formData.append('style', selectedStyle)
        const res = await fetch(`${API}/kids/${kid.id}/avatar/cartoonize`, {
          method: 'POST',
          headers: getAuthHeaders(kid, adminToken),
          body: formData
        })
        data = await res.json()
      }

      if (data.success) {
        const rawUrl = data.avatar_url + '&t=' + Date.now()
        setRawCartoonized(rawUrl)
        setHasSource(true)
        setMessage('Avatar ready! Pick a background or save it.')
      } else {
        setMessage(data.error || 'AI generation failed')
      }
    } catch (err) {
      setMessage('AI generation failed — try the basic filter instead')
    } finally {
      setProcessing(false)
    }
  }

  const processWithCanvas = () => {
    if (!original) return
    setProcessing(true)
    setMessage('')
    const img = new Image()
    img.onload = () => {
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        canvas.width = 512; canvas.height = 512
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2, sy = (img.height - minDim) / 2
        ctx.clearRect(0, 0, 512, 512)
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 512, 512)
        applyCanvasFilter(canvas, ctx, img)
        if (cartoonized) URL.revokeObjectURL(cartoonized)
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          setCartoonized(url)
          setProcessing(false)
          setMessage('Basic cartoon filter applied!')
        }, 'image/png')
      })
    }
    img.onerror = () => { setProcessing(false); setMessage('Failed to process image') }
    img.src = original
  }

  const handleSaveAI = async () => {
    if (!cartoonized || !kid?._token) return
    setSaving(true)
    try {
      setMessage('Avatar saved!')
      if (onAvatarSaved) onAvatarSaved(cartoonized.split('&')[0])
    } finally { setSaving(false) }
  }

  const handleSaveCanvas = async () => {
    if (!cartoonized || !kid?._token) return
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
    } finally { setSaving(false) }
  }

  const handleRemove = async () => {
    try {
      await fetch(`${API}/kids/${kid.id}/avatar`, {
        method: 'DELETE',
        headers: getAuthHeaders(kid, adminToken)
      })
      if (original) URL.revokeObjectURL(original)
      if (cartoonized) URL.revokeObjectURL(cartoonized)
      if (rawCartoonized) URL.revokeObjectURL(rawCartoonized)
      setOriginal(null); setOriginalFile(null); setCartoonized(null); setRawCartoonized(null); setHasSource(false)
      setMessage('Avatar removed')
      if (onAvatarSaved) onAvatarSaved(null)
    } catch (err) { setMessage('Failed to remove avatar') }
  }

  const handleReset = () => {
    if (original) URL.revokeObjectURL(original)
    if (cartoonized) URL.revokeObjectURL(cartoonized)
    if (rawCartoonized) URL.revokeObjectURL(rawCartoonized)
    setOriginal(null); setOriginalFile(null); setCartoonized(null); setRawCartoonized(null); setHasSource(false); setMessage('')
  }

  const isAI = mode === 'ai'

  return (
    <div className="cartoon-avatar-section">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {kid.avatar_photo && !original && (
        <div className="cartoon-current">
          <img src={kid.avatar_photo} alt={`${kid.name}'s avatar`} className="cartoon-current-img" />
          <button className="btn btn-danger btn-sm" onClick={handleRemove}>Remove Photo</button>
        </div>
      )}

      {mode && (
        <div className="cartoon-mode-badge">
          {isAI ? '🎨 AI Cartoon (Stable Diffusion)' : '✏️ Basic Filter (offline)'}
        </div>
      )}

      <div className="cartoon-upload" onClick={() => !processing && !original && fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={handleFileSelect} style={{ display: 'none' }} />
        {original ? (
          <div className="cartoon-preview-row">
            <div className="cartoon-preview-card">
              <img src={original} alt="Original" className="cartoon-preview-img" />
              <span className="cartoon-preview-label">Photo</span>
            </div>
            <div className="cartoon-preview-arrow">
              {processing ? (isAI ? <span className="cartoon-ai-spinner">🎨</span> : '⏳') : '→'}
            </div>
            <div className="cartoon-preview-card">
              {cartoonized ? (
                <img src={cartoonized} alt="Cartoon" className="cartoon-preview-img"
                  onError={(e) => { e.target.style.display = 'none' }} />
              ) : (
                <div className="cartoon-preview-placeholder">
                  {processing ? (isAI ? '🤖' : '🎨') : '?'}
                </div>
              )}
              <span className="cartoon-preview-label">{isAI ? 'AI Result' : 'Cartoon'}</span>
            </div>
          </div>
        ) : (
          <div className="cartoon-upload-prompt">
            <span className="cartoon-upload-icon">📸</span>
            <span>Take or choose a photo for your avatar</span>
          </div>
        )}
      </div>

      {original && isAI && !processing && (
        <div className="cartoon-options">
          <div className="cartoon-option-group">
            <label className="cartoon-option-label">Style</label>
            <div className="cartoon-option-scroll">
              {STYLES.map(s => (
                <button key={s.id}
                  className={`cartoon-option-card ${selectedStyle === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedStyle(s.id)}>
                  <span className="cartoon-option-icon">{s.icon}</span>
                  <span className="cartoon-option-name">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
          {hasSource && (
            <div className="cartoon-option-group">
              <label className="cartoon-option-label">Background</label>
              <div className="cartoon-option-scroll">
                {BACKGROUNDS.map(b => (
                  <button key={b.id}
                    className={`cartoon-option-card ${selectedBg === b.id ? 'active' : ''}`}
                    onClick={() => setSelectedBg(b.id)}>
                    <span className="cartoon-option-icon">{b.icon}</span>
                    <span className="cartoon-option-name">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {original && !cartoonized && !processing && (
        <div className="cartoon-actions">
          {isAI ? (
            <button className="btn btn-primary" onClick={processWithAI}>🎨 Generate Avatar</button>
          ) : null}
          {!isAI && (
            <button className="btn btn-primary" onClick={processWithCanvas}>✨ Apply Filter</button>
          )}
          <button className="btn btn-secondary" onClick={handleReset}>Cancel</button>
        </div>
      )}

      {cartoonized && (
        <div className="cartoon-actions">
          <button className="btn btn-primary" onClick={isAI ? handleSaveAI : handleSaveCanvas} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Avatar'}
          </button>
          {isAI && (
            <button className="btn btn-accent" onClick={processWithAI} disabled={processing}>
              {processing ? 'Generating...' : '🔄 Regenerate'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleReset}>Try Another</button>
        </div>
      )}

      {processing && (
        <div className="cartoon-processing">
          {isAI ? (
            <>
              <div className="cartoon-ai-progress"><div className="cartoon-ai-progress-bar" /></div>
              <p>AI is drawing your avatar... (usually 5-15 seconds)</p>
            </>
          ) : <p>Applying cartoon filter...</p>}
        </div>
      )}

      {message && (
        <div className={`cartoon-message ${message.includes('fail') || message.includes('Failed') || message.includes('error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  )
}
