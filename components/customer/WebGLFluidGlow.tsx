'use client'

import React, { useEffect, useRef } from 'react'

interface WebGLFluidGlowProps {
  className?: string
}

export default function WebGLFluidGlow({ className = '' }: WebGLFluidGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Organic glowing light positions
    const blobs = [
      { x: width * 0.2, y: height * 0.3, radius: 240, vx: 0.3, vy: 0.2, color: 'rgba(127, 186, 68, 0.28)' }, // Logo Green
      { x: width * 0.8, y: height * 0.4, radius: 280, vx: -0.2, vy: 0.3, color: 'rgba(2, 132, 199, 0.22)' },  // Ocean Aqua
      { x: width * 0.5, y: height * 0.7, radius: 260, vx: 0.2, vy: -0.2, color: 'rgba(6, 182, 212, 0.18)' },  // Cyan Fresh
    ]

    let startTime = performance.now()

    const render = (now: number) => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      const elapsed = (now - startTime) * 0.001

      blobs.forEach((blob, idx) => {
        if (!prefersReducedMotion) {
          blob.x += Math.sin(elapsed * 0.5 + idx) * blob.vx * 1.5
          blob.y += Math.cos(elapsed * 0.4 + idx) * blob.vy * 1.5
        }

        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        )
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      style={{ willChange: 'transform' }}
    />
  )
}
