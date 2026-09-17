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
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Back Link & Page Title */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#39B54A] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">YOUR FRESH SHOPPING CART</h1>
          <p className="text-xs text-[#0F172A]/70">
            Delivering to <span className="font-bold text-[#0F172A]">{deliveryAddress}</span> ({selectedBranch?.name || ''})

          </p>
        </div>

        {cart.length === 0 ? (
          <div className="bg-[#FFFFFF] p-8 sm:p-12 rounded-none border border-[#E2E8F0] text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#E2E8F0] rounded-none flex items-center justify-center mx-auto text-[#39B54A]">
              <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Your Cart is Currently Empty</h2>
            <p className="text-xs text-[#0F172A]/70">
              Explore today's fresh ocean fish, tender chicken, and mutton catch.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-extrabold text-xs rounded-none shadow-md"
            >
              BROWSE FRESH PRODUCTS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => {
                const itemTotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
                return (
                  <div
                    key={item.cart_key}
                    className="p-3.5 sm:p-4 bg-white rounded-none border border-[#E2E8F0] shadow-xs flex flex-col xs:flex-row gap-3 sm:gap-4 items-start xs:items-center justify-between"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <img
                        src={item.image_url || '/logo.png'}
                        alt={item.product_name}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-none bg-[#E2E8F0] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#39B54A]">
                          {item.category}
                        </span>
                        <h3 className="text-xs sm:text-sm font-extrabold text-[#0F172A] truncate">{item.product_name}</h3>
                        <p className="text-[11px] sm:text-xs text-[#0F172A]/70 mt-0.5">
                          Cut: <span className="font-bold text-[#0F172A]">{item.cleaning_option}</span> • Pack:{' '}
                          <span className="font-bold text-[#0F172A]">
                            {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                          </span>
                        </p>
                        <div className="text-[11px] sm:text-xs font-bold text-[#0F172A]/50 mt-0.5">
                          Base Price: ₹{item.price_per_kg} / kg
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between xs:justify-end gap-4 sm:gap-6 w-full xs:w-auto pt-2.5 xs:pt-0 border-t xs:border-t-0 border-[#E2E8F0]">
                      {/* QTY Control */}
                      <div className="flex items-center gap-2 bg-[#39B54A] text-white rounded-none p-1 shadow-xs">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-6 h-6 rounded-none bg-[#0F172A]/20 hover:bg-[#0F172A]/40 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-center min-w-4 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-6 h-6 rounded-none bg-[#0F172A]/20 hover:bg-[#0F172A]/40 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>

                      {/* Total & Remove */}
                      <div className="text-right">
                        <div className="text-sm font-black text-[#0F172A]">₹{itemTotal}</div>
                        <button
                          onClick={() => removeFromCart(item.cart_key)}
                          className="text-[11px] font-bold text-[#0F172A]/60 hover:text-[#0F172A] transition-colors flex items-center gap-0.5 mt-0.5 ml-auto cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="p-3.5 sm:p-4 rounded-none bg-[#39B54A]/15 border border-[#39B54A]/30 text-xs text-[#0F172A] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#39B54A] shrink-0" />
                <div>
                  <span className="font-extrabold">Bestiet Fresh Guarantee:</span> All items are custom cleaned and packed in ice cold-chain boxes right before dispatch.
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Coupon */}
            <div className="space-y-4">
              {/* Coupon Box */}
              <div className="p-4 sm:p-5 bg-white rounded-none border border-[#E2E8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#39B54A]" /> Apply Promo Coupon
                </h3>

                {appliedCoupon ? (
                  <div className="p-3 rounded-none bg-[#39B54A]/20 border border-[#39B54A]/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-[#0F172A]">'{appliedCoupon.code}' APPLIED</div>
                      <div className="text-[10px] text-[#39B54A]">Saved ₹{discountAmount} on this order</div>
                    </div>
                    <button onClick={removeCoupon} className="text-xs font-bold text-[#0F172A] hover:underline cursor-pointer">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="ENTER COUPON (e.g. BESTIET100)"
                        className="flex-1 px-3 py-2 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#39B54A] hover:bg-[#2EA03E] text-white text-xs font-bold rounded-none transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-[11px] font-medium ${
                          couponMsg.success ? 'text-[#39B54A]' : 'text-[#0F172A]'
                        }`}
                      >
                        {couponMsg.text}
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Bill Details Box */}
              <div className="p-4 sm:p-5 bg-[#E2E8F0] rounded-none border border-[#E2E8F0] shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                  Bill Details
                </h3>

                <div className="space-y-2 text-xs text-[#0F172A]/80">
                  <div className="flex justify-between">
                    <span>Item Subtotal</span>
                    <span className="font-bold text-[#0F172A]">₹{cartSubtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#39B54A] font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-[#0F172A]">
                      {deliveryFee === 0 ? (
                        <span className="text-[#39B54A] font-extrabold uppercase text-[10px]">
                          FREE (Orders ≥ ₹500)
                        </span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-[#39B54A]/20 flex justify-between text-base font-black text-[#0F172A]">
                    <span>Grand Total</span>
                    <span className="text-[#39B54A]">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full py-4 px-4 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-black rounded-none text-sm shadow-md shadow-[#39B54A]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>PROCEED TO CHECKOUT (₹{grandTotal})</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Floating Proceed to Checkout Bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-[3.5rem] inset-x-0 z-40 md:hidden p-3 px-4 bg-[#39B54A] text-white shadow-2xl flex items-center justify-between border-t border-white/20 animate-in slide-in-from-bottom duration-200">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white">
                {cart.length} ITEM{cart.length > 1 ? 'S' : ''} IN CART
              </div>
              <div className="text-xs font-black text-white">
                Total ₹{grandTotal}{' '}
                <span className="text-[10px] font-normal opacity-90">
                  ({deliveryFee === 0 ? 'Free Delivery' : `+ ₹${deliveryFee} Delivery`})
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="py-2.5 px-4 bg-white text-[#0F172A] font-black rounded-none text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>PROCEED TO CHECKOUT</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#39B54A]" />
            </button>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
