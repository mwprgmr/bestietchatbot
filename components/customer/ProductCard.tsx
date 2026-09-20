'use client'

import React, { useState, memo, useCallback } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, Heart, Leaf, Package } from 'lucide-react'

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

  // Description text (fallback if empty)
  const descriptionText = product.description || `Fresh ${product.category.toLowerCase()} cut with hygienic precision, preserved in ice & cold-chain delivered.`

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
    <div className="group relative bg-white border border-slate-100 hover:border-[#7FBA44]/40 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full transform-gpu contain-render">
      <Link href={`/product/${product.id}`} className="flex flex-col h-full">
        
        <div>
          {/* 1. PRODUCT IMAGE CONTAINER */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100/80 mb-1.5 sm:mb-2 group-hover:shadow-xs transition-shadow">
            <img
              src={imageSrc}
              alt={product.name}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = '/logo.png'
              }}
              className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
                isOutOfStock ? 'grayscale opacity-60 blur-[1px]' : ''
              }`}
              loading="lazy"
              decoding="async"
            />

            {/* STOCK BADGE */}
            {!isOutOfStock ? (
              <div className="absolute top-1.5 left-1.5 z-10 bg-[#7FBA44] text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                <Leaf className="w-2.5 h-2.5 text-white fill-white/40" />
                <span>{product.available_stock}kg</span>
              </div>
            ) : (
              <div className="absolute top-1.5 left-1.5 z-10 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold shadow-2xs">
                Sold Out
              </div>
            )}

            {/* WISHLIST HEART BUTTON */}
            <button
              type="button"
              onClick={toggleFavorite}
              className="absolute top-1.5 right-1.5 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-rose-500 shadow-2xs transition-all active:scale-90 cursor-pointer"
              aria-label="Save to Wishlist"
            >
              <Heart
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-500 hover:text-rose-500'
                }`}
              />
            </button>

            {/* DISCOUNT BADGE OVERLAY */}
            {savings > 0 && !isOutOfStock && (
              <div className="absolute bottom-1.5 left-1.5 z-10 bg-[#7FBA44] text-white font-black text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-lg shadow-2xs uppercase tracking-tight">
                SAVE ₹{savings}
              </div>
            )}

            {/* OUT OF STOCK OVERLAY */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-20 p-1 text-center">
                <span className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                  OUT OF STOCK
                </span>
              </div>
            )}
          </div>

          {/* 2. TITLE & PRICE BADGE ROW */}
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <h3 className="font-bold text-[#0F172A] text-xs sm:text-sm leading-tight tracking-tight line-clamp-1 group-hover:text-[#7FBA44] transition-colors capitalize">
              {product.name}
            </h3>
            <div className="shrink-0 bg-[#7FBA44] text-white font-black text-[11px] sm:text-xs px-2 py-0.5 rounded-full shadow-2xs">
              ₹{itemPrice}
            </div>
          </div>

          {/* 3. DESCRIPTION / SUBTITLE */}
          <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight line-clamp-1 mb-1.5">
            {descriptionText}
          </p>

          {/* 4. PILL BADGES ROW (PACK SELECTOR & STOCK) */}
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            {/* 500g / 1kg Pack Pill Toggle */}
            <div className="flex items-center bg-[#7FBA44]/10 border border-[#7FBA44]/20 rounded-full p-0.5">
              {[0.5, 1.0].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedWeight(w)
                  }}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-[#7FBA44] text-white shadow-2xs'
                      : 'text-[#7FBA44] hover:bg-[#7FBA44]/20'
                  }`}
                >
                  {w === 0.5 ? '500g' : '1kg'}
                </button>
              ))}
            </div>

            {/* Stock Left Pill */}
            <span className="bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Package className="w-2.5 h-2.5 text-[#7FBA44]" />
              {product.available_stock} left
            </span>
          </div>
        </div>

        {/* 5. FULL-WIDTH "ADD TO CART" PILL BUTTON */}
        <div className="mt-auto pt-1">
          {!isOutOfStock ? (
            currentPackQty > 0 ? (
              <div
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="w-full flex items-center justify-between bg-[#7FBA44] text-white font-bold rounded-full px-2.5 py-1 shadow-sm"
              >
                <button
                  type="button"
                  onClick={(e) => handleQtyChange(e, -1)}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer active:scale-95 text-white"
                >
                  <Minus className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="text-xs font-extrabold px-1 text-white">
                  {currentPackQty} in Cart
                </span>
                <button
                  type="button"
                  onClick={(e) => handleQtyChange(e, 1)}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer active:scale-95 text-white"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInitialAdd}
                className="w-full bg-[#7FBA44] hover:bg-[#71A83A] text-white font-black text-xs py-2 sm:py-2.5 rounded-full shadow-sm hover:shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <span>Add to cart</span>
              </button>
            )
          ) : (
            <button
              type="button"
              disabled
              className="w-full bg-slate-200 text-slate-400 font-bold text-[11px] py-2 sm:py-2.5 rounded-full cursor-not-allowed uppercase"
            >
              Out of Stock
            </button>
          )}
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
