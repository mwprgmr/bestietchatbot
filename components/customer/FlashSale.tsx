'use client'

import React, { useState, useEffect } from 'react'
import ProductCard, { ProductProps } from './ProductCard'
import { Flame, Clock } from 'lucide-react'

export default function FlashSale({ products }: { products: ProductProps[] }) {
  // Set a 4-hour countdown timer for flash deals
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 45, seconds: 22 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!products || products.length === 0) return null

  const formatNum = (num: number) => String(num).padStart(2, '0')

  return (
    <section className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl my-8 overflow-hidden relative">
      {/* Decorative Blob */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Flash Sale Header & Timer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-700/60 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center justify-center animate-bounce">
            <Flame className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              Limited Time Deals
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              TODAY'S FLASH SALE
            </h2>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-2 bg-emerald-950/80 px-4 py-2 rounded-2xl border border-emerald-700/80 shadow-inner">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-200 uppercase mr-1">Ends In:</span>
          <div className="flex items-center gap-1 font-mono text-sm font-black text-amber-400">
            <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-800">
              {formatNum(timeLeft.hours)}
            </span>
            <span>:</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-800">
              {formatNum(timeLeft.minutes)}
            </span>
            <span>:</span>
            <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-800">
              {formatNum(timeLeft.seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
