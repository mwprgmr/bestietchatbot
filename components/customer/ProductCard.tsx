'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, Star, Heart, Leaf, ShoppingBag, Check } from 'lucide-react'

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
  const [isLiked, setIsLiked] = useState<boolean>(false)

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
    : Math.round(itemPrice * 1.25)
  const savings = Math.max(0, originalPrice - itemPrice)

  // Product rating score & review count
  const ratingScore = product.rating || (4.5 + (product.name.length % 5) * 0.1).toFixed(1)
  const reviewCount = product.reviews_count || `${(12.0 + (product.name.length % 12) * 1.5).toFixed(1)}k`

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

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLiked(!isLiked)
  }

  // Quality tagline based on category
  const qualityTagline =
    product.category.toLowerCase().includes('fish')
      ? 'Fresh • Premium Quality • Wild Caught'
      : product.category.toLowerCase().includes('chicken')
      ? 'Farm Fresh • Antibiotic Free • 100% Halal'
      : product.category.toLowerCase().includes('mutton')
      ? 'Pasture Raised • Tender Cut • Premium'
      : 'Daily Fresh • Handpicked • Hygienic'

  return (
    <div className="group relative flex flex-col justify-between bg-white/90 backdrop-blur-xl border border-white/80 hover:border-[#39B54A]/30 rounded-[28px] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_45px_rgba(57,181,74,0.15)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden h-full">
      <Link href={`/product/${product.id}`} className="flex flex-col justify-between h-full">
        <div>
          {/* 1. PRODUCT IMAGE CONTAINER WITH SOFT CORNERS */}
          <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-[#F0FDF4]/40 to-white rounded-[22px] overflow-hidden shadow-inner border border-slate-100/60">
            <img
              src={imageSrc}
              alt={product.name}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = '/logo.png'
              }}
              className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-108 ${
                isOutOfStock ? 'grayscale opacity-60' : ''
              }`}
              loading="lazy"
            />

            {/* Inventory Stock Pill Badge */}
            {!isOutOfStock ? (
              <div className="absolute top-2.5 left-2.5 z-10 bg-[#39B54A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md shadow-emerald-500/20 flex items-center gap-1.5 backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 fill-white text-white" />
                <span>{product.available_stock} kg left</span>
              </div>
            ) : (
              <div className="absolute top-2.5 left-2.5 z-10 bg-rose-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <span>Sold Out</span>
              </div>
            )}

            {/* Top-Right Favorite Heart Button */}
            <button
              type="button"
              onClick={toggleLike}
              className="absolute top-2.5 right-2.5 z-10 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md text-slate-700 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              aria-label="Save to Wishlist"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
                }`}
              />
            </button>

            {/* Out of stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="bg-rose-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* 2. PRICE & ADD BUTTON ROW */}
          <div className="flex items-center justify-between gap-2 mt-3.5">
            {/* Price Column */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#0F172A] tracking-tight">
                  ₹{itemPrice}
                </span>
                {originalPrice > itemPrice && (
                  <span className="text-sm font-bold text-slate-400 line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>

              {/* Savings Discount Badge */}
              {savings > 0 && (
                <div className="inline-flex items-center gap-1 bg-[#E8F8EA] text-[#2EA03E] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mt-0.5 border border-emerald-200/50">
                  <span className="w-3 h-3 rounded-full bg-[#39B54A] text-white text-[9px] flex items-center justify-center font-bold">
                    %
                  </span>
                  <span>Save ₹{savings}</span>
                </div>
              )}
            </div>

            {/* Pill ADD / Stepper Button */}
            {!isOutOfStock && (
              <div>
                {currentPackQty > 0 ? (
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="flex items-center gap-1.5 bg-emerald-50 text-[#39B54A] border-2 border-[#39B54A] rounded-full px-2.5 py-1 shadow-md shadow-emerald-500/10 animate-scale-up"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, -1)}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#39B54A]/20 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5 text-[#39B54A] stroke-[3]" />
                    </button>
                    <span className="text-sm font-black px-1 min-w-[20px] text-center text-slate-900">
                      {currentPackQty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, 1)}
                      className="w-6 h-6 rounded-full bg-[#39B54A] hover:bg-[#2ea03e] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitialAdd}
                    className="bg-gradient-to-r from-[#39B54A] to-[#2EA03E] hover:from-[#2ea03e] hover:to-[#258732] text-white font-black text-sm px-5 py-2 rounded-full shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 tracking-wide"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. PRODUCT TITLE & HIGHLIGHTS */}
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-black text-[#0F172A] capitalize tracking-tight leading-snug group-hover:text-[#39B54A] transition-colors">
              {product.name}
            </h3>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-0.5 tracking-tight">
              {qualityTagline}
            </p>
          </div>
        </div>

        <div>
          {/* 4. PACK SIZE CONTAINER WITH WEIGHT TOGGLE */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between mt-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-700">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-extrabold text-slate-900">
                  {selectedWeight === 0.5 ? '500 g pack' : '1 kg pack'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  ₹{itemPrice} (₹{product.price_per_kg}/kg)
                </span>
              </div>
            </div>

            {/* Quick Weight Selector Buttons */}
            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-[#39B54A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {w === 0.5 ? '500g' : '1kg'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. RATING ROW */}
          <div className="flex items-center gap-1.5 pt-2.5">
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-black">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{ratingScore}</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">({reviewCount})</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
