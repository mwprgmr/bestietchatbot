'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowDown, ShieldCheck, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import AmbientLightCanvas from '@/components/ui/AmbientLightCanvas'

export interface PosterProps {
  id: string
  title?: string | null
  image_url: string
  media_type?: 'image' | 'video'
  cta_link?: string | null
  sort_order?: number
  active?: boolean
}

const DEFAULT_POSTERS: PosterProps[] = [
  {
    id: 'default-1',
    title: 'Fresh Catch Video Showcase',
    image_url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-fish-and-seafood-in-a-market-display-42861-large.mp4',
    media_type: 'video',
    cta_link: '/category/fish',
  },
  {
    id: 'default-2',
    title: 'Farm Fresh Selection',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
    media_type: 'image',
    cta_link: '/category/fish',
  },
  {
    id: 'default-3',
    title: 'Tender Chicken Banner',
    image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
    media_type: 'image',
    cta_link: '/category/chicken',
  },
]


export default function CinematicHero() {
  const [posters, setPosters] = useState<PosterProps[]>(DEFAULT_POSTERS)
  const [categories, setCategories] = useState<any[]>(CATEGORIES)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [activeCategoryHover, setActiveCategoryHover] = useState<string | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)

  // Mouse parallax motion coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })


  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        
        // 1. Fetch active posters
        const { data: posterData } = await supabase
          .from('homepage_posters')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (posterData && posterData.length > 0) {
          setPosters(posterData)
        }

        // 2. Fetch categories dynamically
        const { data: catData } = await supabase
          .from('homepage_categories')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (catData && catData.length > 0) {
          setCategories(catData)
        }
      } catch (_) {}
    }
    loadData()
  }, [])

  // Auto-play slider rotation
  useEffect(() => {
    if (isPaused || posters.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posters.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isPaused, posters.length])

  // Mouse move handler for organic 3D parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return // Disable mouse move on touch devices to conserve CPU
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    const x = (clientX / innerWidth - 0.5) * 20
    const y = (clientY / innerHeight - 0.5) * 20
    setMousePos({ x, y })
  }

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % posters.length)
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length)

  const currentPoster = posters[currentIndex] || DEFAULT_POSTERS[0]
  const isVideo = currentPoster.media_type === 'video' ||
    (currentPoster.image_url && /\.(mp4|webm|mov|ogg)($|\?)/i.test(currentPoster.image_url))

  const handleCategorySelect = (e: React.MouseEvent, slug: string) => {
    const productSection = document.getElementById('products-section') || document.getElementById('categories')
    if (productSection) {
      productSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative space-y-4 sm:space-y-5 mb-4 sm:mb-6 mt-0"
    >
      {/* Organic Fluid WebGL/Canvas Ambient Light */}
      <div className="absolute -inset-4 rounded-3xl overflow-hidden pointer-events-none -z-10 opacity-75">
        <AmbientLightCanvas intensity={1.2} opacity={0.7} />
      </div>

      {/* Main Cinematic Hero Banner Environment */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200/80 w-full aspect-[16/9] sm:aspect-[2.4/1] md:aspect-[2.8/1] lg:aspect-[3.1/1] max-h-[190px] xs:max-h-[220px] sm:max-h-[260px] md:max-h-[280px] lg:max-h-[310px] group transition-all mx-auto"
      >
        {/* Animated Media Layer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPoster.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative"
          >
            <Link href={currentPoster.cta_link || '/category/fish'} className="block w-full h-full relative">
              {isVideo ? (
                <video
                  src={currentPoster.image_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover transition-opacity duration-700"
                />
              ) : (
                <img
                  src={currentPoster.image_url}
                  alt={currentPoster.title || 'Bestiet Fresh Poster'}
                  className="w-full h-full object-cover transition-opacity duration-700"
                />
              )}
              {/* Subtle Soft Gradient Overlay for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </Link>
          </motion.div>
        </AnimatePresence>


        {/* Slider Controls */}
        {posters.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 shadow-sm transition-all opacity-80 group-hover:opacity-100 cursor-pointer active:scale-95"
              aria-label="Previous Poster"
            >
              <ChevronLeft className="w-5 h-5 text-slate-800" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 shadow-sm transition-all opacity-80 group-hover:opacity-100 cursor-pointer active:scale-95"
              aria-label="Next Poster"
            >
              <ChevronRight className="w-5 h-5 text-slate-800" />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-[#7FBA44]'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to poster ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Interactive Category Showcase Section */}
      <section id="categories" className="space-y-2 pt-1 scroll-mt-24">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
              Shop by Category
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase text-[#7FBA44] tracking-wider sm:hidden">
            Swipe →
          </span>
        </div>

        {/* Horizontal Category Cards Slider */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1.5 px-1 justify-start sm:justify-around smooth-scroll-x gpu-layer">
          {categories.map((cat, idx) => {
            const isHovered = activeCategoryHover === cat.id

            return (
              <motion.div
                key={cat.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                onMouseEnter={() => setActiveCategoryHover(cat.id)}
                onMouseLeave={() => setActiveCategoryHover(null)}
                className="category-circle category-item shrink-0 snap-start"
              >
                <Link
                  href={`/category/${cat.slug}`}
                  onClick={(e) => handleCategorySelect(e, cat.slug)}
                  className="group flex flex-col items-center cursor-pointer transition-all active:scale-95"
                >
                  <div className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md border-2 border-[#7FBA44]/30 bg-[#F1F5F9] flex items-center justify-center transition-all duration-300 group-hover:border-[#7FBA44] group-hover:shadow-xl group-hover:shadow-[#7FBA44]/20">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Glowing Light Overlay on Hover */}
                    <div
                      className={`absolute inset-0 bg-[#7FBA44]/20 blur-md transition-opacity duration-300 pointer-events-none ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-[#7FBA44] transition-colors mt-2.5 text-center line-clamp-1 max-w-[100px] sm:max-w-[120px]">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
