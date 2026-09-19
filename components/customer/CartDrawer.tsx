'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Tag, CheckCircle2, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function CartDrawer() {
  const router = useRouter()
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    isCartOpen,
    setIsCartOpen,
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

  const [couponCode, setCouponCode] = useState('')
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null)

  if (!isCartOpen) return null

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const res = applyCoupon(couponCode)
    setCouponMsg({ success: res.success, text: res.message })
    if (res.success) setCouponCode('')
  }

  const handleProceedCheckout = () => {
    setIsCartOpen(false)
    router.push('/checkout')
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full sm:w-auto animate-slide-in-right">
        <div className="w-full sm:w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full max-h-dvh justify-between">
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#7FBA44]/10 text-[#7FBA44]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Your Fresh Cart</h3>
                <p className="text-xs font-semibold text-slate-500">{cart.length} item(s) selected</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Delivery Bar */}
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
            <div className="truncate pr-2">
              <span className="font-semibold text-slate-500">Delivering to: </span>
              <span className="text-slate-900 font-bold">{deliveryAddress}</span>
            </div>
            <span className="shrink-0 font-extrabold text-[10px] uppercase bg-[#7FBA44] text-white px-2.5 py-0.5 rounded-full">
              {selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : ''}
            </span>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Your cart is empty"
                description="Looks like you haven't added any fresh fish, chicken, or mutton yet."
                actionLabel="Start Shopping Fresh"
                onActionClick={() => setIsCartOpen(false)}
                className="my-8"
              />
            ) : (
              cart.map((item) => {
                const itemTotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
                return (
                  <div
                    key={item.cart_key}
                    className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex gap-3 items-center justify-between hover:border-slate-200 transition-all"
                  >
                    {/* Item Image */}
                    <img
                      src={item.image_url || '/logo.png'}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-xl bg-slate-100 shrink-0"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">
                        {item.product_name}
                      </h4>
                      <p className="text-[11px] text-[#7FBA44] font-extrabold mt-0.5">
                        {item.cleaning_option} • {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                      </p>
                      <div className="text-xs font-black text-slate-900 mt-1">
                        ₹{itemTotal}{' '}
                        <span className="text-[10px] font-medium text-slate-400">
                          (₹{item.price_per_kg}/kg)
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeFromCart(item.cart_key)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#7FBA44] text-white rounded-xl p-1 shadow-2xs">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-5 h-5 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-xs font-black px-1 text-center min-w-4 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-5 h-5 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Coupon Section */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                {appliedCoupon ? (
                  <div className="p-3 rounded-2xl bg-[#7FBA44]/10 border border-[#7FBA44]/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#7FBA44]" />
                      <div>
                        <div className="font-extrabold text-slate-900">
                          Coupon '{appliedCoupon.code}' Applied
                        </div>
                        <div className="text-[11px] text-[#7FBA44] font-bold">
                          Saved ₹{discountAmount} on this order
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Try BESTIET100 or FRESH20"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7FBA44]/20 focus:border-[#7FBA44]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          couponMsg.success ? 'text-[#7FBA44]' : 'text-rose-600'
                        }`}
                      >
                        {couponMsg.success ? (
                          <CheckCircle2 className="w-3 h-3 text-[#7FBA44]" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{couponMsg.text}</span>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer Bill Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-slate-50 border-t border-slate-200 space-y-3 shrink-0 z-10 shadow-lg">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-slate-900">₹{cartSubtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#7FBA44] font-bold">
                    <span>Discount</span>
                    <span>- ₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee === 0 ? (
                      <span className="text-[#7FBA44] font-black uppercase text-[10px]">
                        FREE (Orders ≥ ₹500)
                      </span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-[#7FBA44] text-base">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handleProceedCheckout}
                className="w-full py-3.5 px-4 bg-[#7FBA44] hover:bg-[#71A83A] active:scale-[0.98] text-white font-extrabold rounded-xl text-sm shadow-md shadow-[#7FBA44]/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>PROCEED TO CHECKOUT (₹{grandTotal})</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
