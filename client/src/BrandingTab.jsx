import { useState, useRef, useCallback, useEffect } from 'react'
import { removeBackground } from '@imgly/background-removal'

const API = '/api'

export default function BrandingTab({ adminToken }) {
  const [originalFile, setOriginalFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [processedBlob, setProcessedBlob] = useState(null)
  const [processedUrl, setProcessedUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [branding, setBranding] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)

  const authHeaders = { 'Authorization': `Bearer ${adminToken}` }

  const loadBranding = useCallback(async () => {
    try {
      const res = await fetch(`${API}/branding`)
      const data = await res.json()
      setBranding(data)
    } catch (err) {
      console.error('Failed to load branding:', err)
    }
  }, [])

  useEffect(() => { loadBranding() }, [loadBranding])

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [originalUrl, processedUrl])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file')
      return
    }

    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (processedUrl) URL.revokeObjectURL(processedUrl)

    const url = URL.createObjectURL(file)
    setOriginalFile(file)
    setOriginalUrl(url)
    setProcessedBlob(null)
    setProcessedUrl(null)
    setMessage('')
  }

  const handleRemoveBackground = async () => {
    if (!originalFile) return

    setProcessing(true)
    setProgress('Loading AI model...')
    setMessage('')

    try {
      setProgress('Removing background...')

      const result = await removeBackground(originalFile, {
        progress: (key, current, total) => {
          if (key === 'compute:inference') {
            const pct = Math.round((current / total) * 100)
            setProgress(`Processing: ${pct}%`)
          }
        }
      })

      if (processedUrl) URL.revokeObjectURL(processedUrl)
      const url = URL.createObjectURL(result)
      setProcessedBlob(result)
      setProcessedUrl(url)
      setProgress('')
      setMessage('Background removed! Click "Save Logo" to apply.')
    } catch (err) {
      console.error('Background removal failed:', err)
      setMessage('Background removal failed. Try a simpler image.')
      setProgress('')
    } finally {
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!originalFile && !processedBlob) return

    setSaving(true)
    setMessage('')

    try {
      const blobToUpload = processedBlob || originalFile
      const file = new File([blobToUpload], 'logo.png', { type: 'image/png' })

      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`${API}/branding/logo`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      })

      const data = await res.json()

      if (data.success) {
        setBranding(data.branding)
        setMessage('Logo saved! Refresh the page to see changes.')
        setOriginalFile(null)
        setOriginalUrl(null)
        setProcessedBlob(null)
        setProcessedUrl(null)
      } else {
        setMessage(data.error || 'Failed to save logo')
      }
    } catch (err) {
      console.error('Save failed:', err)
      setMessage('Failed to save logo')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove custom logo and restore default?')) return

    try {
      const res = await fetch(`${API}/branding/logo`, {
        method: 'DELETE',
        headers: authHeaders
      })
      const data = await res.json()
      if (data.success) {
        setBranding(null)
        setMessage('Logo removed. Refresh to see default.')
      }
    } catch (err) {
      setMessage('Failed to remove logo')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)

      const url = URL.createObjectURL(file)
      setOriginalFile(file)
      setOriginalUrl(url)
      setProcessedBlob(null)
      setProcessedUrl(null)
      setMessage('')
    }
  }

  return (
    <div className="branding-section">
      <div className="section-title">App Branding</div>
      <p className="branding-description">
        Upload a logo to customize the app icon, favicon, and branding.
        Background removal happens in your browser — nothing is sent to external servers.
      </p>

      {branding?.hasLogo && (
        <div className="branding-current">
          <div className="branding-current-label">Current Logo</div>
          <div className="branding-current-preview">
            <img src={branding.files?.['logo.png']} alt="Current logo" className="branding-preview-img" />
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleRemove}>Remove Logo</button>
        </div>
      )}

      <div
        className="branding-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {originalUrl ? (
          <img src={originalUrl} alt="Original" className="branding-dropzone-img" />
        ) : (
          <>
            <div className="branding-dropzone-icon">📁</div>
            <div className="branding-dropzone-text">Click or drag an image here</div>
            <div className="branding-dropzone-hint">PNG, JPG, or SVG • Max 10MB</div>
          </>
        )}
      </div>

      {originalUrl && (
        <div className="branding-actions">
          <button
            className="btn btn-secondary"
            onClick={handleRemoveBackground}
            disabled={processing}
          >
            {processing ? progress || 'Processing...' : '✨ Remove Background'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Logo'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setOriginalFile(null)
              setOriginalUrl(null)
              setProcessedBlob(null)
              setProcessedUrl(null)
              setMessage('')
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {processedUrl && (
        <div className="branding-result">
          <div className="branding-result-label">Processed Preview</div>
          <div className="branding-preview-grid">
            <div className="branding-preview-card">
              <img src={originalUrl} alt="Original" className="branding-preview-img" />
              <div className="branding-preview-label">Original</div>
            </div>
            <div className="branding-preview-card">
              <img src={processedUrl} alt="Processed" className="branding-preview-img" />
              <div className="branding-preview-label">Background Removed</div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`branding-message ${message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="branding-info">
        <h4>What gets updated:</h4>
        <ul>
          <li>Browser tab icon (favicon)</li>
          <li>Home screen icon (iOS/Android)</li>
          <li>App logo in header</li>
        </ul>
      </div>
    </div>
  )
}
