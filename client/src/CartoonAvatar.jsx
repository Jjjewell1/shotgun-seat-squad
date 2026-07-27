import { useState, useRef, useEffect } from 'react'

const API = '/api'

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

          sumR += pr * weight
          sumG += pg * weight
          sumB += pb * weight
          sumW += weight
        }
      }
      out[idx] = sumR / sumW
      out[idx + 1] = sumG / sumW
      out[idx + 2] = sumB / sumW
      out[idx + 3] = 255
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
      const tl = gray[(y - 1) * w + (x - 1)]
      const t  = gray[(y - 1) * w + x]
      const tr = gray[(y - 1) * w + (x + 1)]
      const l  = gray[y * w + (x - 1)]
      const r  = gray[y * w + (x + 1)]
      const bl = gray[(y + 1) * w + (x - 1)]
      const b  = gray[(y + 1) * w + x]
      const br = gray[(y + 1) * w + (x + 1)]

      const gx = -tl - 2 * l - bl + tr + 2 * r + br
      const gy = -tl - 2 * t - tr + bl + 2 * b + br
      const mag = Math.sqrt(gx * gx + gy * gy)
      sobel[y * w + x] = mag
      if (mag > maxMag) maxMag = mag
    }
  }

  if (maxMag > 0) {
    for (let i = 0; i < sobel.length; i++) sobel[i] /= maxMag
  }

  return sobel
}

function applyCartoonFilter(canvas, ctx, img) {
  const w = canvas.width
  const h = canvas.height

  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const src = new Uint8ClampedArray(imageData.data)

  const smoothed = bilateralFilter(src, w, h, 4, 10, 25)

  const quantized = new Uint8ClampedArray(smoothed)
  quantizeColors(quantized, 18)

  for (let i = 0; i < quantized.length; i += 4) {
    const r = quantized[i], g = quantized[i + 1], b = quantized[i + 2]
    const avg = (r + g + b) / 3
    const factor = avg > 140 ? 1.18 : avg > 80 ? 1.1 : 1.0
    quantized[i] = Math.min(255, r * factor)
    quantized[i + 1] = Math.min(255, g * factor)
    quantized[i + 2] = Math.min(255, b * factor)
  }

  const edges = detectEdges(w, h, smoothed)

  const result = new Uint8ClampedArray(quantized.length)
  const edgeThreshold = 0.18
  const edgeThresholdSoft = 0.08

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = (y * w + x) * 4
      const eIdx = y * w + x
      const edgeVal = edges[eIdx]

      if (edgeVal > edgeThreshold) {
        result[pIdx] = 20
        result[pIdx + 1] = 18
        result[pIdx + 2] = 25
        result[pIdx + 3] = 255
      } else if (edgeVal > edgeThresholdSoft) {
        const t = (edgeVal - edgeThresholdSoft) / (edgeThreshold - edgeThresholdSoft)
        const blend = t * 0.7
        result[pIdx] = quantized[pIdx] * (1 - blend) + 20 * blend
        result[pIdx + 1] = quantized[pIdx + 1] * (1 - blend) + 18 * blend
        result[pIdx + 2] = quantized[pIdx + 2] * (1 - blend) + 25 * blend
        result[pIdx + 3] = 255
      } else {
        result[pIdx] = quantized[pIdx]
        result[pIdx + 1] = quantized[pIdx + 1]
        result[pIdx + 2] = quantized[pIdx + 2]
        result[pIdx + 3] = 255
      }
    }
  }

  const out = new ImageData(result, w, h)
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

  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original)
      if (cartoonized) URL.revokeObjectURL(cartoonized)
    }
  }, [original, cartoonized])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    if (original) URL.revokeObjectURL(original)
    if (cartoonized) URL.revokeObjectURL(cartoonized)

    setCartoonized(null)
    setMessage('')

    const url = URL.createObjectURL(file)
    setOriginal(url)
    processImage(url)
  }

  const processImage = (src) => {
    setProcessing(true)
    setMessage('')

    const img = new Image()
    img.onload = () => {
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        const size = 512
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)

        applyCartoonFilter(canvas, ctx, img)

        if (cartoonized) URL.revokeObjectURL(cartoonized)
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          setCartoonized(url)
          setProcessing(false)
          setMessage('Cartoon avatar ready!')
        }, 'image/png')
      })
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
      if (original) URL.revokeObjectURL(original)
      if (cartoonized) URL.revokeObjectURL(cartoonized)
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

      <div className="cartoon-upload" onClick={() => !processing && fileInputRef.current?.click()}>
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
            <div className="cartoon-preview-arrow">
              {processing ? '⏳' : '→'}
            </div>
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
          <button className="btn btn-secondary" onClick={() => {
            if (original) URL.revokeObjectURL(original)
            if (cartoonized) URL.revokeObjectURL(cartoonized)
            setOriginal(null)
            setCartoonized(null)
            setMessage('')
          }}>
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
