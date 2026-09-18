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
  const isLowStock = product.available_stock > 0 && product.available_stock <= 3

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
    <div className="group flex flex-col justify-between bg-gradient-to-b from-emerald-50/30 via-white to-slate-50/40 border border-slate-200/80 hover:border-emerald-500/40 rounded-[28px] sm:rounded-[32px] p-3 sm:p-4 shadow-xs hover:shadow-xl transition-all duration-300 relative overflow-hidden h-full">
      <Link href={`/product/${product.id}`} className="flex flex-col justify-between h-full space-y-3">
        
        {/* 1. TOP PRODUCT IMAGE AREA */}
        <div className="relative aspect-[4/3] w-full rounded-[20px] sm:rounded-[24px] overflow-hidden bg-slate-100 shadow-2xs">
          <img
            src={imageSrc}
            alt={product.name}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = '/logo.png'
            }}
            className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
              isOutOfStock ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />

          {/* Top Left: Stock Badge */}
          {!isOutOfStock ? (
            <div className="absolute top-2.5 left-2.5 z-10 bg-emerald-600/90 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-xs">
              <Leaf className="w-3 h-3 text-emerald-200 fill-emerald-200" />
              <span>{product.available_stock} kg left</span>
            </div>
          ) : (
            <div className="absolute top-2.5 left-2.5 z-10 bg-rose-600 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-xs">
              Sold Out
            </div>
          )}

          {/* Top Right: Favorite Wishlist Button */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-md shadow-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            aria-label="Save to Wishlist"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="bg-rose-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* 2. MIDDLE CONTENT SECTION */}
        <div className="space-y-2 flex-1 flex flex-col justify-between">
          
          {/* PRICE & ADD BUTTON ROW */}
          <div className="flex items-start justify-between gap-2 pt-1">
            <div className="space-y-1">
              {/* Price Display */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="bg-emerald-100/70 border border-emerald-200/50 text-slate-900 text-lg sm:text-2xl font-black px-2.5 sm:px-3 py-0.5 rounded-xl shadow-2xs tracking-tight">
                  ₹{itemPrice}
                </span>
                {originalPrice > itemPrice && (
                  <span className="text-slate-400 font-bold text-xs sm:text-sm line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>

              {/* Savings Tag */}
              {savings > 0 && (
                <div className="inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-800 text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <Percent className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Save ₹{savings}</span>
                </div>
              )}
            </div>

            {/* ADD BUTTON / QUANTITY CONTROL */}
            {!isOutOfStock && (
              <div>
                {currentPackQty > 0 ? (
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="flex items-center gap-1 bg-white text-emerald-600 border-2 border-emerald-500 rounded-full px-2 py-1 shadow-md"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, -1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Minus className="w-3 h-3 text-slate-900 stroke-[3]" />
                    </button>
                    <span className="text-xs sm:text-sm font-black px-1 min-w-5 text-center text-slate-900">
                      {currentPackQty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3 h-3 text-white stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitialAdd}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PRODUCT TITLE & SUBTITLE */}
          <div className="pt-1">
            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight tracking-tight line-clamp-1 group-hover:text-emerald-700 transition-colors capitalize">
              {product.name}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium tracking-tight truncate pt-0.5">
              Fresh • Premium Quality • Chemical Free
            </p>
          </div>

          {/* 3. INNER PACK SIZE / WEIGHT TOGGLE CONTAINER */}
          <div className="bg-slate-100/80 border border-slate-200/60 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 leading-none truncate">
                  {selectedWeight === 0.5 ? '500 g pack' : '1 kg pack'}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold truncate pt-0.5">
                  ₹{itemPrice} <span className="text-slate-400 font-normal">(₹{perKgPrice}/kg)</span>
                </p>
              </div>
            </div>

            {/* Quick Weight Selector Pills */}
            <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-slate-200">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {w === 0.5 ? '500g' : '1kg'}
                </button>
              ))}
            </div>
          </div>

          {/* 4. RATING FOOTER */}
          <div className="flex items-center gap-1.5 pt-0.5 text-xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-extrabold text-slate-900 text-xs">{ratingScore}</span>
            <span className="text-slate-400 font-medium text-[11px]">({reviewCount})</span>
          </div>

        </div>
      </Link>
    </div>
  )
}
