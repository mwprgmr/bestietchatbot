'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, ArrowDown, ShieldCheck, Flame } from 'lucide-react'
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

// Floating 3D Seafood Product Badges for Hero Environment
const FLOATING_SEAFOOD_ITEMS = [
  {
    id: 'hero-fish',
    name: 'Ocean Fresh Fish',
    tag: 'Net-to-Kitchen',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=400&q=80',
    slug: 'fish',
    depth: 0.15,
    pos: 'top-6 left-4 sm:top-10 sm:left-8',
    glowColor: 'rgba(127, 186, 68, 0.4)',
  },
  {
    id: 'hero-prawns',
    name: 'Tiger Prawns',
    tag: 'Cleaned & Deveined',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80',
    slug: 'seafood',
    depth: 0.25,
    pos: 'top-12 right-4 sm:top-16 sm:right-10',
    glowColor: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'hero-chicken',
    name: 'Tender Chicken',
    tag: '100% Antibiotic-Free',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80',
    slug: 'chicken',
    depth: 0.2,
    pos: 'bottom-20 left-6 sm:bottom-24 sm:left-12',
    glowColor: 'rgba(127, 186, 68, 0.35)',
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

  // Scroll parallax effects using Framer Motion
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 80])
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.96])
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0.35])

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
    <motion.div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
      className="relative space-y-8 mb-12 transform-gpu"
    >
      {/* Organic Fluid WebGL/Canvas Ambient Light */}
      <div className="absolute -inset-4 rounded-3xl overflow-hidden pointer-events-none -z-10 opacity-75">
        <AmbientLightCanvas intensity={1.2} opacity={0.7} />
      </div>

      {/* Main Cinematic Hero Banner Environment */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800/80 h-[240px] xs:h-[280px] sm:h-[380px] md:h-[480px] lg:h-[520px] w-full group transition-all"
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
              {/* Subtle Gradient Overlay for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Ambient Glow & Floating Seafood Imagery Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 hidden sm:block">
          {FLOATING_SEAFOOD_ITEMS.map((item) => {
            const shiftX = mousePos.x * item.depth * 1.5
            const shiftY = mousePos.y * item.depth * 1.5

            return (
              <motion.div
                key={item.id}
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 1.5, -1.5, 0],
                }}
                transition={{
                  duration: 6 + item.depth * 10,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  transform: `translate3d(${shiftX}px, ${shiftY}px, 0)`,
                }}
                className={`absolute ${item.pos} z-20 pointer-events-auto transform-gpu`}
              >
                <Link
                  href={`/category/${item.slug}`}
                  className="group/float flex items-center gap-3 p-2 pr-4 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl hover:border-[#7FBA44] transition-all hover:scale-105 active:scale-95"
                >
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    {/* Depth Light Glow Behind Image */}
                    <div
                      className="absolute inset-0 blur-md opacity-40 group-hover/float:opacity-90 transition-opacity"
                      style={{ backgroundColor: item.glowColor }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7FBA44]">
                      {item.tag}
                    </div>
                    <div className="text-xs font-black text-white">{item.name}</div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Slider Controls */}
        {posters.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer active:scale-95"
              aria-label="Previous Poster"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/20 transition-all opacity-80 group-hover:opacity-100 cursor-pointer active:scale-95"
              aria-label="Next Poster"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-[#7FBA44]'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to poster ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Interactive Category Showcase Section */}
      <section id="categories" className="space-y-4 pt-2 scroll-mt-24">
        <div className="flex items-baseline justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-[#0F172A] tracking-tight uppercase">
              Shop by Category
            </h2>
            <span className="p-1 px-2.5 rounded-full bg-[#7FBA44]/10 text-[#7FBA44] font-black text-[10px] tracking-wider uppercase border border-[#7FBA44]/20 hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Inventory
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase text-[#7FBA44] tracking-wider sm:hidden">
            Swipe →
          </span>
        </div>

        {/* Horizontal Category Cards Slider */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-3 px-1 justify-start sm:justify-around smooth-scroll-x gpu-layer">
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
                  <span className="text-xs sm:text-sm font-black text-[#0F172A] group-hover:text-[#7FBA44] transition-colors mt-2.5 text-center line-clamp-1 max-w-[100px] sm:max-w-[120px]">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>
    </motion.div>
  )
}
