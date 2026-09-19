'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Anchor, Sparkles, ArrowRight, ShieldCheck, Clock, Flame } from 'lucide-react'
import WebGLFluidGlow from './WebGLFluidGlow'
import { createClient } from '@/lib/supabase/client'

export interface HeroPosterProps {
  id: string
  title?: string | null
  image_url: string
  media_type?: 'image' | 'video'
  cta_link?: string | null
}

const FEATURED_FLOATING_CARDS = [
  {
    id: 'card-1',
    title: 'Ocean Neymeen (King Fish)',
    category: 'Fresh Fish',
    price: '₹550 / 500g',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
    badge: '100% Ammonia Free',
    delay: 0,
    link: '/category/fish',
  },
  {
    id: 'card-2',
    title: 'Jumbo Tiger Prawns',
    category: 'Prawns & Crabs',
    price: '₹420 / 500g',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    badge: 'Cleaned & Deveined',
    delay: 0.2,
    link: '/category/seafood',
  },
  {
    id: 'card-3',
    title: 'Tender Kerala Goat Mutton',
    category: 'Fresh Meat',
    price: '₹490 / 500g',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    badge: 'Hygienic Precision Cut',
    delay: 0.4,
    link: '/category/mutton',
  },
]

export default function CinematicHero() {
  const [posters, setPosters] = useState<HeroPosterProps[]>([])
  const [activeTab, setActiveTab] = useState<'cinematic' | 'posters'>('cinematic')

  useEffect(() => {
    async function loadPosters() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('homepage_posters')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (data && data.length > 0) {
          setPosters(data)
        }
      } catch (_) {}
    }
    loadPosters()
  }, [])

  return (
    <section className="relative rounded-3xl overflow-hidden bg-[#0F172A] text-white my-4 border border-[#7FBA44]/30 shadow-2xl min-h-[540px] lg:min-h-[600px] flex flex-col justify-between p-6 sm:p-10 transition-all">
      {/* WebGL Fluid Glow Background Shaders */}
      <WebGLFluidGlow />

      {/* Subtle Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, #FFFFFF 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header Badge & Mode Switcher */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7FBA44]/15 border border-[#7FBA44]/40 text-[#7FBA44] text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>YOUR FRESH FRIEND AT THE DOOR • KERALA CATCH</span>
        </motion.div>

        {posters.length > 0 && (
          <div className="inline-flex items-center p-1 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 text-xs font-bold text-slate-300 z-20">
            <button
              onClick={() => setActiveTab('cinematic')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'cinematic' ? 'bg-[#7FBA44] text-white font-extrabold shadow-2xs' : 'hover:text-white'
              }`}
            >
              Cinematic Showcase
            </button>
            <button
              onClick={() => setActiveTab('posters')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'posters' ? 'bg-[#7FBA44] text-white font-extrabold shadow-2xs' : 'hover:text-white'
              }`}
            >
              Live Offers Banner ({posters.length})
            </button>
          </div>
        )}
      </div>

      {activeTab === 'cinematic' ? (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-6">
          {/* Left Hero Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-white uppercase"
            >
              OCEAN FRESH FISH & <span className="text-[#7FBA44]">TENDER MEAT</span> DELIVERED IN ICE.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xs sm:text-sm text-[#E2E8F0]/80 max-w-lg leading-relaxed font-normal"
            >
              Naturally preserved in ice, 100% chemical & ammonia free. Custom cleaned and precision cut right before express delivery to your kitchen.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-200 pt-1"
            >
              <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <ShieldCheck className="w-4 h-4 text-[#7FBA44]" />
                <span>100% Chemical-Free</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Clock className="w-4 h-4 text-[#7FBA44]" />
                <span>Express Doorstep Delivery</span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2"
            >
              <Link
                href="/#products"
                className="py-3.5 px-6 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#7FBA44]/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE TODAY'S CATCH</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="https://wa.me/919656055969?text=Hi%20Bestiet%20Fresh%2C%20I%20want%20to%20order%20fresh%20fish%20and%20meat"
                target="_blank"
                rel="noreferrer"
                className="py-3.5 px-6 bg-slate-900/80 hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                <span>ORDER ON WHATSAPP</span>
              </a>
            </motion.div>
          </div>

          {/* Right Floating Product Depth Showcase */}
          <div className="lg:col-span-6 relative h-[280px] sm:h-[340px] w-full flex items-center justify-center">
            {FEATURED_FLOATING_CARDS.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -10, 0],
                }}
                transition={{
                  opacity: { duration: 0.8, delay: card.delay },
                  scale: { duration: 0.8, delay: card.delay },
                  y: {
                    duration: 4 + idx * 0.8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  },
                }}
                style={{ willChange: 'transform' }}
                className={`absolute w-64 sm:w-72 bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-3.5 shadow-2xl transition-transform hover:scale-[1.03] cursor-pointer z-${
                  10 + idx
                }`}
                onClick={() => (window.location.href = card.link)}
              >
                <div className="relative h-32 sm:h-36 w-full rounded-2xl overflow-hidden mb-3 bg-slate-800">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 bg-[#7FBA44] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                    {card.badge}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#7FBA44] uppercase tracking-wider">
                      {card.category}
                    </span>
                    <h4 className="text-xs font-extrabold text-white truncate">{card.title}</h4>
                  </div>
                  <span className="text-xs font-black text-white shrink-0 bg-slate-800 px-2 py-1 rounded-xl border border-white/10">
                    {card.price}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* Poster Banner Tab */
        <div className="relative z-10 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posters.map((p) => (
              <Link
                key={p.id}
                href={p.cta_link || '/category/fish'}
                className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/15 aspect-[16/9] shadow-xl group hover:border-[#7FBA44] transition-all"
              >
                {p.media_type === 'video' || /\.(mp4|webm)($|\?)/i.test(p.image_url) ? (
                  <video src={p.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={p.image_url} alt={p.title || 'Offer Poster'} className="w-full h-full object-cover" />
                )}
                {p.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-3 text-xs font-bold text-white">
                    {p.title}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Guarantee Banner */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-300 font-semibold gap-2">
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-[#7FBA44]" /> Express Cold-Chain Packaged
        </span>
        <span>•</span>
        <span>Super-Hygenic Cutting Standards</span>
        <span>•</span>
        <span>Trivandrum Doorstep Delivery</span>
      </div>
    </section>
  )
}
