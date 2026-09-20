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

  const [selectedWeight, setSelectedWeight] = useState<number>(1.0)
  const [selectedCut, setSelectedCut] = useState<string>('Curry Cut')
  const [packQuantity, setPackQuantity] = useState<number>(1)

  useEffect(() => {
    async function loadProductDetails() {
      setLoading(true)
      try {
        const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'
        let fetchedProduct: any = null
        let fetchedInv: any = null

        // 1. Try secure API route first (service role)
        try {
          const res = await fetch(`/api/products?id=${productId}&branch_id=${targetBranchId}&t=${Date.now()}`, {
            cache: 'no-store',
          })
          const apiData = await res.json()
          if (apiData?.success && (apiData.product || (Array.isArray(apiData.products) && apiData.products[0]))) {
            fetchedProduct = apiData.product || apiData.products[0]
          }
        } catch (apiErr) {
          console.warn('API product details fetch warning:', apiErr)
        }

        // 2. Fallback to client query if API returned null
        const supabase = createClient()
        if (!fetchedProduct) {
          const { data: p } = await supabase.from('products').select('*').eq('id', productId).single()
          if (p) fetchedProduct = p
        }

        if (fetchedProduct) {
          setProduct(fetchedProduct)
          const categoryCuts = CLEANING_OPTIONS[fetchedProduct.category] || CLEANING_OPTIONS['Fish']
          setSelectedCut(categoryCuts[0])
        }

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        const { data: invList } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId)
          .eq('branch_id', targetBranchId)
          .lte('inventory_date', todayStr)
          .order('inventory_date', { ascending: false })

        const todayInv = (invList || []).find((i) => i.inventory_date === todayStr)
        fetchedInv = todayInv || null

        setInventory(fetchedInv)
      } catch (err) {
        console.error('Error loading product details:', err)
      } finally {
        setLoading(false)
      }
    }

    if (productId) loadProductDetails()
  }, [productId, selectedBranch?.id])

  if (loading) {
    return (
      <StorefrontLayout>
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#7FBA44] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">
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
          <AlertCircle className="w-10 h-10 text-[#7FBA44] mx-auto" />
          <h2 className="text-lg font-extrabold text-[#0F172A]">Product Not Found</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7FBA44] text-white font-extrabold text-xs hover:bg-[#71A83A] transition-all"
          >
            Return to Storefront
          </Link>
        </div>
      </StorefrontLayout>
    )
  }

  const pricePerKg = inventory?.price_per_kg ? Number(inventory.price_per_kg) : 450
  const availableStock = inventory && inventory.available_stock !== undefined && inventory.available_stock !== null
    ? Math.max(0, Number(inventory.available_stock))
    : 0
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#7FBA44] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs">
          {/* Left Column: Product Imagery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] h-64 sm:h-80 w-full rounded-2xl bg-white overflow-hidden border border-[#E2E8F0]">
              <img
                src={imageSrc}
                alt={product.name}
                className={`w-full h-full object-cover object-center ${
                  isOutOfStock ? 'grayscale opacity-60 blur-[2px]' : ''
                }`}
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-rose-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg border border-white/20">
                    OUT OF STOCK
                  </span>
                </div>
              )}
            </div>

            {/* Quality Guarantee Box */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2 text-xs text-[#0F172A]/80">
              <div className="font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#7FBA44]" />
                <span>Bestiet Fresh Guarantee</span>
              </div>
              <ul className="space-y-1 text-[11px] text-[#0F172A]/70 list-disc list-inside">
                <li>100% chemical & ammonia free fresh catch</li>
                <li>Custom cleaned & cut right before packing</li>
                <li>Cold-chain delivered to preserve taste & freshness</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Product Details & Controls */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#7FBA44]">
                {product.category} • {selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : ''}

              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1">
                {product.name}
              </h1>
              <p className="text-xs text-[#0F172A]/70 mt-1.5">
                {product.description || `Fresh, high quality ${product.name} sourced daily.`}
              </p>
            </div>

            {/* Pricing Summary */}
            <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#0F172A]">₹{calculatedPackPrice}</span>
                  <span className="text-xs text-[#0F172A]/50 line-through">₹{originalPackPrice}</span>
                  <span className="text-xs font-extrabold text-[#7FBA44] bg-[#7FBA44]/15 px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </div>
                <p className="text-[11px] text-[#0F172A]/70 font-medium mt-0.5">
                  Base Price: ₹{pricePerKg} / kg
                </p>
              </div>

              {/* Stock Status Indicator */}
              <div className="text-right">
                {isOutOfStock ? (
                  <span className="text-xs font-extrabold text-[#0F172A] uppercase">Out of Stock</span>
                ) : (
                  <span className="text-xs font-extrabold text-[#7FBA44] uppercase flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> In Stock ({availableStock} kg)
                  </span>
                )}
              </div>
            </div>

            {/* Select Weight Options */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
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
                        ? 'bg-[#7FBA44] text-white border-[#7FBA44] shadow-xs'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#7FBA44]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Cleaning & Cutting Options */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
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
                        ? 'bg-[#7FBA44]/15 text-[#0F172A] border-[#7FBA44] font-extrabold shadow-2xs'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#7FBA44]'
                    }`}
                  >
                    <span>{cut}</span>
                    {selectedCut === cut && <Check className="w-3.5 h-3.5 text-[#7FBA44]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pack Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Pack Count:
              </label>
              <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-[#E2E8F0]">
                <button
                  onClick={() => setPackQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-[#E2E8F0] hover:bg-[#7FBA44]/20 flex items-center justify-center font-bold text-[#0F172A] shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-extrabold px-2 text-[#0F172A]">{packQuantity}</span>
                <button
                  onClick={() => setPackQuantity((q) => Math.min(10, q + 1))}
                  className="w-7 h-7 rounded-lg bg-[#E2E8F0] hover:bg-[#7FBA44]/20 flex items-center justify-center font-bold text-[#0F172A] shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="py-3 px-4 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-extrabold rounded-xl text-xs shadow-md shadow-[#7FBA44]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ADD TO CART (₹{totalItemPrice})</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="py-3 px-4 bg-[#0F172A] hover:bg-[#1A2016] text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
