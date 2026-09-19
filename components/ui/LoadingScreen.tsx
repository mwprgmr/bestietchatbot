'use client'

import React from 'react'

export interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({
  message = 'Sourcing fresh catch & local inventory...',
  fullScreen = true,
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1513] text-white px-4 select-none overflow-hidden touch-none'
    : 'relative w-full min-h-[320px] flex flex-col items-center justify-center bg-[#0B1513] text-white rounded-3xl p-8 overflow-hidden select-none'

  return (
    <div className={containerClasses} aria-label="Loading Bestiet Fresh">
      {/* Ambient background glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#39B54A]/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm w-full p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.4)] text-center transform-gpu">
        
        {/* Animated Brand Logo Icon with Pulsing Halo */}
        <div className="relative flex items-center justify-center">
          {/* Outer Ring Glow */}
          <div className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-[#39B54A]/30 to-emerald-400/20 animate-ping opacity-75" />
          
          {/* Spinner Dual-Ring */}
          <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-[#39B54A] border-r-emerald-400 animate-spin transition-all transform-gpu" />
          
          {/* Center Brand Icon / Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/logo-brand.png"
              alt="Bestiet Fresh"
              className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(57,181,74,0.6)] animate-pulse"
              onError={(e) => {
                // Fallback to stylized SVG fish if logo missing
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
          </div>
        </div>

        {/* Brand Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm font-black tracking-widest text-white uppercase font-sans">
              BESTIET
            </span>
            <span className="text-sm font-black tracking-widest text-[#39B54A] uppercase font-sans">
              FRESH
            </span>
          </div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-[#39B54A] to-transparent mx-auto rounded-full opacity-80" />
        </div>

        {/* Message & Animated Progress Bar */}
        <div className="w-full space-y-3 pt-1">
          <p className="text-xs font-semibold text-slate-300 tracking-wide leading-relaxed line-clamp-2">
            {message}
          </p>

          {/* Indeterminate Shimmer Line */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 bg-gradient-to-r from-[#39B54A] via-emerald-300 to-[#39B54A] w-1/2 rounded-full animate-shimmer-fast transform-gpu" />
          </div>
        </div>

        {/* Quality Tagline Badge */}
        <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-emerald-400/90 tracking-wider uppercase bg-emerald-950/50 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39B54A] animate-ping" />
          <span>Daily Cold-Chain Fresh</span>
        </div>

      </div>
    </div>
  )
}
