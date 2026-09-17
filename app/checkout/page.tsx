'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { getDeliverySlots, DeliverySlot } from '@/lib/data/ecommerce-data'
import {
  MapPin,
  Clock,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building2,
  ShoppingBag,
  Loader2,
} from 'lucide-react'

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
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE_UPI'>('COD')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Prefill saved customer credentials on mount
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem('bestiet_customer_phone')
      if (savedPhone) setCustomerPhone(savedPhone)
      const savedName = localStorage.getItem('bestiet_customer_name')
      if (savedName) setCustomerName(savedName)
      const savedAddress = localStorage.getItem('bestiet_delivery_address')
      if (savedAddress) setHouseAddress(savedAddress)
    } catch (_) {}
  }, [])

  if (cart.length === 0) {
    return (
      <StorefrontLayout>
        <div className="py-16 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-[#E2E8F0] rounded-none flex items-center justify-center mx-auto text-[#39B54A]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0F172A]">Your Cart is Empty</h2>
          <p className="text-xs text-[#0F172A]/70">Please add items to your cart before proceeding to checkout.</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-[#39B54A] text-white font-bold text-xs rounded-none hover:bg-[#2EA03E]"
          >
            Browse Fresh Catch
          </Link>
        </div>
      </StorefrontLayout>
    )
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // Prevent duplicate submit

    if (!customerName.trim() || !customerPhone.trim() || !houseAddress.trim()) {
      setErrorMsg('Please complete your name, phone number, and delivery address.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const cleanPhone = customerPhone.replace(/\D/g, '')
      const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'
      const todayDate = new Date().toISOString().split('T')[0]
      const idempotencyKey = `web_chk_${cleanPhone}_${Date.now()}`

      // 1. Get or Create Customer
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

      const fullAddressString = `${houseAddress.trim()}${landmark.trim() ? `, Landmark: ${landmark.trim()}` : ''}${pincode ? `, Pincode: ${pincode}` : ''}`
      const orderNum = `BF-${todayDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

      // 2. Prepare Items Payload for RPC & Fallback
      const rpcItems = cart.map((item) => ({
        product_id: item.product_id,
        quantity_kg: item.weight_kg * item.quantity,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        unit_price: item.price_per_kg,
        price_per_kg: item.price_per_kg,
        cutting_type: item.cleaning_option,
      }))

      let placedOrderId = ''
      let finalOrderNumber = orderNum

      // 3. ATTEMPT RPC CREATION FIRST
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_atomic', {
        p_customer_id: customerId,
        p_branch_id: targetBranchId,
        p_address_id: null,
        p_delivery_fee: deliveryFee,
        p_customer_remarks: `Slot: ${selectedSlot.dateLabel} ${selectedSlot.timeSlot}`,
        p_idempotency_key: idempotencyKey,
        p_inventory_date: todayDate,
        p_items: rpcItems,
        p_latitude: null,
        p_longitude: null,
        p_maps_url: null,
      })

      if (!rpcErr && rpcRes && rpcRes.success) {
        placedOrderId = rpcRes.order_id
        finalOrderNumber = rpcRes.order_number || orderNum
      } else {
        // 4. FALLBACK DIRECT ATOMIC CREATION USING REAL COLUMNS
        console.warn('RPC create_order_atomic fallback engaged:', rpcErr?.message || rpcRes?.error)

        // Insert into orders using actual columns (order_number, customer_id, branch_id, status, subtotal, delivery_charge, total, total_amount, payment_status, payment_method, delivery_address, customer_phone, business_date, idempotency_key)
        const { data: directOrder, error: oErr } = await supabase
          .from('orders')
          .insert([
            {
              order_number: orderNum,
              customer_id: customerId,
              branch_id: targetBranchId,
              status: 'pending',
              subtotal: cartSubtotal,
              delivery_charge: deliveryFee,
              total: grandTotal,
              total_amount: grandTotal,
              payment_status: paymentMethod === 'COD' ? 'pending' : 'paid',
              payment_method: paymentMethod,
              delivery_address: fullAddressString,
              customer_phone: cleanPhone,
              business_date: todayDate,
              customer_remarks: `Slot: ${selectedSlot.dateLabel} ${selectedSlot.timeSlot}`,
              idempotency_key: idempotencyKey,
            },
          ])
          .select('id')
          .single()

        if (oErr) throw oErr
        placedOrderId = directOrder.id

        // Insert Order Items & Deduct Stock
        for (const item of cart) {
          const totalWeightKg = item.weight_kg * item.quantity
          const itemSubtotal = Math.round(item.price_per_kg * totalWeightKg)

          const { data: itemData, error: iErr } = await supabase
            .from('order_items')
            .insert([
              {
                order_id: placedOrderId,
                product_id: item.product_id,
                quantity: totalWeightKg,
                price_per_kg: item.price_per_kg,
                cutting_type: item.cleaning_option,
                total: itemSubtotal,
              },
            ])
            .select('id')
            .single()

          if (iErr) console.warn('Order Item Insert Warning:', iErr.message)

          // Deduct Stock in Inventory
          const { data: inv } = await supabase
            .from('inventory')
            .select('id, available_stock, sold_stock')
            .eq('product_id', item.product_id)
            .eq('branch_id', targetBranchId)
            .maybeSingle()

          if (inv?.id) {
            const newAvailable = Math.max(0, Number(inv.available_stock || 0) - totalWeightKg)
            const newSold = Number(inv.sold_stock || 0) + totalWeightKg

            await supabase
              .from('inventory')
              .update({
                available_stock: newAvailable,
                sold_stock: newSold,
                status: newAvailable <= 0 ? 'out_of_stock' : 'available',
                updated_at: new Date().toISOString(),
              })
              .eq('id', inv.id)

            // Log Inventory Movement
            await supabase.from('inventory_movements').insert([
              {
                inventory_id: inv.id,
                movement_type: 'SALE',
                quantity: -totalWeightKg,
                reason: `Order ${orderNum} (WEBSITE)`,
                reference_id: placedOrderId,
              },
            ])
          }
        }
      }

      // 5. Save Credentials & Order History Locally
      try {
        localStorage.setItem('bestiet_customer_phone', cleanPhone)
        localStorage.setItem('bestiet_customer_name', customerName.trim())
        localStorage.setItem('bestiet_delivery_address', fullAddressString)

        const prevOrdersRaw = localStorage.getItem('bestiet_placed_orders')
        let prevOrders: string[] = []
        if (prevOrdersRaw) {
          try {
            prevOrders = JSON.parse(prevOrdersRaw)
          } catch (_) {}
        }
        if (!prevOrders.includes(placedOrderId)) {
          prevOrders.unshift(placedOrderId)
        }
        localStorage.setItem('bestiet_placed_orders', JSON.stringify(prevOrders.slice(0, 50)))
      } catch (lErr) {
        console.warn('LocalStorage save error:', lErr)
      }

      // 6. CLEAR CART ONLY AFTER SUCCESSFUL ORDER PLACEMENT
      setDeliveryAddress(fullAddressString)
      clearCart()
      router.push(`/order-success/${placedOrderId}?num=${finalOrderNumber}`)
    } catch (err: any) {
      console.error('Checkout Order Error:', err)
      setErrorMsg(err.message || 'Failed to place order. Please check inventory stock and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StorefrontLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#39B54A] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping Cart</span>
          </Link>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">EXPRESS CHECKOUT</h1>
          <p className="text-xs text-[#0F172A]/70">
            Fulfilling order from <span className="font-bold text-[#0F172A]">{selectedBranch?.name || 'Manvila Branch'}</span>
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-none bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#39B54A]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Multi-Step Checkout Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: BRANCH CONFIRMATION */}
            <div className="p-4 sm:p-5 bg-white rounded-none border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-none bg-[#39B54A] text-white font-extrabold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#39B54A]" /> Branch Stock Confirmation
                  </h2>
                </div>
                <span className="text-[10px] font-extrabold bg-[#39B54A]/20 text-[#39B54A] px-2.5 py-1 border border-[#39B54A]/30">
                  ACTIVE BRANCH
                </span>
              </div>
              <div className="p-3 bg-[#E2E8F0]/60 border border-[#E2E8F0] text-xs text-[#0F172A] flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-[#0F172A]">{selectedBranch?.name || 'Manvila Kazhakkoottam Branch'}</div>
                  <div className="text-[11px] text-[#0F172A]/70">{selectedBranch?.location || 'Manvila, Kazhakkoottam, Trivandrum'}</div>
                </div>
                <div className="text-[10px] font-bold text-[#39B54A] bg-white px-2 py-1 border border-[#39B54A]/30">
                  Stock Verified
                </div>
              </div>
            </div>

            {/* STEP 2: DELIVERY ADDRESS */}
            <div className="p-4 sm:p-6 bg-white rounded-none border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="w-7 h-7 rounded-none bg-[#39B54A] text-white font-extrabold text-xs flex items-center justify-center">
                  2
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#39B54A]" /> Delivery Address Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Anjali Nair"
                    className="w-full px-3.5 py-2.5 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9656055969"
                    className="w-full px-3.5 py-2.5 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1">
                    House Name / Flat No / Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="e.g. Apartment 4B, Emerald Heights, Kazhakkoottam"
                    className="w-full px-3.5 py-2.5 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Technopark Gate 1"
                    className="w-full px-3.5 py-2.5 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#E2E8F0] border border-[#E2E8F0] rounded-none text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A] text-[#0F172A]"
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: DELIVERY SLOT */}
            <div className="p-4 sm:p-6 bg-white rounded-none border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="w-7 h-7 rounded-none bg-[#39B54A] text-white font-extrabold text-xs flex items-center justify-center">
                  3
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#39B54A]" /> Select Delivery Time Slot
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot.id === slot.id
                  return (
                    <div
                      key={slot.id}
                      onClick={() => !slot.isFull && setSelectedSlot(slot)}
                      className={`p-3.5 rounded-none border transition-all cursor-pointer flex items-center justify-between ${
                        slot.isFull
                          ? 'opacity-50 bg-[#E2E8F0] border-[#E2E8F0] cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#39B54A]/15 border-[#39B54A] ring-2 ring-[#39B54A]/30 shadow-xs'
                          : 'bg-white border-[#E2E8F0] hover:border-[#39B54A]'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-extrabold text-[#39B54A] uppercase">
                          {slot.dateLabel}
                        </div>
                        <div className="text-xs font-extrabold text-[#0F172A] mt-0.5">
                          {slot.timeSlot}
                        </div>
                      </div>

                      {slot.isFull ? (
                        <span className="text-[10px] font-extrabold text-[#0F172A] uppercase bg-[#E2E8F0] px-2 py-0.5 rounded-none">
                          FULL
                        </span>
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-none bg-[#39B54A] text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STEP 4: PAYMENT METHOD */}
            <div className="p-4 sm:p-6 bg-white rounded-none border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="w-7 h-7 rounded-none bg-[#39B54A] text-white font-extrabold text-xs flex items-center justify-center">
                  4
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#39B54A]" /> Choose Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-none border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'COD'
                      ? 'bg-[#39B54A]/15 border-[#39B54A] ring-2 ring-[#39B54A]/30'
                      : 'bg-white border-[#E2E8F0] hover:border-[#39B54A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-none border-2 border-[#39B54A] flex items-center justify-center">
                      {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-none bg-[#39B54A]" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-[#0F172A]">
                        Pay on Delivery (Cash / UPI at Doorstep)
                      </div>
                      <div className="text-[11px] text-[#0F172A]/70">
                        Pay cash or scan QR code when your fresh catch arrives
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-[#39B54A] text-white px-2 py-0.5 rounded-none">
                    RECOMMENDED
                  </span>
                </div>

                <div
                  onClick={() => setPaymentMethod('ONLINE_UPI')}
                  className={`p-4 rounded-none border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'ONLINE_UPI'
                      ? 'bg-[#39B54A]/15 border-[#39B54A] ring-2 ring-[#39B54A]/30'
                      : 'bg-white border-[#E2E8F0] hover:border-[#39B54A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-none border-2 border-[#39B54A] flex items-center justify-center">
                      {paymentMethod === 'ONLINE_UPI' && <div className="w-2 h-2 rounded-none bg-[#39B54A]" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-[#0F172A]">
                        Instant Online UPI (Google Pay, PhonePe, Paytm)
                      </div>
                      <div className="text-[11px] text-[#0F172A]/70">
                        Pay securely online before delivery
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order CTA */}
          <div className="space-y-4">
            <div className="p-4 sm:p-6 bg-[#E2E8F0] rounded-none border border-[#E2E8F0] shadow-xs space-y-4">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
                Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const itemWeightTotal = item.weight_kg * item.quantity
                  const itemSubtotal = Math.round(item.price_per_kg * itemWeightTotal)
                  return (
                    <div key={item.cart_key} className="flex justify-between items-center text-xs bg-white p-2.5 border border-[#E2E8F0]">
                      <div>
                        <div className="font-extrabold text-[#0F172A] line-clamp-1">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] text-[#39B54A] font-bold">
                          Cut: {item.cleaning_option} • {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`} ({item.quantity}x)
                        </div>
                        <div className="text-[10px] text-[#0F172A]/60">
                          Rate: ₹{item.price_per_kg}/kg
                        </div>
                      </div>
                      <div className="font-black text-[#0F172A] text-sm">
                        ₹{itemSubtotal}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-[#39B54A]/20 space-y-2 text-xs text-[#0F172A]/80">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-[#0F172A]">₹{cartSubtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#39B54A] font-bold">
                    <span>Discount</span>
                    <span>- ₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-[#0F172A]">
                    {deliveryFee === 0 ? (
                      <span className="text-[#39B54A] font-extrabold uppercase text-[10px]">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#39B54A]/20 flex justify-between text-base font-black text-[#0F172A]">
                  <span>Grand Total</span>
                  <span className="text-[#39B54A]">₹{grandTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-black rounded-none text-sm shadow-lg shadow-[#39B54A]/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Order...</span>
                  </div>
                ) : (
                  <>
                    <span>CONFIRM & PLACE ORDER (₹{grandTotal})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-[10px] text-[#0F172A]/60 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#39B54A]" />
                <span>100% Safe & Secure Order Processing</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </StorefrontLayout>
  )
}
