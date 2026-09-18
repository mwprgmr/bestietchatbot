'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, Star, Heart, Leaf, Package, Clock, MapPin } from 'lucide-react'

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
  const { cart, addToCart, updateCartQuantity, selectedBranch } = useCustomer()
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
    : Math.round(itemPrice * 1.3)
  const savings = Math.max(0, originalPrice - itemPrice)
  const perKgPrice = Math.round(product.price_per_kg)

  // Product rating score & review count
  const ratingScore = product.rating || (4.3 + (product.name.length % 6) * 0.1).toFixed(1)
  const reviewCount = product.reviews_count || `${(1.2 + (product.name.length % 9) * 0.4).toFixed(1)}k`

  const branchName = selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : 'Manvila'

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
    <div className="group relative bg-white/90 backdrop-blur-md border border-[#E2ECE7] hover:border-[#079669]/50 rounded-[20px] p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col justify-between">
      <Link href={`/product/${product.id}`} className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 items-stretch h-full">
        
        {/* 1. PRODUCT IMAGE CONTAINER (Left side on Desktop, Top on Mobile 2-column) */}
        <div className="relative shrink-0 w-full sm:w-36 h-36 sm:h-36 rounded-[16px] overflow-hidden bg-slate-100 shadow-2xs">
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

          {/* STOCK BADGE — TOP LEFT */}
          {!isOutOfStock ? (
            <div className="absolute top-2 left-2 z-10 bg-[#079669]/90 text-white backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <Leaf className="w-2.5 h-2.5 text-emerald-200 fill-emerald-200" />
              <span>{product.available_stock} kg left</span>
            </div>
          ) : (
            <div className="absolute top-2 left-2 z-10 bg-rose-600 text-white backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
              Sold Out
            </div>
          )}

          {/* WISHLIST BUTTON — TOP RIGHT */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border border-white/60 flex items-center justify-center text-slate-700 hover:text-rose-500 shadow-xs transition-all active:scale-90 cursor-pointer"
            aria-label="Save to Wishlist"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>

          {/* DISCOUNT BADGE OVERLAY — BOTTOM LEFT OF IMAGE (SWIGGY STYLE) */}
          {savings > 0 && !isOutOfStock && (
            <div className="absolute bottom-2 left-2 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-xs uppercase tracking-tight">
              SAVE ₹{savings}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* 2. PRODUCT DETAILS SECTION (Right side on Desktop) */}
        <div className="flex-1 flex flex-col justify-between min-w-0 space-y-2">
          
          <div className="space-y-1">
            {/* PRODUCT TITLE */}
            <h3 className="font-extrabold text-[#142B27] text-sm sm:text-[15px] leading-snug tracking-tight line-clamp-1 group-hover:text-[#079669] transition-colors capitalize">
              {product.name}
            </h3>

            {/* RATING & DELIVERY TIME (Swiggy / Zomato style line) */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200/60">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{ratingScore}</span>
                <span className="text-amber-600 font-normal text-[10px]">({reviewCount})</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-[#758681] font-semibold text-[11px]">
                <Clock className="w-3 h-3 text-[#079669]" />
                <span>20-35 MINS</span>
              </div>
            </div>

            {/* CATEGORY & BRANCH DISTANCE */}
            <div className="flex items-center gap-1 text-[11px] text-[#758681] font-medium truncate pt-0.5">
              <span className="truncate">{product.category} • Chemical Free</span>
              <span className="text-slate-300">•</span>
              <span className="shrink-0 flex items-center gap-0.5 text-slate-500">
                <MapPin className="w-2.5 h-2.5 text-[#079669]" />
                {branchName}
              </span>
            </div>
          </div>

          {/* WEIGHT SELECTOR PILLS */}
          <div className="flex items-center justify-between gap-1 bg-[#F4F8F6] border border-[#E2ECE7] rounded-xl p-1">
            <div className="flex items-center gap-1 min-w-0 pl-1">
              <Package className="w-3 h-3 text-[#079669] shrink-0" />
              <span className="text-[11px] font-bold text-[#142B27] truncate">
                {selectedWeight === 0.5 ? '500g Pack' : '1kg Pack'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 bg-white p-0.5 rounded-lg border border-[#E2ECE7]">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer ${
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

          {/* PRICE & ADD TO CART ROW */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0F5F3]">
            
            {/* Left: Prices */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[#142B27] text-base sm:text-lg font-black tracking-tight">
                  ₹{itemPrice}
                </span>
                {originalPrice > itemPrice && (
                  <span className="text-slate-400 font-medium text-[11px] line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                (₹{perKgPrice}/kg)
              </span>
            </div>

            {/* Right: + ADD / Quantity Button */}
            {!isOutOfStock && (
              <div className="shrink-0">
                {currentPackQty > 0 ? (
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="flex items-center gap-1 bg-white text-[#079669] border border-[#079669] rounded-full px-2 py-0.5 shadow-2xs h-[34px]"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, -1)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-[#079669]/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Minus className="w-3 h-3 text-[#142B27] stroke-[3]" />
                    </button>
                    <span className="text-xs font-bold px-1 min-w-4 text-center text-[#142B27]">
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
                    className="bg-[#079669] hover:bg-[#057a55] text-white font-extrabold text-xs px-3.5 py-1.5 h-[34px] rounded-full shadow-xs flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            )}

          </div>

        </div>

      </Link>
    </div>
  )
}
