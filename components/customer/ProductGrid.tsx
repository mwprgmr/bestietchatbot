'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import ProductCard, { ProductProps } from './ProductCard'
import AppPromoPoster from './AppPromoPoster'
import FlashSale from './FlashSale'
import { ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

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
        const today = new Date().toISOString().split('T')[0]

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
          // Find matching branch inventory record
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
  const freshPicks = products.slice(0, 4)
  const fishProducts = products.filter((p) => p.category.toLowerCase().includes('fish'))
  const chickenProducts = products.filter((p) => p.category.toLowerCase().includes('chicken'))
  const muttonProducts = products.filter((p) => p.category.toLowerCase().includes('mutton'))
  const seafoodProducts = products.filter((p) => p.category.toLowerCase().includes('seafood') || p.category.toLowerCase().includes('specialty'))
  const comboProducts = products.filter((p) => p.category.toLowerCase().includes('combo') || p.category.toLowerCase().includes('ready'))

  return (
    <div className="space-y-12">
      {/* 1. TODAY'S FRESH PICKS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
              Selected for You Today
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
              TODAY'S FRESH PICKS
            </h2>
          </div>
          <Link
            href="/category/fish"
            className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1 group"
          >
            <span>VIEW ALL</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {freshPicks.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 2. APP & WHATSAPP PROMOTIONAL POSTER BANNER */}
      <AppPromoPoster />

      {/* 3. FISH & SEAFOOD SECTION */}
      {fishProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
                Ocean & Backwater Catch
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A]">
                FRESH FISH & SEAFOOD
              </h2>
            </div>
            <Link
              href="/category/fish"
              className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1"
            >
              <span>Explore Fish ({fishProducts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {fishProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 4. FRESH CHICKEN SECTION */}
      {chickenProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
                Antibiotic-Free Farm Fresh
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A]">
                FRESH TENDER CHICKEN
              </h2>
            </div>
            <Link
              href="/category/chicken"
              className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1"
            >
              <span>Explore Chicken ({chickenProducts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {chickenProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. TENDER MUTTON SECTION */}
      {muttonProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
                Pasture Raised Goat Meat
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A]">
                TENDER KERALA MUTTON
              </h2>
            </div>
            <Link
              href="/category/mutton"
              className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1"
            >
              <span>Explore Mutton ({muttonProducts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {muttonProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 6. COMBOS & READY TO COOK */}
      {comboProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
                Marinated & Special Value
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A]">
                COMBOS & READY TO COOK
              </h2>
            </div>
            <Link
              href="/category/combos"
              className="text-xs font-bold text-[#39B54A] hover:text-[#2EA03E] flex items-center gap-1"
            >
              <span>Explore Combos ({comboProducts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {comboProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
