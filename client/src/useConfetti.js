import { useCallback, useRef } from 'react'

export default function useConfetti() {
  const containerRef = useRef(null)

  const fire = useCallback((colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6']) => {
    const container = document.createElement('div')
    container.className = 'confetti-container'
    document.body.appendChild(container)

    const particleCount = 40
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'confetti-particle'
      const color = colors[Math.floor(Math.random() * colors.length)]
      const left = 40 + Math.random() * 20
      const drift = (Math.random() - 0.5) * 300
      const delay = Math.random() * 0.3
      const size = 6 + Math.random() * 8
      const rotation = Math.random() * 720

      particle.style.cssText = `
        left: ${left}%;
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        --drift: ${drift}px;
        --rotation: ${rotation}deg;
        animation-delay: ${delay}s;
      `
      container.appendChild(particle)
    }

    setTimeout(() => container.remove(), 3000)
  }, [])

  return fire
}
