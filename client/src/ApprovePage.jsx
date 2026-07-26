import { useState, useEffect, useRef } from 'react'

const API = '/api'

function FireConfetti() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#fff']
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.left = `${Math.random() * 100}%`
      el.style.background = colors[Math.floor(Math.random() * colors.length)]
      el.style.width = `${Math.random() * 8 + 4}px`
      el.style.height = `${Math.random() * 8 + 4}px`
      el.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`)
      el.style.setProperty('--rotation', `${Math.random() * 720}deg`)
      el.style.animationDuration = `${Math.random() * 1.5 + 1.5}s`
      el.style.animationDelay = `${Math.random() * 0.5}s`
      containerRef.current.appendChild(el)
    }
    const timeout = setTimeout(() => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }, 3500)
    return () => clearTimeout(timeout)
  }, [])

  return <div className="confetti-container" ref={containerRef} />
}

export default function ApprovePage() {
  const [token, setToken] = useState(null)
  const [request, setRequest] = useState(null)
  const [status, setStatus] = useState('loading')
  const [result, setResult] = useState(null)

  useEffect(() => {
    const pathParts = window.location.pathname.split('/')
    const t = pathParts[pathParts.length - 1]
    setToken(t)

    fetch(`${API}/shotgun/approve/${t}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(data => {
        setRequest(data)
        setStatus('ready')
      })
      .catch(() => setStatus('not-found'))
  }, [])

  const handleApprove = async () => {
    setStatus('processing')
    try {
      const res = await fetch(`${API}/shotgun/approve/${token}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResult('approved')
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const handleDeny = async () => {
    setStatus('processing')
    try {
      const res = await fetch(`${API}/shotgun/deny/${token}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResult('denied')
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="approve-page">
        <div className="approve-loading">Loading...</div>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="approve-page">
        <div className="approve-card">
          <div className="approve-icon">😔</div>
          <h2>Request Not Found</h2>
          <p>This shotgun request has expired or was already processed.</p>
          <a href="/?admin=1" className="btn btn-primary approve-dashboard-btn">🎛️ Go to Dashboard</a>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="approve-page">
        <div className="approve-card">
          <div className="approve-icon">⚠️</div>
          <h2>Something Went Wrong</h2>
          <p>Please try again or open the link from a new notification.</p>
          <a href="/?admin=1" className="btn btn-primary approve-dashboard-btn">🎛️ Go to Dashboard</a>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="approve-page">
        {result === 'approved' && <FireConfetti />}
        <div className="approve-card approve-result-card">
          {result === 'approved' ? (
            <>
              <div className="approve-icon approve-icon-success">🎉</div>
              <h2>Shotgun Approved!</h2>
              <div className="approve-result-kid">
                <span className="approve-result-avatar">{request.kid_avatar}</span>
                <span className="approve-result-name" style={{ color: request.kid_color }}>{request.kid_name}</span>
              </div>
              <p>is riding shotgun!</p>
            </>
          ) : (
            <>
              <div className="approve-icon">❌</div>
              <h2>Request Denied</h2>
              <p>The shotgun request has been turned down.</p>
            </>
          )}
          <a href="/?admin=1" className="btn btn-primary approve-dashboard-btn">🎛️ Go to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="approve-page">
      <div className="approve-card">
        <div className="approve-header">
          <span className="approve-requester-avatar">{request.requested_by_avatar}</span>
          <div className="approve-requester-info">
            <span className="approve-requester-name" style={{ color: request.requested_by_color }}>
              {request.requested_by_name}
            </span>
            <span className="approve-picked-text">picked</span>
          </div>
          <span className="approve-target-avatar">{request.kid_avatar}</span>
          <div className="approve-target-info">
            <span className="approve-target-name" style={{ color: request.kid_color }}>
              {request.kid_name}
            </span>
            <span className="approve-for-text">for shotgun!</span>
          </div>
        </div>

        <div className="approve-car-icon">🚗</div>

        <div className="approve-buttons">
          <button
            className="approve-btn approve-btn-approve"
            onClick={handleApprove}
            disabled={status === 'processing'}
          >
            ✅ Approve
          </button>
          <button
            className="approve-btn approve-btn-deny"
            onClick={handleDeny}
            disabled={status === 'processing'}
          >
            ❌ Deny
          </button>
        </div>
      </div>
    </div>
  )
}
