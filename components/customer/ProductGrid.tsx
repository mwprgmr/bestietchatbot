'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import ProductCard, { ProductProps } from './ProductCard'
import AppPromoPoster from './AppPromoPoster'
import { ArrowRight, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

// Helper component for Horizontal Section Slider
function ProductSectionSlider({
  subtitle,
  title,
  viewAllHref,
  viewAllLabel = 'VIEW ALL',
  products,
}: {
  subtitle: string
  title: string
  viewAllHref: string
  viewAllLabel?: string
  products: ProductProps[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!products || products.length === 0) return null

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Header with Title & Left/Right Slider Controls */}
      <div className="flex items-end justify-between pb-2 border-b border-[#E2ECE7]">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
            {subtitle}
          </span>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#0F172A] tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={viewAllHref}
            className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1 group"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-white border border-[#E2ECE7] hover:border-[#39B54A] text-slate-700 hover:text-[#39B54A] flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-white border border-[#E2ECE7] hover:border-[#39B54A] text-slate-700 hover:text-[#39B54A] flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLL SLIDER CONTAINER */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 scroll-smooth"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[270px] sm:w-[330px] md:w-[370px] shrink-0 snap-start"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ProductGrid() {
  const { selectedBranch } = useCustomer()
  const [products, setProducts] = useState<ProductProps[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBranchProducts() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()

        // Fetch products
        const { data: rawProducts, error: pErr } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true })

        if (pErr) throw pErr

        // Fetch latest inventory for the selected branch
        const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'
        const { data: rawInventory, error: iErr } = await supabase
          .from('inventory')
          .select('*')
          .eq('branch_id', targetBranchId)

        if (iErr) console.warn('Inventory fetch warning:', iErr.message)

        // Map product with stock and branch price
        const mapped: ProductProps[] = (rawProducts || []).map((p) => {
          const invMatch = (rawInventory || []).find((i) => i.product_id === p.id)
          const price = invMatch?.price_per_kg ? Number(invMatch.price_per_kg) : (p.price_per_kg || 450)
          const stock = invMatch?.available_stock !== undefined ? Math.max(0, Number(invMatch.available_stock)) : 0

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category || 'Fish',
            unit: p.unit || 'kg',
            price_per_kg: price,
            original_price_per_kg: Math.round(price * 1.25),
            available_stock: stock,
            image_url: p.image_url,
          }
        })

        setProducts(mapped)
      } finally {
        setLoading(false)
      }
    }

    loadBranchProducts()
  }, [selectedBranch?.id])

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-3 w-32 animate-shimmer bg-slate-200 rounded" />
            <div className="h-6 w-48 animate-shimmer bg-slate-200 rounded-lg" />
          </div>
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 my-6 shadow-xs">
        <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
        <h3 className="font-extrabold text-slate-900 text-base">Unable to load catalog</h3>
        <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-xl bg-[#39B54A] text-white font-bold text-xs shadow-xs hover:bg-[#2ea03e] transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Filter category lists
  const freshPicks = products.slice(0, 8)
  const fishProducts = products.filter((p) => p.category.toLowerCase().includes('fish'))
  const chickenProducts = products.filter((p) => p.category.toLowerCase().includes('chicken'))
  const muttonProducts = products.filter((p) => p.category.toLowerCase().includes('mutton'))
  const comboProducts = products.filter((p) => p.category.toLowerCase().includes('combo') || p.category.toLowerCase().includes('ready'))

  return (
    <div className="space-y-12">
      {/* 1. TODAY'S FRESH PICKS SLIDER */}
      <ProductSectionSlider
        subtitle="Selected for You Today"
        title="TODAY'S FRESH PICKS"
        viewAllHref="/category/fish"
        products={freshPicks}
      />

      {/* 2. APP & WHATSAPP PROMOTIONAL POSTER BANNER */}
      <AppPromoPoster />

      {/* 3. FRESH FISH & SEAFOOD SLIDER */}
      <ProductSectionSlider
        subtitle="Ocean & Backwater Catch"
        title="FRESH FISH & SEAFOOD"
        viewAllHref="/category/fish"
        viewAllLabel={`Explore Fish (${fishProducts.length})`}
        products={fishProducts}
      />

      {/* 4. FRESH CHICKEN SLIDER */}
      <ProductSectionSlider
        subtitle="Antibiotic-Free Farm Fresh"
        title="FRESH TENDER CHICKEN"
        viewAllHref="/category/chicken"
        viewAllLabel={`Explore Chicken (${chickenProducts.length})`}
        products={chickenProducts}
      />

      {/* 5. TENDER KERALA MUTTON SLIDER */}
      <ProductSectionSlider
        subtitle="Pasture Raised Goat Meat"
        title="TENDER KERALA MUTTON"
        viewAllHref="/category/mutton"
        viewAllLabel={`Explore Mutton (${muttonProducts.length})`}
        products={muttonProducts}
      />

      {/* 6. COMBOS & READY TO COOK SLIDER */}
      <ProductSectionSlider
        subtitle="Marinated & Special Value"
        title="COMBOS & READY TO COOK"
        viewAllHref="/category/combos"
        viewAllLabel={`Explore Combos (${comboProducts.length})`}
        products={comboProducts}
      />
    </div>
  )
}

