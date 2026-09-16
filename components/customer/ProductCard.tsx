'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getProductImagePlaceholder } from '@/lib/data/ecommerce-data'
import { Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react'

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
}

export default function ProductCard({ product }: { product: ProductProps }) {
  const { cart, addToCart, updateCartQuantity } = useCustomer()
  const [selectedWeight, setSelectedWeight] = useState<number>(0.5) // 500g default

  const imageSrc = product.image_url || getProductImagePlaceholder(product.category, product.name)
  const defaultCut = product.default_cut || (product.category === 'Chicken' ? 'Curry Cut' : product.category === 'Mutton' ? 'Curry Cut' : 'Cleaned & Cut')

  // Calculate cart key for default variant
  const cartKey = `${product.id}_${defaultCut.replace(/\s+/g, '_')}_${selectedWeight}`
  const existingCartItem = cart.find((i) => i.cart_key === cartKey)
  const currentPackQty = existingCartItem ? existingCartItem.quantity : 0

  const isOutOfStock = product.available_stock <= 0
  const isLowStock = product.available_stock > 0 && product.available_stock <= 3

  // Calculated item price
  const itemPrice = Math.round(product.price_per_kg * selectedWeight)
  const originalPrice = product.original_price_per_kg
    ? Math.round(product.original_price_per_kg * selectedWeight)
    : Math.round(itemPrice * 1.2)
  const discountPercent = Math.round(((originalPrice - itemPrice) / originalPrice) * 100)

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
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all overflow-hidden flex flex-col justify-between relative">
      {/* Product Link Wrapper */}
      <Link href={`/product/${product.id}`} className="block relative">
        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {discountPercent > 0 && !isOutOfStock && (
            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              Only {product.available_stock} kg left
            </span>
          )}
        </div>

        {/* Product Image */}
        <div className="relative aspect-4/3 w-full bg-[#F7F8F5] overflow-hidden">
          <img
            src={imageSrc}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              isOutOfStock ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-slate-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">
              {product.category} • {defaultCut}
            </div>
            <h3 className="text-sm font-extrabold text-[#101814] group-hover:text-emerald-700 transition-colors line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              {product.description || `Fresh ${product.name} delivered to your door`}
            </p>
          </div>

          {/* Weight Selection Chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[0.5, 1.0].map((w) => (
              <button
                key={w}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedWeight(w)
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  selectedWeight === w
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-[#F7F8F5] text-slate-600 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                {w === 0.5 ? '500g' : '1 kg'}
              </button>
            ))}
          </div>

          {/* Pricing & Add Control Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-[#101814]">₹{itemPrice}</span>
                {originalPrice > itemPrice && (
                  <span className="text-xs text-slate-400 line-through">₹{originalPrice}</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                (₹{product.price_per_kg}/kg)
              </span>
            </div>

            {/* QTY / ADD Button */}
            {isOutOfStock ? (
              <button
                disabled
                className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed border border-slate-200"
              >
                Unavailable
              </button>
            ) : currentPackQty > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-700 text-white rounded-xl p-1 shadow-md shadow-emerald-700/20">
                <button
                  type="button"
                  onClick={(e) => handleQtyChange(e, -1)}
                  className="w-6 h-6 rounded-lg bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="text-xs font-extrabold px-1 min-w-4 text-center">
                  {currentPackQty}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleQtyChange(e, 1)}
                  className="w-6 h-6 rounded-lg bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInitialAdd}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs shadow-emerald-600/20 hover:shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
