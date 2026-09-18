'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, Star } from 'lucide-react'

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

  return (
    <div className="group flex flex-col justify-between bg-white border border-slate-100 hover:border-[#39B54A]/30 rounded-2xl p-2.5 sm:p-3 shadow-xs hover-lift transition-all animate-fade-in-up h-full">
      <Link href={`/product/${product.id}`} className="flex flex-col justify-between h-full">
        {/* 1. PRODUCT IMAGE CONTAINER */}
        <div className="relative aspect-[4/3] w-full bg-slate-100 rounded-xl overflow-hidden shadow-2xs">
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

          {/* Inventory Stock Badge (Kg Left) */}
          {!isOutOfStock ? (
            <span className="absolute top-2 left-2 z-10 bg-[#39B54A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {product.available_stock} kg left
            </span>
          ) : (
            <span className="absolute top-2 left-2 z-10 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
              Sold Out
            </span>
          )}

          {/* Out of stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}

          {/* FLOATING ADD / QTY BUTTON AT BOTTOM-RIGHT OF IMAGE */}
          {!isOutOfStock && (
            <div className="absolute bottom-2 right-2 z-20">
              {currentPackQty > 0 ? (
                <div
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="flex items-center gap-1.5 bg-white text-[#39B54A] border-2 border-[#39B54A] rounded-xl px-2 py-1 shadow-md animate-scale-up"
                >
                  <button
                    type="button"
                    onClick={(e) => handleQtyChange(e, -1)}
                    className="w-5 h-5 rounded-lg bg-slate-100 hover:bg-[#39B54A]/20 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  >
                    <Minus className="w-3 h-3 text-slate-800 stroke-[3]" />
                  </button>
                  <span className="text-xs font-black px-1 min-w-4 text-center text-slate-900">
                    {currentPackQty}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleQtyChange(e, 1)}
                    className="w-5 h-5 rounded-lg bg-[#39B54A] hover:bg-[#2ea03e] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3 h-3 text-white stroke-[3]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInitialAdd}
                  className="bg-white hover:bg-[#39B54A] border-2 border-[#39B54A] text-[#39B54A] hover:text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider active:scale-95"
                >
                  ADD
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. CARD CONTENT BELOW IMAGE */}
        <div className="mt-2.5 space-y-1.5 flex flex-col justify-between flex-1">
          <div>
            {/* PRICE ROW */}
            <div className="flex items-center gap-2">
              <span className="bg-[#39B54A] text-white text-sm sm:text-base font-black px-2.5 py-0.5 rounded-lg shadow-2xs">
                ₹{itemPrice}
              </span>
              {originalPrice > itemPrice && (
                <span className="text-slate-400 font-bold text-xs line-through">
                  ₹{originalPrice}
                </span>
              )}
            </div>

            {/* SAVINGS TAG */}
            {savings > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[#39B54A] font-extrabold text-[11px] tracking-tight">
                  Save ₹{savings}
                </span>
                <div className="flex-1 border-b border-dashed border-slate-200"></div>
              </div>
            )}

            {/* PRODUCT TITLE */}
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-[#39B54A] transition-colors pt-1">
              {product.name}
            </h3>
          </div>

          <div>
            {/* PACK SIZE / WEIGHT & QUICK WEIGHT TOGGLE */}
            <div className="flex items-center justify-between gap-1 text-slate-500 text-[11px] font-semibold pt-1 border-t border-slate-50">
              <span>{selectedWeight === 0.5 ? '500 g pack' : '1 kg pack'}</span>

              {/* Quick Weight Selector */}
              <div className="flex items-center gap-1">
                {[0.5, 1.0].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedWeight(w)
                    }}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      selectedWeight === w
                        ? 'bg-[#39B54A] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-[#39B54A]/20'
                    }`}
                  >
                    {w === 0.5 ? '500g' : '1kg'}
                  </button>
                ))}
              </div>
            </div>

            {/* RATING BADGE */}
            <div className="flex items-center gap-1 text-[11px] pt-1">
              <Star className="w-3.5 h-3.5 fill-[#39B54A] text-[#39B54A]" />
              <span className="font-extrabold text-slate-900">{ratingScore}</span>
              <span className="text-slate-400 font-medium">({reviewCount})</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
