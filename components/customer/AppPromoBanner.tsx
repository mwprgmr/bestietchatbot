'use client'

import React from 'react'
import { Sparkles, QrCode, Smartphone, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function AppPromoBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0F172A] border border-slate-800 shadow-2xl text-white my-8">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#39B54A]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#FF5200]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 md:p-12 lg:p-14 gap-8 md:gap-12">
        {/* Left Content Column */}
        <div className="flex-1 space-y-4 sm:space-y-6 text-center md:text-left">
          {/* Logo Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FF5200] text-white px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide shadow-lg shadow-[#FF5200]/25">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="uppercase font-mono tracking-wider">Bestiet Fresh</span>
          </div>

          {/* Main Headline */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-none">
            Get the Bestiet Fresh <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              App & Web now!
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-slate-300 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-lg mx-auto md:mx-0">
            For best offers, daily ocean-fresh catch alerts, and instant 45-minute doorstep order tracking curated specially for you.
          </p>

          {/* Value Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 backdrop-blur border border-slate-700/60 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>45 Min Express Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 backdrop-blur border border-slate-700/60 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Chemical-Free Catch</span>
            </div>
          </div>
        </div>

        {/* Right Phone Mockup & QR Section */}
        <div className="relative flex items-center justify-center pt-4 md:pt-0">
          {/* Floating Food / Feature Badges around Phone */}
          {/* Top-Left Floating Badge */}
          <div className="absolute -top-3 -left-6 sm:-left-10 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white px-3.5 py-2 rounded-xl shadow-xl transform -rotate-6 hover:rotate-0 transition-transform">
            <span className="text-lg">🐟</span>
            <div className="text-[11px] leading-tight">
              <div className="font-extrabold text-emerald-400">Fresh Seafood</div>
              <div className="text-slate-400 text-[9px]">Daily Morning Catch</div>
            </div>
          </div>

          {/* Bottom-Left Floating Badge */}
          <div className="absolute -bottom-4 -left-8 sm:-left-12 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white px-3.5 py-2 rounded-xl shadow-xl transform rotate-3 hover:rotate-0 transition-transform">
            <span className="text-lg">⚡</span>
            <div className="text-[11px] leading-tight">
              <div className="font-extrabold text-amber-400">Instant Track</div>
              <div className="text-slate-400 text-[9px]">Live GPS Status</div>
            </div>
          </div>

          {/* Bottom-Right Floating Basket Badge */}
          <div className="absolute -bottom-2 -right-6 sm:-right-8 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white px-3 py-2 rounded-xl shadow-xl transform rotate-6 hover:rotate-0 transition-transform">
            <span className="text-lg">🛍️</span>
            <div className="text-[11px] leading-tight">
              <div className="font-extrabold text-cyan-400">Exclusive Deals</div>
              <div className="text-slate-400 text-[9px]">Best Prices</div>
            </div>
          </div>

          {/* Smartphone Container Mockup */}
          <div className="relative w-56 sm:w-64 bg-slate-950 border-[6px] sm:border-[8px] border-slate-800 rounded-[36px] sm:rounded-[44px] shadow-2xl p-4 sm:p-5 text-center flex flex-col items-center">
            {/* Dynamic Island / Notch */}
            <div className="w-16 h-3.5 bg-black rounded-full mb-4 mx-auto flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>

            {/* Inner Phone Screen */}
            <div className="w-full bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner border border-slate-100">
              {/* QR Code Container */}
              <div className="relative p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                {/* SVG QR Code Pattern */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-32 h-32 sm:w-36 sm:h-36 text-slate-900"
                  fill="currentColor"
                >
                  {/* Position detection patterns (corners) */}
                  {/* Top-Left Finder */}
                  <path d="M0 0h30v30H0zM5 5v20h20V5zM10 10h10v10H10z" />
                  {/* Top-Right Finder */}
                  <path d="M70 0h30v30H70zM75 5v20h20V5zM80 10h10v10H80z" />
                  {/* Bottom-Left Finder */}
                  <path d="M0 70h30v30H0zM5 75v20h20V75zM10 80h10v10H10z" />

                  {/* QR Data Matrix simulation dots */}
                  <rect x="35" y="5" width="5" height="5" />
                  <rect x="45" y="5" width="10" height="5" />
                  <rect x="60" y="5" width="5" height="5" />
                  <rect x="35" y="15" width="10" height="5" />
                  <rect x="50" y="15" width="5" height="5" />
                  <rect x="60" y="15" width="5" height="5" />
                  <rect x="35" y="25" width="5" height="5" />
                  <rect x="45" y="25" width="5" height="5" />
                  <rect x="55" y="25" width="10" height="5" />

                  <rect x="5" y="35" width="5" height="10" />
                  <rect x="15" y="35" width="10" height="5" />
                  <rect x="25" y="45" width="5" height="5" />
                  <rect x="5" y="50" width="10" height="5" />
                  <rect x="20" y="50" width="5" height="10" />

                  {/* Center Brand Overlay Pill */}
                  <rect x="40" y="40" width="20" height="20" rx="4" fill="#39B54A" />
                  <path d="M45 50l3 3 7-7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                  <rect x="65" y="35" width="10" height="5" />
                  <rect x="80" y="35" width="15" height="5" />
                  <rect x="70" y="45" width="5" height="10" />
                  <rect x="85" y="45" width="10" height="5" />
                  <rect x="65" y="55" width="15" height="5" />
                  <rect x="85" y="55" width="5" height="10" />

                  <rect x="35" y="70" width="10" height="5" />
                  <rect x="50" y="70" width="15" height="5" />
                  <rect x="70" y="70" width="5" height="10" />
                  <rect x="80" y="70" width="15" height="5" />
                  <rect x="35" y="80" width="5" height="10" />
                  <rect x="45" y="85" width="15" height="5" />
                  <rect x="65" y="80" width="10" height="5" />
                  <rect x="80" y="85" width="15" height="5" />
                  <rect x="35" y="95" width="25" height="5" />
                  <rect x="65" y="90" width="5" height="10" />
                  <rect x="75" y="95" width="20" height="5" />
                </svg>
              </div>

              {/* Text underneath QR code inside phone screen */}
              <div className="mt-3 font-extrabold text-xs sm:text-sm text-[#FF5200] tracking-tight">
                Scan to download / order
              </div>
            </div>

            {/* Bottom Home Indicator */}
            <div className="w-20 h-1 bg-slate-700 rounded-full mt-3 mx-auto" />
          </div>
        </div>
      </div>
    </section>
  )
}
