'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShoppingBag, ArrowLeft, ArrowRight, Plus, Minus, Trash2, Tag, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    selectedBranch,
    deliveryAddress,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartSubtotal,
    discountAmount,
    deliveryFee,
    grandTotal,
  } = useCustomer()

  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const res = applyCoupon(couponInput)
    setCouponMsg({ success: res.success, text: res.message })
    if (res.success) setCouponInput('')
  }

  return (
    <StorefrontLayout>
      <div className="space-y-6">
        {/* Back Link & Page Title */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#232B1E]/70 hover:text-[#8B9A6E] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-2xl font-black text-[#232B1E] tracking-tight">YOUR FRESH SHOPPING CART</h1>
          <p className="text-xs text-[#232B1E]/70">
            Delivering to <span className="font-bold text-[#232B1E]">{deliveryAddress}</span> ({selectedBranch?.name || ''})

          </p>
        </div>

        {cart.length === 0 ? (
          <div className="bg-[#F7F2EB] p-12 rounded-3xl border border-[#EEEEEE] text-center space-y-4 max-w-md mx-auto">
            <div className="w-20 h-20 bg-[#EEEEEE] rounded-full flex items-center justify-center mx-auto text-[#8B9A6E]">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-extrabold text-[#232B1E]">Your Cart is Currently Empty</h2>
            <p className="text-xs text-[#232B1E]/70">
              Explore today's fresh ocean fish, tender chicken, and mutton catch.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold text-xs rounded-xl shadow-md"
            >
              BROWSE FRESH PRODUCTS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => {
                const itemTotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
                return (
                  <div
                    key={item.cart_key}
                    className="p-4 bg-white rounded-2xl border border-[#EEEEEE] shadow-xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src={item.image_url || '/logo.png'}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-xl bg-[#EEEEEE] shrink-0"
                      />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8B9A6E]">
                          {item.category}
                        </span>
                        <h3 className="text-sm font-extrabold text-[#232B1E]">{item.product_name}</h3>
                        <p className="text-xs text-[#232B1E]/70 mt-0.5">
                          Cut: <span className="font-bold text-[#232B1E]">{item.cleaning_option}</span> • Pack:{' '}
                          <span className="font-bold text-[#232B1E]">
                            {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                          </span>
                        </p>
                        <div className="text-xs font-bold text-[#232B1E]/50 mt-0.5">
                          Base Price: ₹{item.price_per_kg} / kg
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EEEEEE]">
                      {/* QTY Control */}
                      <div className="flex items-center gap-2 bg-[#8B9A6E] text-white rounded-xl p-1 shadow-xs">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-6 h-6 rounded-lg bg-[#232B1E]/20 hover:bg-[#232B1E]/40 flex items-center justify-center text-white"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-center min-w-4 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-6 h-6 rounded-lg bg-[#232B1E]/20 hover:bg-[#232B1E]/40 flex items-center justify-center text-white"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>

                      {/* Total & Remove */}
                      <div className="text-right">
                        <div className="text-sm font-black text-[#232B1E]">₹{itemTotal}</div>
                        <button
                          onClick={() => removeFromCart(item.cart_key)}
                          className="text-[11px] font-bold text-[#232B1E]/60 hover:text-[#232B1E] transition-colors flex items-center gap-0.5 mt-0.5 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="p-4 rounded-2xl bg-[#8B9A6E]/15 border border-[#8B9A6E]/30 text-xs text-[#232B1E] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#8B9A6E] shrink-0" />
                <div>
                  <span className="font-extrabold">Bestiet Fresh Guarantee:</span> All items are custom cleaned and packed in ice cold-chain boxes right before dispatch.
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Coupon */}
            <div className="space-y-4">
              {/* Coupon Box */}
              <div className="p-5 bg-white rounded-2xl border border-[#EEEEEE] shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#232B1E] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#8B9A6E]" /> Apply Promo Coupon
                </h3>

                {appliedCoupon ? (
                  <div className="p-3 rounded-xl bg-[#8B9A6E]/20 border border-[#8B9A6E]/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-[#232B1E]">'{appliedCoupon.code}' APPLIED</div>
                      <div className="text-[10px] text-[#8B9A6E]">Saved ₹{discountAmount} on this order</div>
                    </div>
                    <button onClick={removeCoupon} className="text-xs font-bold text-[#232B1E] hover:underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="ENTER COUPON (e.g. BESTIET100)"
                        className="flex-1 px-3 py-2 bg-[#EEEEEE] border border-[#EEEEEE] rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A6E] text-[#232B1E]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#8B9A6E] hover:bg-[#7A895D] text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-[11px] font-medium ${
                          couponMsg.success ? 'text-[#8B9A6E]' : 'text-[#232B1E]'
                        }`}
                      >
                        {couponMsg.text}
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Bill Details Box */}
              <div className="p-5 bg-[#EEEEEE] rounded-2xl border border-[#EEEEEE] shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#232B1E]">
                  Bill Details
                </h3>

                <div className="space-y-2 text-xs text-[#232B1E]/80">
                  <div className="flex justify-between">
                    <span>Item Subtotal</span>
                    <span className="font-bold text-[#232B1E]">₹{cartSubtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#8B9A6E] font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-[#232B1E]">
                      {deliveryFee === 0 ? (
                        <span className="text-[#8B9A6E] font-extrabold uppercase text-[10px]">
                          FREE
                        </span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-[#8B9A6E]/20 flex justify-between text-base font-black text-[#232B1E]">
                    <span>Grand Total</span>
                    <span className="text-[#8B9A6E]">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full py-3.5 px-4 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold rounded-xl text-sm shadow-md shadow-[#8B9A6E]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
