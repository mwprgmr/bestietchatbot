'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, Star, Heart, Leaf, Percent, Package } from 'lucide-react'

export interface ProductProps {
  id: string
  name: string
  description?: string | null
  category: string
  unit: string
  price_per_kg: number
  original_price_per_kg?: number
  available_stock: number
  image_url?: string | null
  default_cut?: string
  rating?: number
  reviews_count?: string
}

export default function ProductCard({ product }: { product: ProductProps }) {
  const { cart, addToCart, updateCartQuantity } = useCustomer()
  const [selectedWeight, setSelectedWeight] = useState<number>(0.5) // 500g default pack
  const [isFavorite, setIsFavorite] = useState<boolean>(false)

  const rawImage = product.image_url || getProductImagePlaceholder(product.category, product.name)
  const imageSrc = rawImage ? rawImage.replace(/^http:\/\//i, 'https://') : '/logo.png'
  const defaultCut = product.default_cut || (product.category === 'Chicken' ? 'Curry Cut' : product.category === 'Mutton' ? 'Curry Cut' : 'Cleaned & Cut')

  const cartKey = `${product.id}_${defaultCut.replace(/\s+/g, '_')}_${selectedWeight}`
  const existingCartItem = cart.find((i) => i.cart_key === cartKey)
  const currentPackQty = existingCartItem ? existingCartItem.quantity : 0

  const isOutOfStock = product.available_stock <= 0

  // Calculated item price
  const itemPrice = Math.round(product.price_per_kg * selectedWeight)
  const originalPrice = product.original_price_per_kg
    ? Math.round(product.original_price_per_kg * selectedWeight)
    : Math.round(itemPrice * 1.35)
  const savings = Math.max(0, originalPrice - itemPrice)
  const perKgPrice = Math.round(product.price_per_kg)

  // Product rating score & review count
  const ratingScore = product.rating || (4.2 + (product.name.length % 7) * 0.1).toFixed(1)
  const reviewCount = product.reviews_count || `${(10.5 + (product.name.length % 15) * 2.3).toFixed(1)}k`

  const handleInitialAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return

    addToCart({
      product_id: product.id,
      product_name: product.name,
      image_url: imageSrc,
      category: product.category,
      unit: product.unit,
      price_per_kg: product.price_per_kg,
      weight_kg: selectedWeight,
      quantity: 1,
      cleaning_option: defaultCut,
      available_stock: product.available_stock,
    })
  }

  const handleQtyChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!existingCartItem) return
    updateCartQuantity(existingCartItem.cart_key, delta)
  }

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  return (
    <div className="group flex flex-col justify-between bg-white/80 backdrop-blur-lg border border-[#E2ECE7] hover:border-[#079669]/40 rounded-[18px] p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 relative overflow-hidden h-full">
      <Link href={`/product/${product.id}`} className="flex flex-col justify-between h-full space-y-2.5">
        
        {/* 1. PRODUCT IMAGE SECTION (TOP) */}
        <div className="relative aspect-[4/3] w-full rounded-t-[14px] rounded-b-[10px] overflow-hidden bg-slate-100 shadow-2xs">
          <img
            src={imageSrc}
            alt={product.name}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = '/logo.png'
            }}
            className={`w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105 ${
              isOutOfStock ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />

          {/* STOCK BADGE — TOP LEFT */}
          {!isOutOfStock ? (
            <div className="absolute top-[10px] left-[10px] z-10 bg-[#079669]/90 text-white backdrop-blur-md px-[10px] py-[4px] rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-xs">
              <Leaf className="w-3 h-3 text-emerald-200 fill-emerald-200" />
              <span>{product.available_stock} kg left</span>
            </div>
          ) : (
            <div className="absolute top-[10px] left-[10px] z-10 bg-rose-600 text-white backdrop-blur-md px-[10px] py-[4px] rounded-full text-[11px] font-bold shadow-xs">
              Sold Out
            </div>
          )}

          {/* WISHLIST — TOP RIGHT */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="absolute top-[10px] right-[10px] z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border border-white/60 flex items-center justify-center text-slate-700 hover:text-rose-500 shadow-xs transition-all active:scale-90 cursor-pointer"
            aria-label="Save to Wishlist"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="bg-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* 2. PRODUCT INFORMATION SECTION */}
        <div className="space-y-2 flex-1 flex flex-col justify-between">
          
          {/* PRODUCT NAME & DESCRIPTION */}
          <div>
            <h3 className="font-bold text-[#142B27] text-base sm:text-[17px] leading-snug tracking-tight line-clamp-2 group-hover:text-[#079669] transition-colors capitalize">
              {product.name}
            </h3>
            <p className="text-[11px] sm:text-xs text-[#758681] font-medium tracking-tight truncate pt-0.5">
              Fresh • Premium Quality • Wild Caught
            </p>
          </div>

          {/* 3. PRICE + ADD BUTTON (SINGLE HORIZONTAL ROW) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 pt-0.5">
              
              {/* Left: Prices */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[#142B27] text-lg sm:text-[20px] font-extrabold tracking-tight">
                  ₹{itemPrice}
                </span>
                {originalPrice > itemPrice && (
                  <span className="text-[#758681] font-medium text-xs line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>

              {/* Right: + ADD Button / Quantity Controls */}
              {!isOutOfStock && (
                <div>
                  {currentPackQty > 0 ? (
                    <div
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      className="flex items-center gap-1.5 bg-white text-[#079669] border border-[#079669] rounded-full px-2.5 py-1 shadow-2xs h-[36px]"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleQtyChange(e, -1)}
                        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-[#079669]/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      >
                        <Minus className="w-3 h-3 text-[#142B27] stroke-[3]" />
                      </button>
                      <span className="text-xs font-bold px-0.5 min-w-4 text-center text-[#142B27]">
                        {currentPackQty}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleQtyChange(e, 1)}
                        className="w-5 h-5 rounded-full bg-[#079669] hover:bg-[#057a55] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3 h-3 text-white stroke-[3]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInitialAdd}
                      className="bg-[#079669] hover:bg-[#057a55] text-white font-bold text-[13px] px-4 py-2 h-[36px] rounded-full shadow-xs flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* DISCOUNT BADGE */}
            {savings > 0 && (
              <div className="inline-flex items-center gap-1 bg-[#079669]/10 text-[#079669] border border-[#079669]/20 font-semibold text-[10px] px-2 py-[2px] rounded-full">
                <Percent className="w-2.5 h-2.5 text-[#079669]" />
                <span>Save ₹{savings}</span>
              </div>
            )}
          </div>

          {/* 4. PACK SIZE SELECTOR CONTAINER */}
          <div className="bg-[#F4F8F6] border border-[#E2ECE7] rounded-[12px] p-2 flex items-center justify-between gap-2 h-[44px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="w-3.5 h-3.5 text-[#079669] shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#142B27] leading-none truncate">
                  {selectedWeight === 0.5 ? '500 g pack' : '1 kg pack'}
                </p>
                <p className="text-[10px] text-[#758681] font-medium truncate pt-0.5">
                  ₹{itemPrice} <span className="text-slate-400 font-normal">(₹{perKgPrice}/kg)</span>
                </p>
              </div>
            </div>

            {/* Quick Weight Selector Pills */}
            <div className="flex items-center gap-1 shrink-0 bg-white p-0.5 rounded-[8px] border border-[#E2ECE7]">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-2 py-0.5 rounded-[6px] text-[11px] font-bold transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-[#079669] text-white shadow-2xs'
                      : 'text-[#758681] hover:text-[#142B27]'
                  }`}
                >
                  {w === 0.5 ? '500g' : '1kg'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. RATING AT BOTTOM */}
          <div className="flex items-center gap-1.5 pt-0.5 text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-[#142B27] text-xs">{ratingScore}</span>
            <span className="text-[#758681] font-medium text-[11px]">({reviewCount})</span>
          </div>

        </div>
      </Link>
    </div>
  )
}
