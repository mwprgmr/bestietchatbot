'use client'

import React, { useState, memo, useCallback } from 'react'
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

function ProductCardComponent({ product }: { product: ProductProps }) {
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

  // Product rating score & review count
  const ratingScore = product.rating || (4.3 + (product.name.length % 6) * 0.1).toFixed(1)

  const branchName = selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : 'Manvila'

  const handleInitialAdd = useCallback((e: React.MouseEvent) => {
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
  }, [isOutOfStock, addToCart, product, imageSrc, selectedWeight, defaultCut])

  const handleQtyChange = useCallback((e: React.MouseEvent, delta: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!existingCartItem) return
    updateCartQuantity(existingCartItem.cart_key, delta)
  }, [existingCartItem, updateCartQuantity])

  const toggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite((prev) => !prev)
  }, [])

  return (
    <div className="group relative bg-white border border-slate-200/90 hover:border-[#39B54A]/50 rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden min-h-[125px] sm:min-h-[155px] flex flex-col justify-between h-full transform-gpu contain-render">
      <Link href={`/product/${product.id}`} className="flex flex-row gap-3 sm:gap-3.5 items-stretch h-full">
        
        {/* 1. PRODUCT IMAGE CONTAINER */}
        <div className="relative shrink-0 w-24 xs:w-28 sm:w-36 h-24 xs:h-28 sm:h-36 rounded-[14px] sm:rounded-[18px] overflow-hidden bg-slate-100 border border-slate-100 my-auto transform-gpu">
          <img
            src={imageSrc}
            alt={product.name}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = '/logo.png'
            }}
            className={`w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105 ${
              isOutOfStock ? 'grayscale opacity-60 blur-[2px]' : ''
            }`}
            loading="lazy"
            decoding="async"
          />

          {/* STOCK BADGE */}
          {!isOutOfStock ? (
            <div className="absolute top-1.5 left-1.5 z-10 bg-[#39B54A] text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-2xs">
              <Leaf className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 text-white fill-white/40" />
              <span>{product.available_stock}kg</span>
            </div>
          ) : (
            <div className="absolute top-1.5 left-1.5 z-10 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold shadow-2xs">
              Sold Out
            </div>
          )}

          {/* WISHLIST BUTTON */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="absolute top-1.5 right-1.5 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-rose-500 shadow-2xs transition-all active:scale-90 cursor-pointer"
            aria-label="Save to Wishlist"
          >
            <Heart
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>

          {/* DISCOUNT BADGE OVERLAY */}
          {savings > 0 && !isOutOfStock && (
            <div className="absolute bottom-1.5 left-1.5 z-10 bg-gradient-to-r from-[#39B54A] to-[#2EA03E] text-white font-black text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md shadow-2xs uppercase tracking-tight">
              SAVE ₹{savings}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-20 p-1 text-center">
              <span className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md border border-white/20">
                OUT OF STOCK
              </span>
            </div>
          )}
        </div>

        {/* 2. PRODUCT DETAILS SECTION */}
        <div className="flex-1 flex flex-col justify-between min-w-0 space-y-1.5">
          
          <div className="space-y-1">
            {/* PRODUCT TITLE */}
            <h3 className="font-extrabold text-[#142B27] text-xs sm:text-[15px] leading-snug tracking-tight line-clamp-1 group-hover:text-[#39B54A] transition-colors capitalize">
              {product.name}
            </h3>

            {/* RATING & DELIVERY TIME */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200/60 text-[9px] sm:text-[11px]">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                <span>{ratingScore}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-[#758681] font-semibold text-[9px] sm:text-[11px]">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#39B54A]" />
                <span>20-35m</span>
              </div>
            </div>

            {/* CATEGORY & BRANCH DISTANCE */}
            <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-[#758681] font-medium truncate">
              <span className="truncate">{product.category}</span>
              <span className="text-slate-300">•</span>
              <span className="shrink-0 flex items-center gap-0.5 text-slate-500">
                <MapPin className="w-2.5 h-2.5 text-[#39B54A]" />
                {branchName}
              </span>
            </div>
          </div>

          {/* WEIGHT SELECTOR PILLS */}
          <div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-1">
            <div className="flex items-center gap-1 min-w-0 pl-0.5">
              <Package className="w-3 h-3 text-[#39B54A] shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-[#142B27] truncate">
                {selectedWeight === 0.5 ? '500g Pack' : '1kg Pack'}
              </span>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 bg-white p-0.5 rounded-lg border border-slate-200/60">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[11px] font-extrabold transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-[#39B54A] text-white shadow-2xs'
                      : 'text-[#758681] hover:text-[#142B27]'
                  }`}
                >
                  {w === 0.5 ? '500g' : '1kg'}
                </button>
              ))}
            </div>
          </div>

          {/* PRICE & ADD TO CART ROW */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
            
            {/* Left: Prices */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[#142B27] text-sm sm:text-lg font-black tracking-tight">
                  ₹{itemPrice}
                </span>
                {originalPrice > itemPrice && (
                  <span className="text-slate-400 font-medium text-[9px] sm:text-[11px] line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>
            </div>

            {/* Right: + ADD / Quantity Button */}
            {!isOutOfStock ? (
              <div className="shrink-0">
                {currentPackQty > 0 ? (
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="flex items-center gap-1 bg-white text-[#39B54A] border border-[#39B54A] rounded-full px-2 py-0.5 shadow-2xs h-[30px] sm:h-[34px]"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, -1)}
                      className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-100 hover:bg-[#39B54A]/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#142B27] stroke-[3]" />
                    </button>
                    <span className="text-xs font-bold px-1 min-w-3 text-center text-[#142B27]">
                      {currentPackQty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleQtyChange(e, 1)}
                      className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-[#39B54A] hover:bg-[#2EA03E] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitialAdd}
                    className="bg-[#39B54A] hover:bg-[#2EA03E] text-white font-extrabold text-xs px-3 sm:px-3.5 py-1 h-[30px] sm:h-[34px] rounded-full shadow-2xs hover:shadow-md flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="shrink-0">
                <button
                  type="button"
                  disabled
                  className="bg-slate-200 text-slate-400 font-extrabold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 h-[30px] sm:h-[34px] rounded-full cursor-not-allowed uppercase"
                >
                  Out of Stock
                </button>
              </div>
            )}

          </div>

        </div>

      </Link>
    </div>
  )
}

// Memoized ProductCard component to eliminate re-renders on parent state changes during scroll
const ProductCard = memo(ProductCardComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.available_stock === next.product.available_stock &&
    prev.product.price_per_kg === next.product.price_per_kg &&
    prev.product.name === next.product.name &&
    prev.product.image_url === next.product.image_url
  )
})

export default ProductCard
