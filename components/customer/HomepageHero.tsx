'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CinematicHero from './CinematicHero'

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

export default function HomepageHero() {
  const [categories, setCategories] = useState<any[]>(CATEGORIES)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        // Fetch categories dynamically from Super Admin homepage_categories table
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

  return (
    <div className="space-y-8 mb-10">
      {/* Cinematic Hero Environment with WebGL Glow & Floating Cards */}
      <CinematicHero />

      {/* Shop by Category Section (Single Line Horizontal Slider on Mobile & Desktop) */}
      <section id="categories" className="space-y-4 pt-2 scroll-mt-20">
        <div className="flex items-baseline justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-[#0F172A] tracking-tight uppercase">
              Shop by Category
            </h2>
            <p className="text-xs text-[#0F172A]/60 font-semibold hidden sm:block">
              Explore fresh ocean catch, tender meats, and value combos
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase text-[#7FBA44] tracking-wider sm:hidden">
            Swipe →
          </span>
        </div>

        {/* Single-Line Horizontal Slider */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-1 justify-start sm:justify-around smooth-scroll-x gpu-layer">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="category-circle category-item group flex flex-col items-center shrink-0 snap-start cursor-pointer transition-all active:scale-95 animate-fade-in-up"
            >
              <div className="category-circle category-item w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md border-2 border-[#7FBA44]/30 bg-[#F1F5F9] relative flex items-center justify-center">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="category-circle category-item w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xs sm:text-sm font-black text-[#0F172A] group-hover:text-[#7FBA44] transition-colors mt-2.5 text-center line-clamp-1 max-w-[100px] sm:max-w-[120px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
