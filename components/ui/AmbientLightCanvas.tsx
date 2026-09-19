'use client'

import React, { useEffect, useRef } from 'react'

interface AmbientLightCanvasProps {
  className?: string
  opacity?: number
  intensity?: number
}

export default function AmbientLightCanvas({
  className = '',
  opacity = 0.85,
  intensity = 1.0,
}: AmbientLightCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let animationFrameId: number
    let width = 0
    let height = 0

    // Light blobs definitions (Fresh Green #7FBA44, Fresh Mint #4ADE80, Ocean Teal #2DD4BF, Soft Sage #A3E635)
    const blobs = [
      { x: 0.2, y: 0.25, r: 0.4, vx: 0.0003, vy: 0.00025, color: 'rgba(127, 186, 68, 0.28)' },   // Logo Green #7FBA44
      { x: 0.8, y: 0.35, r: 0.45, vx: -0.0002, vy: 0.0003, color: 'rgba(45, 212, 191, 0.22)' },   // Ocean Teal
      { x: 0.5, y: 0.7, r: 0.5, vx: 0.00025, vy: -0.0002, color: 'rgba(163, 230, 53, 0.20)' },   // Fresh Lime
      { x: 0.15, y: 0.8, r: 0.38, vx: -0.00015, vy: -0.00025, color: 'rgba(127, 186, 68, 0.22)' }, // Logo Green Accent
    ]

    const handleResize = () => {
      if (!canvas) return
      // Scale resolution for mobile to save battery while preserving visual quality
      const isMobile = window.innerWidth < 768
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })

    let lastScrollY = window.scrollY
    let scrollVelocity = 0

    const handleScroll = () => {
      const currentScroll = window.scrollY
      scrollVelocity = (currentScroll - lastScrollY) * 0.0005
      lastScrollY = currentScroll
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    let time = 0

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      time += prefersReducedMotion ? 0 : 0.008

      // Decay scroll velocity smoothly
      scrollVelocity *= 0.92

      blobs.forEach((b, i) => {
        if (!prefersReducedMotion) {
          b.x += b.vx + Math.sin(time + i) * 0.0002
          b.y += b.vy + Math.cos(time + i * 0.7) * 0.0002 + scrollVelocity

          // Wrap coordinates gracefully
          if (b.x < -0.2) b.x = 1.2
          if (b.x > 1.2) b.x = -0.2
          if (b.y < -0.2) b.y = 1.2
          if (b.y > 1.2) b.y = -0.2
        }

        const cx = b.x * width
        const cy = b.y * height
        const radius = Math.max(width, height) * b.r * intensity

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        gradient.addColorStop(0, b.color)
        gradient.addColorStop(0.6, b.color.replace(/[\d\.]+\)$/, '0.08)'))
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full mix-blend-multiply transition-opacity duration-1000 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  )
}
