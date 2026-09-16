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
        className="absolute inset-0 bg-[#232B1E]/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full sm:w-auto">
        <div className="w-full sm:w-screen max-w-md bg-[#F7F2EB] shadow-2xl border-l border-[#EEEEEE] flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 bg-[#F7F2EB] border-b border-[#EEEEEE] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-none bg-[#8B9A6E]/20 text-[#8B9A6E] border border-[#8B9A6E]/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#232B1E]">Your Fresh Cart</h3>
                <p className="text-xs text-[#232B1E]/70">{cart.length} unique item(s) selected</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-none hover:bg-[#EEEEEE] text-[#232B1E]/60 hover:text-[#232B1E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Delivery Bar */}
          <div className="bg-[#EEEEEE] px-4 py-2 border-b border-[#EEEEEE] flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <span className="font-bold text-[#232B1E]/80">Delivering to: </span>
              <span className="text-[#8B9A6E] font-semibold">{deliveryAddress}</span>
            </div>
            <span className="shrink-0 font-bold text-[10px] uppercase bg-[#8B9A6E] text-white px-2 py-0.5 rounded-none">
              {selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : ''}
            </span>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-20 h-20 bg-[#EEEEEE] rounded-none flex items-center justify-center mx-auto mb-4 text-[#8B9A6E]">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h4 className="text-base font-extrabold text-[#232B1E]">Your cart is empty</h4>
                <p className="text-xs text-[#232B1E]/70 mt-1 max-w-xs mx-auto">
                  Looks like you haven't added any fresh fish, chicken, or mutton yet.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-bold text-xs rounded-none shadow-md transition-all cursor-pointer"
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
                    className="p-3 bg-white rounded-none border border-[#EEEEEE] shadow-2xs flex gap-3 items-center justify-between"
                  >
                    {/* Item Image */}
                    <img
                      src={item.image_url || '/logo.png'}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-none bg-[#EEEEEE] shrink-0"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-[#232B1E] truncate">
                        {item.product_name}
                      </h4>
                      <p className="text-[10px] text-[#8B9A6E] font-bold mt-0.5">
                        {item.cleaning_option} • {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`}
                      </p>
                      <div className="text-xs font-extrabold text-[#232B1E] mt-1">
                        ₹{itemTotal}{' '}
                        <span className="text-[10px] font-normal text-[#232B1E]/60">
                          (₹{item.price_per_kg}/kg)
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeFromCart(item.cart_key)}
                        className="text-[#232B1E]/50 hover:text-[#232B1E] transition-colors p-1 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#8B9A6E] text-white rounded-none p-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, -1)}
                          className="w-5 h-5 rounded-none bg-[#232B1E]/20 hover:bg-[#232B1E]/40 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-center min-w-4 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.cart_key, 1)}
                          className="w-5 h-5 rounded-none bg-[#232B1E]/20 hover:bg-[#232B1E]/40 flex items-center justify-center transition-colors cursor-pointer"
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
              <div className="pt-3 border-t border-[#EEEEEE]">
                {appliedCoupon ? (
                  <div className="p-3 rounded-none bg-[#8B9A6E]/20 border border-[#8B9A6E]/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#8B9A6E]" />
                      <div>
                        <div className="font-extrabold text-[#232B1E]">
                          Coupon '{appliedCoupon.code}' Applied
                        </div>
                        <div className="text-[10px] text-[#8B9A6E]">
                          Saved ₹{discountAmount} on this order
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-bold text-[#232B1E] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-[#232B1E]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Try BESTIET100 or FRESH20"
                          className="w-full pl-8 pr-3 py-2 bg-[#EEEEEE] border border-[#EEEEEE] rounded-none text-xs font-bold text-[#232B1E] uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A6E]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-bold rounded-none text-xs transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <div
                        className={`text-[11px] font-medium flex items-center gap-1 ${
                          couponMsg.success ? 'text-[#8B9A6E]' : 'text-[#232B1E]'
                        }`}
                      >
                        {couponMsg.success ? (
                          <CheckCircle2 className="w-3 h-3 text-[#8B9A6E]" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-[#232B1E]" />
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
            <div className="p-4 bg-[#EEEEEE] border-t border-[#EEEEEE] space-y-3">
              <div className="space-y-1.5 text-xs text-[#232B1E]/80">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-[#232B1E]">₹{cartSubtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#8B9A6E] font-bold">
                    <span>Discount</span>
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
                <div className="pt-2 border-t border-[#8B9A6E]/20 flex justify-between text-sm font-extrabold text-[#232B1E]">
                  <span>To Pay</span>
                  <span className="text-[#8B9A6E] text-base">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handleProceedCheckout}
                className="w-full py-3 px-4 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-bold rounded-none text-sm shadow-md shadow-[#8B9A6E]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
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
