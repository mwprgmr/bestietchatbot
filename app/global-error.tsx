'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ROOT_GLOBAL_ERROR]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F2EB] text-[#232B1E] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EEEEEE] shadow-xl text-center space-y-6">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="Bestiet Fresh" className="h-10 w-auto object-contain" />
          </div>

          <div className="w-16 h-16 rounded-full bg-amber-50 text-[#8B9A6E] flex items-center justify-center mx-auto border border-[#8B9A6E]/30">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tight text-[#232B1E] uppercase">
              WE COULDN'T LOAD THIS PAGE RIGHT NOW
            </h1>
            <p className="text-xs text-[#232B1E]/70 leading-relaxed">
              An unexpected system error occurred. Please click Try Again or return to the main storefront.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>

            <a
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#EEEEEE] hover:bg-[#EEEEEE]/80 text-[#232B1E] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
