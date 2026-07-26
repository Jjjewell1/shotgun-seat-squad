import { useState, useEffect } from 'react'

const API = '/api'

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
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="approve-page">
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
