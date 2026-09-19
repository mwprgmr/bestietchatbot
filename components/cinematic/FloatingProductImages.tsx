'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface FloatingItem {
  id: string
  title: string
  subtitle: string
  tag: string
  image: string
  positionClass: string
  delay: number
  floatY: [number, number]
  duration: number
}

const FEATURED_ITEMS: FloatingItem[] = [
  {
    id: 'item-1',
    title: 'Seer Fish (Neymeen)',
    subtitle: 'Ocean Fresh Steak Cut',
    tag: 'PREMIUM CATCH',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80',
    positionClass: 'top-[18%] left-[4%] sm:left-[6%] lg:left-[8%]',
    delay: 0.8,
    floatY: [-12, 12],
    duration: 6,
  },
  {
    id: 'item-2',
    title: 'Jumbo Tiger Prawns',
    subtitle: 'Deveined & Cleaned',
    tag: 'SPECIALTY SEAFOOD',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80',
    positionClass: 'bottom-[22%] left-[3%] sm:left-[5%] lg:left-[10%]',
    delay: 1.1,
    floatY: [10, -10],
    duration: 7,
  },
  {
    id: 'item-3',
    title: 'Fresh Farm Chicken',
    subtitle: 'Tender Skinless Cuts',
    tag: '100% CHEMICAL-FREE',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
    positionClass: 'top-[20%] right-[4%] sm:right-[6%] lg:right-[8%]',
    delay: 1.3,
    floatY: [-15, 10],
    duration: 6.5,
  },
  {
    id: 'item-4',
    title: 'Kerala Tender Mutton',
    subtitle: 'Precision Curry Cut',
    tag: 'FRESH DAILY CATCH',
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80',
    positionClass: 'bottom-[20%] right-[3%] sm:right-[5%] lg:right-[10%]',
    delay: 1.5,
    floatY: [12, -12],
    duration: 7.5,
  },
]

export default function FloatingProductImages() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX / innerWidth - 0.5) * 20
      const y = (e.clientY / innerHeight - 0.5) * 20
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {FEATURED_ITEMS.map((item, index) => {
        const parallaxFactor = (index % 2 === 0 ? 1 : -1) * 0.8
        return (
          <motion.div
            key={item.id}
            className={`absolute ${item.positionClass} hidden md:block cursor-pointer pointer-events-auto`}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: mousePos.x * parallaxFactor,
              y: mousePos.y * parallaxFactor,
            }}
            transition={{
              opacity: { duration: 1, delay: item.delay },
              scale: { duration: 1, delay: item.delay },
              x: { duration: 0.5, ease: 'easeOut' },
              y: { duration: 0.5, ease: 'easeOut' },
            }}
          >
            <motion.div
              animate={{
                y: item.floatY,
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.06, rotate: index % 2 === 0 ? 2 : -2 }}
              className="relative group"
            >
              {/* Outer Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#7FBA44]/40 to-[#2DD4BF]/40 rounded-2xl blur-lg opacity-40 group-hover:opacity-80 transition-opacity duration-500" />

              {/* Card Container */}
              <div className="relative bg-slate-950/80 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-800/80 shadow-2xl flex items-center gap-3 max-w-[220px] sm:max-w-[250px] transition-all group-hover:border-[#7FBA44]/60">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700/50">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="min-w-0 pr-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#7FBA44] block">
                    {item.tag}
                  </span>
                  <h4 className="text-xs font-black text-white truncate group-hover:text-[#2DD4BF] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
