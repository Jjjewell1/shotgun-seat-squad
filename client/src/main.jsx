import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

fetch('/api/branding/icons').then(r => r.json()).then(icons => {
  if (!icons) return

  const updateLink = (rel, href) => {
    let link = document.querySelector(`link[rel="${rel}"]`)
    if (link) {
      link.href = href
    } else {
      link = document.createElement('link')
      link.rel = rel
      link.href = href
      document.head.appendChild(link)
    }
  }

  updateLink('icon', icons.favicon)
  updateLink('apple-touch-icon', icons.appleTouchIcon)

  if (window.workbox) {
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      fetch('/manifest.webmanifest').then(r => r.json()).then(manifest => {
        if (manifest.icons) {
          manifest.icons.forEach(icon => {
            if (icon.sizes === '192x192') icon.src = icons.icon192
            if (icon.sizes === '512x512' && !icon.purpose?.includes('maskable')) icon.src = icons.icon512
            if (icon.sizes === '512x512' && icon.purpose?.includes('maskable')) icon.src = icons.icon512
          })
        }
        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
        manifestLink.href = URL.createObjectURL(blob)
      })
    }
  }
}).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
