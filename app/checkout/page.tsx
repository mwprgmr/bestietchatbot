'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { getDeliverySlots, DeliverySlot } from '@/lib/data/ecommerce-data'
import { MapPin, Clock, CreditCard, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const {
    cart,
    selectedBranch,
    deliveryAddress,
    setDeliveryAddress,
    cartSubtotal,
    discountAmount,
    deliveryFee,
    grandTotal,
    clearCart,
  } = useCustomer()

  // Form States
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [houseAddress, setHouseAddress] = useState(deliveryAddress)
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState('695016')

  // Slot & Payment States
  const slots = getDeliverySlots()
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>(slots[0])
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE_UPI' | 'CARD'>('COD')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (cart.length === 0) {
    return (
      <StorefrontLayout>
        <div className="py-16 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-slate-900">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500">Please add items to your cart before proceeding to checkout.</p>
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

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !customerPhone.trim() || !houseAddress.trim()) {
      setErrorMsg('Please complete your name, phone number, and delivery address.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const cleanPhone = customerPhone.replace(/\D/g, '')

      // 1. Get or Create Customer Record
      let customerId = ''
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existingCust?.id) {
        customerId = existingCust.id
      } else {
        const { data: newCust, error: cErr } = await supabase
          .from('customers')
          .insert([
            {
              name: customerName.trim(),
              phone: cleanPhone,
              address: houseAddress.trim(),
            },
          ])
          .select('id')
          .single()

        if (cErr) throw cErr
        customerId = newCust.id
      }

      // 2. Generate Order Number
      const orderNum = `BF${Math.floor(100000 + Math.random() * 900000)}`
      const fullAddressString = `${houseAddress.trim()}, Landmark: ${landmark.trim() || 'N/A'}, Pincode: ${pincode}`

      // 3. Insert Order Record
      const { data: newOrder, error: oErr } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNum,
            customer_id: customerId,
            branch_id: selectedBranch.id,
            status: 'PLACED',
            total_amount: grandTotal,
            subtotal_amount: cartSubtotal,
            discount_amount: discountAmount,
            delivery_fee: deliveryFee,
            delivery_address: fullAddressString,
            delivery_slot: `${selectedSlot.dateLabel} • ${selectedSlot.timeSlot}`,
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
            source: 'WEBSITE',
          },
        ])
        .select('id')
        .single()

      if (oErr) throw oErr

      // 4. Insert Order Items & Decrement Branch Inventory
      const today = new Date().toISOString().split('T')[0]
      for (const item of cart) {
        const itemSubtotal = Math.round(item.price_per_kg * item.weight_kg * item.quantity)
        const totalWeightKg = item.weight_kg * item.quantity

        await supabase.from('order_items').insert([
          {
            order_id: newOrder.id,
            product_id: item.product_id,
            branch_id: selectedBranch.id,
            product_name: item.product_name,
            quantity_kg: totalWeightKg,
            unit_price: item.price_per_kg,
            subtotal: itemSubtotal,
            cutting_type: item.cleaning_option,
          },
        ])

        // Update branch inventory stock atomically
        const { data: inv } = await supabase
          .from('inventory')
          .select('id, available_stock, sold_stock')
          .eq('product_id', item.product_id)
          .eq('branch_id', selectedBranch.id)
          .maybeSingle()

        if (inv?.id) {
          const newAvailable = Math.max(0, Number(inv.available_stock || 0) - totalWeightKg)
          const newSold = Number(inv.sold_stock || 0) + totalWeightKg

          await supabase
            .from('inventory')
            .update({
              available_stock: newAvailable,
              sold_stock: newSold,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inv.id)
        }
      }

      // 5. Update local context delivery address & clear cart
      setDeliveryAddress(fullAddressString)
      clearCart()

      // 6. Redirect to Order Confirmation Success Screen
      router.push(`/order-success/${newOrder.id}?num=${orderNum}`)
    } catch (err: any) {
      console.error('Checkout Order Error:', err)
      setErrorMsg(err.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StorefrontLayout>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping Cart</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">EXPRESS CHECKOUT</h1>
          <p className="text-xs text-slate-500">
            Completing order for <span className="font-bold text-slate-900">{selectedBranch.name}</span>
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Multi-Step Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: DELIVERY ADDRESS */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                  1
                </div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Delivery Address Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Anjali Nair"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9656055969"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    House Name / Flat No / Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="e.g. Apartment 4B, Emerald Heights, Kazhakkoottam"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Technopark Gate 1"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: DELIVERY SLOT */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                  2
                </div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Select Delivery Time Slot
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot.id === slot.id
                  return (
                    <div
                      key={slot.id}
                      onClick={() => !slot.isFull && setSelectedSlot(slot)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        slot.isFull
                          ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-extrabold text-emerald-700 uppercase">
                          {slot.dateLabel}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                          {slot.timeSlot}
                        </div>
                      </div>

                      {slot.isFull ? (
                        <span className="text-[10px] font-extrabold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded-full">
                          FULL
                        </span>
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STEP 3: PAYMENT METHOD */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                  3
                </div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Choose Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'COD'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                      {paymentMethod === 'COD' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Pay on Delivery (Cash / UPI at Doorstep)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Pay cash or scan QR code when your fresh catch arrives
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                </div>

                <div
                  onClick={() => setPaymentMethod('ONLINE_UPI')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'ONLINE_UPI'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                      {paymentMethod === 'ONLINE_UPI' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Instant Online UPI (Google Pay, PhonePe, Paytm)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Secure instant online payment gateway
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Action */}
          <div className="space-y-4">
            <div className="p-6 bg-[#F7F8F5] rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Order Summary ({cart.length} items)
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.cart_key} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900 line-clamp-1">
                        {item.product_name}
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {item.cleaning_option} • {item.quantity}x ({item.weight_kg}kg pack)
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      ₹{Math.round(item.price_per_kg * item.weight_kg * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
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
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">₹{grandTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Processing Order...</span>
                ) : (
                  <>
                    <span>PLACE ORDER NOW (₹{grandTotal})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Safe & Secure Order Processing</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </StorefrontLayout>
  )
}
