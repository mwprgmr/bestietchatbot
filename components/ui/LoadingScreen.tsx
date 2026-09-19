'use client'

import React from 'react'

interface LoadingScreenProps {
  message?: string
  subtext?: string
  fullScreen?: boolean
}

export function LoadingScreen({
  message = 'PREPARING FRESH CATCH',
  subtext = 'Connecting to nearest servicing branch...',
  fullScreen = true,
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1412] text-white p-6 overflow-hidden select-none'
    : 'w-full py-16 flex flex-col items-center justify-center bg-[#0B1412] rounded-3xl text-white p-6 border border-[#39B54A]/20 shadow-2xl overflow-hidden select-none'

  return (
    <div className={containerClasses}>
      {/* Ambient Background Radial Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#39B54A]/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#39B54A]/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Main Center Card */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm w-full">
        
        {/* Animated Glowing Logo / Spinner Icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer Glowing Pulsing Ring */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-[#39B54A]/30 animate-ping opacity-75" />
          
          {/* Outer Rotating Gradient Ring */}
          <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-[#39B54A] via-emerald-400 to-teal-500 animate-spin shadow-[0_0_30px_rgba(57,181,74,0.4)]">
            <div className="w-full h-full bg-[#0B1412] rounded-full flex items-center justify-center p-3">
              <img
                src="/logo.png"
                alt="Bestiet Fresh Loading"
                className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(57,181,74,0.8)] animate-pulse"
                onError={(e) => {
                  // Fallback icon if logo image fails
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Message & Micro-Typography */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#39B54A]/15 border border-[#39B54A]/30 text-[#39B54A] text-[10px] font-black uppercase tracking-widest shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39B54A] animate-ping" />
            <span>Bestiet Fresh</span>
          </div>

          <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-100 uppercase">
            {message}
          </h3>

          <p className="text-xs font-medium text-slate-400 max-w-xs leading-relaxed">
            {subtext}
          </p>
        </div>

        {/* Shimmer Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div className="h-full bg-gradient-to-r from-[#39B54A] via-emerald-300 to-[#39B54A] rounded-full animate-shimmer bg-[length:200%_100%]" />
        </div>

        {/* Delivery Guarantee Tagline */}
        <div className="pt-4 flex items-center gap-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          <span>Cold-Chain Preserved</span>
          <span>•</span>
          <span>15-30 Min Express</span>
        </div>

      </div>
    </div>
  )
}

export default LoadingScreen
