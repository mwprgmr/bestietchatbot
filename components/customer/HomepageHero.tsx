'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { ArrowRight, Sparkles, ShieldCheck, Truck, Utensils, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface PosterProps {
  id: string
  title: string
  subtitle?: string | null
  badge_text?: string | null
  image_url: string
  cta_text?: string | null
  cta_link?: string | null
  secondary_cta_text?: string | null
  secondary_cta_link?: string | null
}

const DEFAULT_POSTERS: PosterProps[] = [
  {
    id: 'default-1',
    title: 'FRESH FROM OUR DOOR TO YOUR TABLE.',
    subtitle: 'Fresh ocean fish, backwater seafood, tender farm chicken, and Kerala goat meat — custom cleaned, cut, and delivered fresh to your door.',
    badge_text: 'CHEMICAL-FREE DAILY FRESH CATCH',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'SHOP FRESH NOW',
    cta_link: '/category/fish',
    secondary_cta_text: "TODAY'S DEALS",
    secondary_cta_link: '/offers',
  },
  {
    id: 'default-2',
    title: 'ANTIBIOTIC-FREE TENDER FARM CHICKEN',
    subtitle: 'Hygienically cut & 100% clean chicken parts. Whole, Curry Cut, Boneless Breast & Drumsticks delivered cold-packed.',
    badge_text: '100% SAFE & HYGIENIC',
    image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'ORDER CHICKEN',
    cta_link: '/category/chicken',
    secondary_cta_text: 'VIEW ALL CUTS',
    secondary_cta_link: '/category/chicken',
  },
  {
    id: 'default-3',
    title: 'PREMIUM SEER FISH & TIGER PRAWNS',
    subtitle: 'Daily morning harbor landings. Chemical-free Neymeen, Karimeen, Mathi, and Fresh Prawns cleaned to your preference.',
    badge_text: 'DAILY MORNING LANDINGS',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'EXPLORE SEAFOOD',
    cta_link: '/category/fish',
    secondary_cta_text: 'FLASH OFFERS',
    secondary_cta_link: '/offers',
  },
]

export default function HomepageHero() {
  const [posters, setPosters] = useState<PosterProps[]>(DEFAULT_POSTERS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    async function loadPosters() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('homepage_posters')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0) {
          setPosters(data)
        }
      } catch (_) {
        // Fallback to DEFAULT_POSTERS
      }
    }
    loadPosters()
  }, [])

  // Auto-play slider rotation
  useEffect(() => {
    if (isPaused || posters.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posters.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isPaused, posters.length])

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % posters.length)
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length)

  const currentPoster = posters[currentIndex] || DEFAULT_POSTERS[0]

  return (
    <div className="space-y-10 mb-10">
      {/* Dynamic Poster Slider Carousel */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-[#101814] to-emerald-950 text-white p-6 sm:p-12 shadow-xl border border-slate-800 min-h-[360px] flex flex-col justify-between group transition-all"
      >
        {/* Decorative Poster Background Image */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay transition-opacity duration-700">
          <img
            key={currentPoster.id}
            src={currentPoster.image_url}
            alt={currentPoster.title}
            className="w-full h-full object-cover animate-fade-in"
          />
        </div>

        {/* Poster Content */}
        <div className="relative z-10 max-w-2xl space-y-4 my-auto">
          {currentPoster.badge_text && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentPoster.badge_text}</span>
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
            {currentPoster.title}
          </h1>

          {currentPoster.subtitle && (
            <p className="text-sm sm:text-base text-slate-300 font-medium max-w-lg leading-relaxed">
              {currentPoster.subtitle}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {currentPoster.cta_text && (
              <Link
                href={currentPoster.cta_link || '/category/fish'}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 group/btn"
              >
                <span>{currentPoster.cta_text}</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            )}

            {currentPoster.secondary_cta_text && (
              <Link
                href={currentPoster.secondary_cta_link || '/offers'}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-extrabold rounded-xl text-xs sm:text-sm backdrop-blur-xs border border-white/20 transition-all"
              >
                {currentPoster.secondary_cta_text}
              </Link>
            )}
          </div>
        </div>

        {/* Slider Controls: Arrows & Pagination Dots */}
        {posters.length > 1 && (
          <div className="relative z-20 pt-4 flex items-center justify-between">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-7 bg-emerald-400'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Left & Right Arrow Buttons */}
            <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={prevSlide}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-xs transition-all cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-xs transition-all cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Shortcuts Navigation */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Explore Categories
          </h2>
          <Link href="/category/fish" className="text-xs font-bold text-emerald-700 hover:underline">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all text-center flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 group-hover:scale-105 transition-transform shrink-0">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-extrabold text-[#101814] group-hover:text-emerald-700 transition-colors line-clamp-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Bestiet Fresh Visual Strip */}
      <section className="bg-[#F7F8F5] rounded-3xl p-6 border border-slate-200/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">FRESHLY SOURCED</h3>
            <p className="text-[11px] text-slate-500">Directly from harbors & local farms</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">QUALITY CHECKED</h3>
            <p className="text-[11px] text-slate-500">100% chemical & ammonia free</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">CLEANED YOUR WAY</h3>
            <p className="text-[11px] text-slate-500">Curry Cut, Fry Cut, Fillet or Whole</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">DOORSTEP DELIVERY</h3>
            <p className="text-[11px] text-slate-500">Morning & evening express slots</p>
          </div>
        </div>
      </section>
    </div>
  )
}

