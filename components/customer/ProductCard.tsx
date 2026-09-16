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

  const imageSrc = product.image_url || getProductImagePlaceholder(product.category, product.name)
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
    <div className="group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 animate-fade-in-up">
      <Link href={`/product/${product.id}`} className="block relative group">
        {/* 1. PRODUCT IMAGE CONTAINER (Boxy design) */}
        <div className="relative aspect-[4/3] h-44 sm:h-52 w-full bg-[#EEEEEE] rounded-none overflow-hidden border border-[#EEEEEE] shadow-xs group-hover:shadow-md transition-shadow">
          <img
            src={imageSrc}
            alt={product.name}
            className={`w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out ${
              isOutOfStock ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />

          {/* Low Stock Badge */}
          {isLowStock && !isOutOfStock && (
            <span className="absolute top-2 left-2 z-10 bg-[#8B9A6E] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-none shadow-xs">
              Only {product.available_stock} kg left
            </span>
          )}

          {/* Out of stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-[#232B1E]/60 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-[#232B1E] text-white text-[10px] font-extrabold px-3 py-1 rounded-none uppercase tracking-wider border border-[#8B9A6E]">
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
                  className="flex items-center gap-1.5 bg-[#F7F2EB] text-[#8B9A6E] border-2 border-[#8B9A6E] rounded-none px-2 py-1 shadow-lg"
                >
                  <button
                    type="button"
                    onClick={(e) => handleQtyChange(e, -1)}
                    className="w-5 h-5 rounded-none bg-[#EEEEEE] hover:bg-[#8B9A6E]/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3 text-[#232B1E] stroke-[3]" />
                  </button>
                  <span className="text-xs font-black px-1 min-w-4 text-center text-[#232B1E]">
                    {currentPackQty}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleQtyChange(e, 1)}
                    className="w-5 h-5 rounded-none bg-[#8B9A6E] hover:bg-[#7A895D] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-white stroke-[3]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInitialAdd}
                  className="bg-[#F7F2EB] hover:bg-[#EEEEEE] border-2 border-[#8B9A6E] text-[#8B9A6E] font-black text-xs md:text-sm px-3.5 sm:px-4 py-1.5 rounded-none shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  ADD
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. CARD CONTENT BELOW IMAGE */}
        <div className="mt-2.5 space-y-1">
          {/* PRICE ROW: Sage Solid Badge + Strikethrough Price */}
          <div className="flex items-center gap-2">
            <span className="bg-[#8B9A6E] text-white text-base md:text-lg font-black px-2.5 py-0.5 rounded-none shadow-2xs">
              ₹{itemPrice}
            </span>
            {originalPrice > itemPrice && (
              <span className="text-[#232B1E]/60 font-bold text-xs md:text-sm line-through">
                ₹{originalPrice}
              </span>
            )}
          </div>

          {/* SAVINGS TAG + DASHED DIVIDER LINE */}
          {savings > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[#8B9A6E] font-black text-xs tracking-tight">
                ₹{savings} OFF
              </span>
              <div className="flex-1 border-b border-dashed border-[#EEEEEE]"></div>
            </div>
          )}

          {/* PRODUCT TITLE */}
          <h3 className="font-bold text-[#232B1E] text-sm md:text-base leading-snug line-clamp-2 group-hover:text-[#8B9A6E] transition-colors pt-1">
            {product.name}
          </h3>

          {/* PACK SIZE / WEIGHT & QUICK WEIGHT TOGGLE */}
          <div className="flex items-center justify-between gap-1 text-[#232B1E]/70 text-xs font-medium pt-0.5">
            <span>1 pack ({selectedWeight === 0.5 ? '450 g' : '1 kg'})</span>

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
                  className={`px-1.5 py-0.5 rounded-none text-[10px] font-bold transition-all ${
                    selectedWeight === w
                      ? 'bg-[#8B9A6E] text-white'
                      : 'bg-[#EEEEEE] text-[#232B1E] hover:bg-[#8B9A6E]/20'
                  }`}
                >
                  {w === 0.5 ? '450g' : '1kg'}
                </button>
              ))}
            </div>
          </div>

          {/* RATING BADGE: Sage Star Icon + Score + Count */}
          <div className="flex items-center gap-1 text-xs pt-1">
            <Star className="w-3.5 h-3.5 fill-[#8B9A6E] text-[#8B9A6E]" />
            <span className="font-bold text-[#232B1E]">{ratingScore}</span>
            <span className="text-[#232B1E]/60 font-medium">({reviewCount})</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
