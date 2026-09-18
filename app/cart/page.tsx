'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShoppingBag, ArrowLeft, ArrowRight, Plus, Minus, Trash2, Tag, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

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
          <EmptyState
            icon={ShoppingBag}
            title="Your Cart is Currently Empty"
            description="Explore today's fresh ocean fish, tender chicken, and mutton catch."
            actionLabel="BROWSE FRESH PRODUCTS"
            actionHref="/"
            className="my-10 max-w-md mx-auto"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => {
                const itemTotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
                return (
                  <div
                    key={item.cart_key}
                    className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col xs:flex-row gap-4 items-start xs:items-center justify-between hover:border-slate-200 transition-all"
                  >
                    <div className="flex gap-3.5 items-center min-w-0">
                      <img
                        src={item.image_url || '/logo.png'}
                        alt={item.product_name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#39B54A]">
                          {item.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">{item.product_name}</h3>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Cut: <span className="font-extrabold text-slate-900">{item.cleaning_option}</span> • Pack:{' '}
                          <span className="font-extrabold text-slate-900">
                            {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                          </span>
                        </p>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">
                          Base Price: ₹{item.price_per_kg} / kg
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between xs:justify-end gap-4 sm:gap-6 w-full xs:w-auto pt-3 xs:pt-0 border-t xs:border-t-0 border-slate-100">
                      {/* QTY Control */}
                      <div className="flex items-center gap-2 bg-[#39B54A] text-white rounded-xl p-1 shadow-2xs">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                        >
                          <Minus className="w-3.5 h-3.5 text-white" />
                        </button>
                        <span className="text-xs font-black px-1.5 text-center min-w-4 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>

                      {/* Total & Remove */}
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">₹{itemTotal}</div>
                        <button
                          onClick={() => removeFromCart(item.cart_key)}
                          className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 mt-0.5 ml-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="p-4 rounded-2xl bg-[#39B54A]/10 border border-[#39B54A]/20 text-xs text-slate-800 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#39B54A] shrink-0" />
                <div>
                  <span className="font-extrabold">Bestiet Fresh Guarantee:</span> All items are custom cleaned and packed in temperature-controlled ice boxes right before dispatch.
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Coupon */}
            <div className="space-y-4">
              {/* Coupon Box */}
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#39B54A]" /> Apply Promo Coupon
                </h3>

                {appliedCoupon ? (
                  <div className="p-3.5 rounded-xl bg-[#39B54A]/10 border border-[#39B54A]/20 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-black text-slate-900">'{appliedCoupon.code}' APPLIED</div>
                      <div className="text-xs text-[#39B54A] font-bold">Saved ₹{discountAmount} on this order</div>
                    </div>
                    <button onClick={removeCoupon} className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer">
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
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#39B54A] hover:bg-[#2ea03e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-xs font-semibold ${
                          couponMsg.success ? 'text-[#39B54A]' : 'text-rose-600'
                        }`}
                      >
                        {couponMsg.text}
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Bill Details Box */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Bill Details
                </h3>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Item Subtotal</span>
                    <span className="font-bold text-slate-900">₹{cartSubtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#39B54A] font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-slate-900">
                      {deliveryFee === 0 ? (
                        <span className="text-[#39B54A] font-black uppercase text-[10px]">
                          FREE (Orders ≥ ₹500)
                        </span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                    <span>Grand Total</span>
                    <span className="text-[#39B54A]">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full py-3.5 px-4 bg-[#39B54A] hover:bg-[#2ea03e] text-white font-extrabold rounded-xl text-sm shadow-md shadow-[#39B54A]/25 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
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
          <div className="fixed bottom-[3.75rem] inset-x-0 z-40 md:hidden p-3 px-4 bg-[#39B54A] text-white shadow-2xl rounded-t-2xl flex items-center justify-between border-t border-white/20 animate-fade-in-up">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                {cart.length} ITEM{cart.length > 1 ? 'S' : ''} IN CART
              </div>
              <div className="text-xs font-black text-white">
                Total ₹{grandTotal}{' '}
                <span className="text-[10px] font-medium opacity-90">
                  ({deliveryFee === 0 ? 'Free Delivery' : `+ ₹${deliveryFee} Delivery`})
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="py-2 px-3.5 bg-white text-slate-900 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>CHECKOUT</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#39B54A]" />
            </button>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
