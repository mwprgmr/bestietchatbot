'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import ProductCard, { ProductProps } from './ProductCard'
import FlashSale from './FlashSale'
import { ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
        const { data: rawInventory, error: iErr } = await supabase
          .from('inventory')
          .select('*')
          .eq('branch_id', selectedBranch.id)

        if (iErr) console.warn('Inventory fetch warning:', iErr.message)

        // Map product with stock and branch price
        const mapped: ProductProps[] = (rawProducts || []).map((p) => {
          // Find matching branch inventory record
          const invMatch = (rawInventory || []).find((i) => i.product_id === p.id)
          const price = invMatch?.price_per_kg ? Number(invMatch.price_per_kg) : 450
          const stock = invMatch?.available_stock !== undefined ? Number(invMatch.available_stock) : 20

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
  }, [selectedBranch.id])

  if (loading) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#8B9A6E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#232B1E]/70 uppercase tracking-wider">
          Fetching Today's Fresh Catch for {selectedBranch.name}...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-[#F7F2EB] border border-[#EEEEEE] text-center text-xs text-[#232B1E] space-y-2">
        <AlertCircle className="w-6 h-6 mx-auto text-[#8B9A6E]" />
        <p className="font-bold">{error}</p>
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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
              Selected for You Today
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#232B1E] tracking-tight">
              TODAY'S FRESH PICKS
            </h2>
          </div>
          <Link
            href="/category/fish"
            className="text-xs font-bold text-[#8B9A6E] hover:text-[#7A895D] flex items-center gap-1 group"
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




      {/* 3. FISH & SEAFOOD SECTION */}
      {fishProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EEEEEE]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
                Ocean & Backwater Catch
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#232B1E]">
                FRESH FISH & SEAFOOD
              </h2>
            </div>
            <Link
              href="/category/fish"
              className="text-xs font-bold text-[#8B9A6E] hover:text-[#7A895D] flex items-center gap-1"
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
          <div className="flex items-center justify-between pb-2 border-b border-[#EEEEEE]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
                Antibiotic-Free Farm Fresh
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#232B1E]">
                FRESH TENDER CHICKEN
              </h2>
            </div>
            <Link
              href="/category/chicken"
              className="text-xs font-bold text-[#8B9A6E] hover:text-[#7A895D] flex items-center gap-1"
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
          <div className="flex items-center justify-between pb-2 border-b border-[#EEEEEE]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
                Pasture Raised Goat Meat
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#232B1E]">
                TENDER KERALA MUTTON
              </h2>
            </div>
            <Link
              href="/category/mutton"
              className="text-xs font-bold text-[#8B9A6E] hover:text-[#7A895D] flex items-center gap-1"
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
          <div className="flex items-center justify-between pb-2 border-b border-[#EEEEEE]">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
                Marinated & Special Value
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[#232B1E]">
                COMBOS & READY TO COOK
              </h2>
            </div>
            <Link
              href="/category/combos"
              className="text-xs font-bold text-[#8B9A6E] hover:text-[#7A895D] flex items-center gap-1"
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
