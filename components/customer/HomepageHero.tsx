'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { ShieldCheck, Truck, Utensils, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface PosterProps {
  id: string
  image_url: string
  cta_link?: string | null
  sort_order?: number
  active?: boolean
}

const DEFAULT_POSTERS: PosterProps[] = [
  {
    id: 'default-1',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
    cta_link: '/category/fish',
  },
  {
    id: 'default-2',
    image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
    cta_link: '/category/chicken',
  },
  {
    id: 'default-3',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1600&q=80',
    cta_link: '/category/fish',
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
      } catch (_) {}
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
    <div className="space-y-8 mb-10">
      {/* Pure Image Poster Slider (No Text Content) */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-200/80 aspect-[16/6] sm:aspect-[21/7] max-h-[420px] w-full group transition-all"
      >
        <Link href={currentPoster.cta_link || '/category/fish'} className="block w-full h-full relative">
          <img
            key={currentPoster.id}
            src={currentPoster.image_url}
            alt="Bestiet Fresh Poster"
            className="w-full h-full object-cover transition-opacity duration-700"
          />
        </Link>

        {/* Slider Controls: Arrows & Pagination Dots */}
        {posters.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white backdrop-blur-xs border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              aria-label="Previous Poster"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white backdrop-blur-xs border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              aria-label="Next Poster"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#232B1E]/60 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/10">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-[#8B9A6E]'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to poster ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Category Shortcuts Navigation */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#232B1E]/70">
            Explore Categories
          </h2>
          <Link href="/category/fish" className="text-xs font-bold text-[#8B9A6E] hover:underline">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group bg-[#F7F2EB] rounded-2xl p-3 border border-[#EEEEEE] shadow-2xs hover:shadow-md hover:border-[#8B9A6E] transition-all text-center flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#EEEEEE] border border-[#EEEEEE] group-hover:scale-105 transition-transform shrink-0">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-black text-[#232B1E] group-hover:text-[#8B9A6E] transition-colors line-clamp-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Bestiet Fresh Visual Strip */}
      <section className="bg-[#EEEEEE] rounded-3xl p-6 border border-[#EEEEEE]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F2EB] shadow-xs border border-[#8B9A6E]/30 text-[#8B9A6E] flex items-center justify-center mx-auto">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black text-[#232B1E]">FRESHLY SOURCED</h3>
            <p className="text-[11px] text-[#232B1E]/70 font-medium">Directly from harbors & local farms</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F2EB] shadow-xs border border-[#8B9A6E]/30 text-[#8B9A6E] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black text-[#232B1E]">QUALITY CHECKED</h3>
            <p className="text-[11px] text-[#232B1E]/70 font-medium">100% chemical & ammonia free</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F2EB] shadow-xs border border-[#8B9A6E]/30 text-[#8B9A6E] flex items-center justify-center mx-auto">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black text-[#232B1E]">CLEANED YOUR WAY</h3>
            <p className="text-[11px] text-[#232B1E]/70 font-medium">Curry Cut, Fry Cut, Fillet or Whole</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F7F2EB] shadow-xs border border-[#8B9A6E]/30 text-[#8B9A6E] flex items-center justify-center mx-auto">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-black text-[#232B1E]">DOORSTEP DELIVERY</h3>
            <p className="text-[11px] text-[#232B1E]/70 font-medium">Morning & evening express slots</p>
          </div>
        </div>
      </section>
    </div>
  )
}
