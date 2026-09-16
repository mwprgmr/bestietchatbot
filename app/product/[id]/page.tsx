'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { getProductImagePlaceholder, CLEANING_OPTIONS, WEIGHT_OPTIONS } from '@/lib/data/ecommerce-data'
import { ArrowLeft, Plus, Minus, ShoppingBag, ShieldCheck, Truck, Sparkles, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id as string
  const { selectedBranch, addToCart, setIsCartOpen } = useCustomer()

  const [product, setProduct] = useState<any>(null)
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [selectedWeight, setSelectedWeight] = useState<number>(1.0) // 1kg default
  const [selectedCut, setSelectedCut] = useState<string>('Curry Cut')
  const [packQuantity, setPackQuantity] = useState<number>(1)

  useEffect(() => {
    async function loadProductDetails() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: p } = await supabase.from('products').select('*').eq('id', productId).single()
        if (p) {
          setProduct(p)
          const categoryCuts = CLEANING_OPTIONS[p.category] || CLEANING_OPTIONS['Fish']
          setSelectedCut(categoryCuts[0])
        }

        const { data: inv } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId)
          .eq('branch_id', selectedBranch.id)
          .maybeSingle()

        setInventory(inv)
      } catch (err) {
        console.error('Error loading product details:', err)
      } finally {
        setLoading(false)
      }
    }

    if (productId) loadProductDetails()
  }, [productId, selectedBranch.id])

  if (loading) {
    return (
      <StorefrontLayout>
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Fresh Product Details...
          </p>
        </div>
      </StorefrontLayout>
    )
  }

  if (!product) {
    return (
      <StorefrontLayout>
        <div className="py-16 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">The product you are looking for is unavailable.</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
          >
            Return to Storefront
          </Link>
        </div>
      </StorefrontLayout>
    )
  }

  const pricePerKg = inventory?.price_per_kg ? Number(inventory.price_per_kg) : 450
  const availableStock = inventory?.available_stock !== undefined ? Number(inventory.available_stock) : 20
  const isOutOfStock = availableStock <= 0

  const calculatedPackPrice = Math.round(pricePerKg * selectedWeight)
  const originalPackPrice = Math.round(calculatedPackPrice * 1.25)
  const totalItemPrice = Math.round(calculatedPackPrice * packQuantity)

  const cuts = CLEANING_OPTIONS[product.category] || CLEANING_OPTIONS['Fish']
  const imageSrc = product.image_url || getProductImagePlaceholder(product.category, product.name)

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addToCart({
      product_id: product.id,
      product_name: product.name,
      image_url: imageSrc,
      category: product.category || 'Fish',
      unit: product.unit || 'kg',
      price_per_kg: pricePerKg,
      weight_kg: selectedWeight,
      quantity: packQuantity,
      cleaning_option: selectedCut,
      available_stock: availableStock,
    })
  }

  const handleBuyNow = () => {
    handleAddToCart()
    setIsCartOpen(false)
    router.push('/checkout')
  }

  return (
    <StorefrontLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          {/* Left Column: Product Imagery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] h-64 sm:h-80 w-full rounded-2xl bg-[#F7F8F5] overflow-hidden border border-slate-200/60">
              <img
                src={imageSrc}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                  <span className="bg-slate-900 text-white text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Currently Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Quality Guarantee Box */}
            <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200/80 space-y-2 text-xs text-slate-600">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bestiet Fresh Guarantee</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-500 list-disc list-inside">
                <li>100% chemical & ammonia free fresh catch</li>
                <li>Custom cleaned & cut right before packing</li>
                <li>Cold-chain delivered to preserve taste & freshness</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Product Details & Controls */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                {product.category} • {selectedBranch.name.replace(' Branch', '')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {product.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1.5">
                {product.description || `Fresh, high quality ${product.name} sourced daily.`}
              </p>
            </div>

            {/* Pricing Summary */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">₹{calculatedPackPrice}</span>
                  <span className="text-xs text-slate-400 line-through">₹{originalPackPrice}</span>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Base Price: ₹{pricePerKg} / kg
                </p>
              </div>

              {/* Stock Status Indicator */}
              <div className="text-right">
                {isOutOfStock ? (
                  <span className="text-xs font-extrabold text-red-600 uppercase">Out of Stock</span>
                ) : (
                  <span className="text-xs font-extrabold text-emerald-700 uppercase flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> In Stock ({availableStock} kg)
                  </span>
                )}
              </div>
            </div>

            {/* Select Weight Options */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                1. Select Weight / Pack Size:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {WEIGHT_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => setSelectedWeight(w.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                      selectedWeight === w.value
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Cleaning & Cutting Options */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                2. Select Cleaning & Cut Preference:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cuts.map((cut) => (
                  <button
                    key={cut}
                    type="button"
                    onClick={() => setSelectedCut(cut)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                      selectedCut === cut
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-500 font-extrabold shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>{cut}</span>
                    {selectedCut === cut && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pack Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                3. Pack Count:
              </label>
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setPackQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-extrabold px-2">{packQuantity}</span>
                <button
                  onClick={() => setPackQuantity((q) => Math.min(10, q + 1))}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ADD TO CART (₹{totalItemPrice})</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="py-3 px-4 bg-[#101814] hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>BUY NOW</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  )
}
