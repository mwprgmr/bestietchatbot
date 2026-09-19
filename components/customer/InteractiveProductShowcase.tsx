'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, Filter, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import ProductCard, { ProductProps } from './ProductCard'

const CATEGORY_SHOWCASE_TILES = [
  {
    key: 'fish',
    name: 'FRESH FISH',
    subtitle: 'Ocean & Backwater Fish',
    tagline: 'Naturally preserved in ice, 100% Ammonia Free',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80',
    glowColor: 'rgba(127, 186, 68, 0.35)', // Logo Green
  },
  {
    key: 'prawns',
    name: 'PRAWNS',
    subtitle: 'Tiger & White Prawns',
    tagline: 'De-veined, peeled, and sea-cleaned',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80',
    glowColor: 'rgba(2, 132, 199, 0.35)', // Ocean Aqua
  },
  {
    key: 'seafood',
    name: 'SEAFOOD',
    subtitle: 'Crabs, Squid & Shellfish',
    tagline: 'Delivered fresh from local fishing harbours',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80',
    glowColor: 'rgba(6, 182, 212, 0.35)', // Cyan Fresh
  },
  {
    key: 'meat',
    name: 'FRESH MEAT',
    subtitle: 'Tender Chicken & Goat Mutton',
    tagline: 'Farm-raised, hygienic precision cuts',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
    glowColor: 'rgba(127, 186, 68, 0.35)',
  },
]

export default function InteractiveProductShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<string>('fish')
  const [hoveredTile, setHoveredTile] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductProps[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { selectedBranch } = useCustomer()

  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      setLoading(true)
      try {
        const supabase = createClient()
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'

        // Fetch products
        const { data: rawProducts } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)

        // Fetch inventory
        const { data: rawInventory } = await supabase
          .from('inventory')
          .select('*')
          .eq('branch_id', targetBranchId)
          .lte('inventory_date', todayStr)

        const safeProducts = Array.isArray(rawProducts) ? rawProducts : []
        const safeInventory = Array.isArray(rawInventory) ? rawInventory : []

        const mapped: ProductProps[] = safeProducts.map((p) => {
          const invMatch = safeInventory.find((i) => i && i.product_id === p.id)
          const rawPrice = invMatch?.price_per_kg ?? p.price_per_kg ?? 450
          const price = typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0 ? Number(rawPrice) : 450
          const stock = invMatch && invMatch.available_stock !== undefined && invMatch.available_stock !== null
            ? Math.max(0, Number(invMatch.available_stock))
            : 0

          return {
            id: p.id,
            name: p.name || 'Fresh Item',
            description: p.description || '',
            category: p.category || 'Fish',
            unit: p.unit || 'kg',
            price_per_kg: price,
            original_price_per_kg: Math.round(price * 1.25),
            available_stock: stock,
            image_url: p.image_url || null,
          }
        })

        if (isMounted) {
          setProducts(mapped)
          setLoading(false)
        }
      } catch (_) {
        if (isMounted) setLoading(false)
      }
    }

    loadCatalog()

    return () => {
      isMounted = false
    }
  }, [selectedBranch?.id])

  const activeTileObj = CATEGORY_SHOWCASE_TILES.find((t) => t.key === selectedCategory) || CATEGORY_SHOWCASE_TILES[0]

  // Filter items matching active category key
  const filteredProducts = products.filter((p) => {
    const cat = (p.category || '').toLowerCase()
    if (selectedCategory === 'fish') return cat.includes('fish')
    if (selectedCategory === 'prawns') return cat.includes('prawn') || cat.includes('seafood')
    if (selectedCategory === 'seafood') return cat.includes('seafood') || cat.includes('crab') || cat.includes('prawn') || cat.includes('fish')
    if (selectedCategory === 'meat') return cat.includes('chicken') || cat.includes('mutton') || cat.includes('meat')
    return true
  })

  return (
    <section className="my-12 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#7FBA44] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> CINEMATIC CATALOG SHOWCASE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase mt-1">
            EXPLORE FRESH CATCH BY CATEGORY
          </h2>
        </div>
        <p className="text-xs text-slate-500 max-w-sm">
          Select a category to view live branch stock, pricing, custom cut options, and express delivery details.
        </p>
      </div>

      {/* Interactive 4-Grid Category Showcase Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORY_SHOWCASE_TILES.map((tile) => {
          const isSelected = selectedCategory === tile.key
          const isHovered = hoveredTile === tile.key

          return (
            <motion.div
              key={tile.key}
              onMouseEnter={() => setHoveredTile(tile.key)}
              onMouseLeave={() => setHoveredTile(null)}
              onClick={() => setSelectedCategory(tile.key)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative rounded-3xl overflow-hidden cursor-pointer h-56 p-5 flex flex-col justify-between border transition-all duration-300 ${
                isSelected
                  ? 'border-[#7FBA44] ring-2 ring-[#7FBA44]/30 shadow-xl'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-md'
              }`}
            >
              {/* Background Image with Zoom */}
              <img
                src={tile.image}
                alt={tile.name}
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                  isHovered || isSelected ? 'scale-110' : 'scale-100'
                }`}
              />

              {/* Dynamic Lighting Glow Overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${tile.glowColor} 0%, rgba(15, 23, 42, 0.85) 80%)`,
                  opacity: isSelected || isHovered ? 0.95 : 0.75,
                }}
              />

              {/* Content Header Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  {tile.subtitle}
                </span>

                {isSelected && (
                  <span className="bg-[#7FBA44] text-white p-1 rounded-full shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>

              {/* Bottom Typography & Selection Trigger */}
              <div className="relative z-10 space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight uppercase">{tile.name}</h3>
                <p className="text-[11px] text-slate-200 font-medium line-clamp-1">{tile.tagline}</p>
                <div className="pt-2 flex items-center gap-1 text-[11px] font-black text-[#7FBA44] uppercase tracking-wider">
                  <span>Browse Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Filtered Catalog Products Showcase Header */}
      <div className="pt-4 flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2">
          <span>{activeTileObj.name} SELECTION</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {filteredProducts.length} Available
          </span>
        </h3>
      </div>

      {/* Catalog Grid with Animated Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading fresh inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              No products available in this category right now.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
