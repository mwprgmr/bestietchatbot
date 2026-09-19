'use client'

import React from 'react'

export interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({
  fullScreen = true,
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-slate-900 px-4 select-none overflow-hidden'
    : 'relative w-full min-h-[300px] flex flex-col items-center justify-center bg-white text-slate-900 rounded-3xl p-8 overflow-hidden select-none'

  return (
    <div className={containerClasses} aria-label="Loading Bestiet Fresh">
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Simple Green Spinner */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-[#7FBA44] animate-spin transform-gpu" />
        </div>
      </div>
    </div>
  )
}
