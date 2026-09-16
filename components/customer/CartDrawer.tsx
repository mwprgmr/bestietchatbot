'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Tag, CheckCircle2, AlertCircle } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Your Fresh Cart</h3>
                <p className="text-xs text-slate-500">{cart.length} unique item(s) selected</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Delivery Bar */}
          <div className="bg-[#F7F8F5] px-4 py-2 border-b border-slate-200/60 flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <span className="font-bold text-slate-700">Delivering to: </span>
              <span className="text-emerald-800 font-semibold">{deliveryAddress}</span>
            </div>
            <span className="shrink-0 font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {selectedBranch.name.replace(' Branch', '')}
            </span>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">Your cart is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Looks like you haven't added any fresh fish, chicken, or mutton yet.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Start Shopping Fresh
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const itemTotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
                return (
                  <div
                    key={item.cart_key}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex gap-3 items-center justify-between"
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
                      <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        {item.cleaning_option} • {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                      </p>
                      <div className="text-xs font-extrabold text-slate-900 mt-1">
                        ₹{itemTotal}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          (₹{item.price_per_kg}/kg)
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeFromCart(item.cart_key)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5 bg-emerald-700 text-white rounded-xl p-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-5 h-5 rounded-lg bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-center min-w-4">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-5 h-5 rounded-lg bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center transition-colors"
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
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-extrabold text-emerald-900">
                          Coupon '{appliedCoupon.code}' Applied
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          Saved ₹{discountAmount} on this order
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-bold text-red-600 hover:underline"
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
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-[11px] font-medium flex items-center gap-1 ${
                          couponMsg.success ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {couponMsg.success ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
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
            <div className="p-4 bg-[#F7F8F5] border-t border-slate-200/80 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-slate-900">₹{cartSubtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount</span>
                    <span>- ₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-extrabold uppercase text-[10px]">
                        FREE
                      </span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>To Pay</span>
                  <span className="text-emerald-700 text-base">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handleProceedCheckout}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
