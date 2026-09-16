'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
      {/* Pure Image Poster Slider (Boxy design) */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-none overflow-hidden bg-[#232B1E] shadow-lg border border-[#EEEEEE] aspect-[16/6] sm:aspect-[21/7] max-h-[420px] w-full group transition-all"
      >
        <Link href={currentPoster.cta_link || '/category/fish'} className="block w-full h-full relative">
          <img
            key={currentPoster.id}
            src={currentPoster.image_url}
            alt="Bestiet Fresh Poster"
            className="w-full h-full object-cover transition-opacity duration-700"
          />
        </Link>

        {/* Slider Controls */}
        {posters.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-none bg-[#232B1E]/60 hover:bg-[#232B1E]/90 text-white border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              aria-label="Previous Poster"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-none bg-[#232B1E]/60 hover:bg-[#232B1E]/90 text-white border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
              aria-label="Next Poster"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#232B1E]/70 px-3 py-1.5 rounded-none border border-white/10">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-none transition-all cursor-pointer ${
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

      {/* Shop by Category Section (Boxy Design) */}
      <section className="space-y-6 pt-2">
        <h2 className="text-xl sm:text-2xl font-black text-[#232B1E] text-center tracking-tight uppercase">
          Shop by Category
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group text-center flex flex-col items-center cursor-pointer transition-all"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-none overflow-hidden bg-white p-1.5 shadow-md border border-[#EEEEEE] group-hover:shadow-lg group-hover:border-[#8B9A6E] group-hover:scale-105 transition-all">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-none"
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#232B1E] group-hover:text-[#8B9A6E] transition-colors mt-2.5 line-clamp-2 max-w-[110px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
