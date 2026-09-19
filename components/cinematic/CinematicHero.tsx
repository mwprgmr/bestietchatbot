'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, ShoppingBag, Sparkles, ShieldCheck, Truck, Droplets } from 'lucide-react'
import FluidGlowBackground from './FluidGlowBackground'
import AnimatedWaveLines from './AnimatedWaveLines'
import FloatingProductImages from './FloatingProductImages'

export default function CinematicHero() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative w-full min-h-[92vh] lg:min-h-screen bg-[#070A12] text-white overflow-hidden flex flex-col justify-between select-none">
      {/* 1. Dynamic WebGL Fluid Glowing Light Background */}
      <FluidGlowBackground className="z-0" />

      {/* 2. Thin Wave-Like Energy Trails */}
      <AnimatedWaveLines />

      {/* 3. Floating Seafood & Meat 3D Cards */}
      <FloatingProductImages />

      {/* Atmospheric Ambient Lighting Gradients */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070A12] via-[#070A12]/60 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#070A12] via-[#070A12]/80 to-transparent pointer-events-none z-10" />

      {/* Hero Header Pill (Top Brand Tag) */}
      <div className="relative z-30 pt-8 sm:pt-12 px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-[#7FBA44]/30 backdrop-blur-md shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-[#7FBA44] animate-ping" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#7FBA44]">
            BESTIET FRESH • 100% CHEMICAL-FREE
          </span>
        </motion.div>
      </div>

      {/* Main Hero Center Content & Staggered Reveal Sequence */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 py-12 text-center flex flex-col items-center justify-center space-y-6 sm:space-y-8 my-auto">
        
        {/* Main Cinematic Heading: FRESHNESS AT YOUR DOORSTEP */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-1 sm:space-y-2"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-[0.95] text-white">
            FRESHNESS <br className="hidden xs:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#2DD4BF]">
              AT YOUR
            </span> <br className="hidden xs:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7FBA44] via-[#2DD4BF] to-emerald-400">
              DOORSTEP
            </span>
          </h1>
        </motion.div>

        {/* Supporting Tagline: Your Fresh Friend At The Door */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-base sm:text-xl lg:text-2xl font-bold text-slate-300 max-w-2xl leading-relaxed"
        >
          Your Fresh Friend At The Door
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-xs sm:text-sm text-slate-400 max-w-lg font-medium"
        >
          Ocean-fresh fish, backwater seafood, tender chicken & goat meat custom cleaned and delivered in cold-chain ice packing.
        </motion.p>

        {/* CTAs: ORDER FRESH & EXPLORE PRODUCTS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="pt-4 flex flex-col xs:flex-row items-center justify-center gap-4 w-full xs:w-auto"
        >
          {/* Primary CTA: ORDER FRESH */}
          <button
            onClick={() => scrollToSection('products')}
            className="w-full xs:w-auto px-8 py-4 bg-[#7FBA44] hover:bg-[#71A83A] text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-[#7FBA44]/30 hover:shadow-[#7FBA44]/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 group cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 fill-slate-950" />
            <span>ORDER FRESH</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary CTA: EXPLORE PRODUCTS */}
          <button
            onClick={() => scrollToSection('showcase')}
            className="w-full xs:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-white font-black text-sm sm:text-base rounded-2xl border border-slate-700/80 hover:border-[#2DD4BF]/50 backdrop-blur-md shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5 text-[#2DD4BF]" />
            <span>EXPLORE PRODUCTS</span>
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-400 font-semibold"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7FBA44]" />
            <span>100% Ammonia-Free</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-[#2DD4BF]" />
            <span>Ice Cold-Chain Packed</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#7FBA44]" />
            <span>Doorstep Delivery</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Scroll Down Indicator */}
      <div className="relative z-30 pb-6 px-4 flex justify-center">
        <button
          onClick={() => scrollToSection('showcase')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7FBA44] group-hover:text-[#2DD4BF] transition-colors">
            SCROLL TO EXPLORE
          </span>
          <div className="w-5 h-8 rounded-full border-2 border-slate-700 flex justify-center p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-[#7FBA44]"
            />
          </div>
        </button>
      </div>
    </section>
  )
}
