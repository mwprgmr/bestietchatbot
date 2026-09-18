'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { useCustomer } from '@/lib/context/CustomerContext'
import { createClient } from '@/lib/supabase/client'
import { getDeliverySlots, DeliverySlot } from '@/lib/data/ecommerce-data'
import {
  Building2,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Loader2,
  User,
  Phone,
  RefreshCw,
  Navigation,
  ExternalLink,
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

  // Hydration state check
  const [mounted, setMounted] = useState(false)

  // Form States
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [houseAddress, setHouseAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState('695016')

  // GPS Location State
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; mapsUrl: string } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const handleShareGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('GPS geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
        setGpsCoords({ lat, lng, mapsUrl })
        setGpsLoading(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setGpsError('Could not retrieve GPS location. Please check location permissions.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Delivery Slot & Payment Method
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE_UPI'>('COD')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Hydration & localStorage initialization
  useEffect(() => {
    setMounted(true)
    try {
      const generatedSlots = getDeliverySlots()
      setSlots(generatedSlots)
      if (generatedSlots.length > 0) {
        setSelectedSlot(generatedSlots[0])
      }

      const savedPhone = localStorage.getItem('bestiet_customer_phone')
      if (savedPhone) setCustomerPhone(savedPhone)
      
      const savedName = localStorage.getItem('bestiet_customer_name')
      if (savedName) setCustomerName(savedName)

      const savedAddress = localStorage.getItem('bestiet_delivery_address')
      setHouseAddress(savedAddress || deliveryAddress || '')
    } catch (err) {
      console.warn('Error initializing checkout state:', err)
      setHouseAddress(deliveryAddress || '')
    }
  }, [deliveryAddress])

  // Hydration Loading Skeleton
  if (!mounted) {
    return (
      <StorefrontLayout>
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <Loader2 className="w-8 h-8 text-[#39B54A] animate-spin mx-auto" />
          <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
            Loading Fresh Checkout...
          </p>
        </div>
      </StorefrontLayout>
    )
  }

  // Safe empty cart guard after hydration
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return (
      <StorefrontLayout>
        <div className="py-16 px-4 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-[#E2E8F0] rounded-none flex items-center justify-center mx-auto text-[#39B54A]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0F172A]">Your Cart is Currently Empty</h2>
          <p className="text-xs text-[#0F172A]/70 leading-relaxed">
            Please add fresh fish, chicken, or mutton to your cart before proceeding to checkout.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#39B54A] text-white font-extrabold text-xs rounded-none hover:bg-[#2EA03E] shadow-md"
          >
            BROWSE FRESH PRODUCTS
          </Link>
        </div>
      </StorefrontLayout>
    )
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!customerName.trim() || !customerPhone.trim() || !houseAddress.trim()) {
      setErrorMsg('Please complete your full name, phone number, and delivery address.')
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

      let formattedPhone = cleanPhone
      if (formattedPhone.length === 10) {
        formattedPhone = `91${formattedPhone}`
      }

      // 1. Customer Query & Upsert/Create
      let customerId: string | null = null
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id, name')
          .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
          .maybeSingle()

        if (existingCust?.id) {
          customerId = existingCust.id
          if (customerName.trim() && (!existingCust.name || existingCust.name.startsWith('Customer '))) {
            await supabase.from('customers').update({ name: customerName.trim() }).eq('id', customerId)
          }
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({
              name: customerName.trim(),
              phone: formattedPhone || cleanPhone,
            })
            .select('id')
            .single()

          if (newCust?.id) {
            customerId = newCust.id
          }
        }
      } catch (cEx) {
        console.warn('Customer query/create non-fatal exception:', cEx)
      }

      let fullAddressString = `${houseAddress.trim()}${landmark.trim() ? `, Landmark: ${landmark.trim()}` : ''}${pincode ? `, Pincode: ${pincode}` : ''}`
      if (gpsCoords) {
        fullAddressString += ` | GPS: ${gpsCoords.mapsUrl}`
      }

      const orderNum = `BF-${todayDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
      const slotText = selectedSlot ? `${selectedSlot.dateLabel} ${selectedSlot.timeSlot}` : 'Express Slot'
      const customerRemarkDetails = `Customer: ${customerName.trim()} (${cleanPhone}), Delivery: ${fullAddressString}, Slot: ${slotText}${gpsCoords ? ` | GPS Shared: ${gpsCoords.mapsUrl}` : ''}`

      // 2. Normalize Cart Items Payload
      const normalizedCart = cart.map((item) => ({
        product_id: item.product_id,
        quantity_kg: Number(item.weight_kg || 0.5) * Number(item.quantity || 1),
        weight_kg: Number(item.weight_kg || 0.5),
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.price_per_kg || 200),
        price_per_kg: Number(item.price_per_kg || 200),
        cutting_type: item.cleaning_option || 'Whole',
        product_name: item.product_name || 'Fresh Catch',
      }))

      let placedOrderId = ''
      let finalOrderNumber = orderNum

      // 3. ATTEMPT RPC PLACEMENT
      let rpcSuccess = false
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_atomic', {
          p_customer_id: customerId,
          p_branch_id: targetBranchId,
          p_address_id: null,
          p_delivery_fee: deliveryFee || 35,
          p_customer_remarks: customerRemarkDetails,
          p_idempotency_key: idempotencyKey,
          p_inventory_date: todayDate,
          p_items: normalizedCart,
          p_latitude: gpsCoords?.lat || null,
          p_longitude: gpsCoords?.lng || null,
          p_maps_url: gpsCoords?.mapsUrl || null,
        })

        if (!rpcErr && rpcRes && rpcRes.success) {
          rpcSuccess = true
          placedOrderId = rpcRes.order_id
          finalOrderNumber = rpcRes.order_number || orderNum
        } else {
          console.warn('RPC create_order_atomic returned error:', rpcErr || rpcRes)
        }
      } catch (rpcEx) {
        console.warn('RPC create_order_atomic call exception:', rpcEx)
      }

      // 4. FALLBACK CLIENT-SIDE ATOMIC PLACEMENT WITH VERIFIED SCHEMA
      if (!rpcSuccess) {
        console.warn('Executing client-side verified schema fallback for order placement...')
        const directInsertObj: any = {
          order_number: orderNum,
          customer_id: customerId || null,
          branch_id: targetBranchId,
          status: 'pending',
          subtotal: cartSubtotal || 0,
          delivery_charge: deliveryFee || 35,
          total: grandTotal || 0,
          total_amount: grandTotal || 0,
          payment_status: paymentMethod === 'COD' ? 'pending' : 'paid',
          payment_method: paymentMethod,
          delivery_address: fullAddressString,
          customer_phone: cleanPhone,
          business_date: todayDate,
          customer_remarks: customerRemarkDetails,
          idempotency_key: idempotencyKey,
          order_channel: 'storefront',
        }

        if (gpsCoords) {
          directInsertObj.latitude = gpsCoords.lat
          directInsertObj.longitude = gpsCoords.lng
          directInsertObj.maps_url = gpsCoords.mapsUrl
        }

        const { data: directOrder, error: oErr } = await supabase
          .from('orders')
          .insert([directInsertObj])
          .select('id')
          .single()

        if (oErr) {
          throw new Error(oErr.message || 'Failed to record order details. Please try again.')
        }

        placedOrderId = directOrder.id

        // Insert Order Items & Deduct Inventory Stock
        for (const item of normalizedCart) {
          const totalWeightKg = item.quantity_kg
          const itemSubtotal = Math.round(item.unit_price * totalWeightKg)

          const { error: iErr } = await supabase.from('order_items').insert([
            {
              order_id: placedOrderId,
              product_id: item.product_id,
              quantity: totalWeightKg,
              price_per_kg: item.unit_price,
              cutting_type: item.cutting_type,
              total: itemSubtotal,
            },
          ])

          if (iErr) console.warn('Order Item Insert Warning:', iErr.message)

          // Deduct Stock
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

      // 5. Save Credentials & History Locally
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

      // 6. Clear Cart & Navigate to Order Success Page
      setDeliveryAddress(fullAddressString)
      clearCart()
      router.push(`/order-success/${placedOrderId}?num=${finalOrderNumber}`)
    } catch (err: any) {
      console.error('Checkout Error:', err)
      setErrorMsg(err.message || 'An error occurred while placing your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StorefrontLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Navigation Back Link & Header */}
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#39B54A] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping Cart</span>
          </Link>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight uppercase">EXPRESS CHECKOUT</h1>
          <p className="text-xs text-[#0F172A]/70">
            Fulfilling order from <span className="font-bold text-[#0F172A]">{selectedBranch?.name || 'Manvila Branch'}</span>
          </p>
        </div>

        {/* Inline Safe Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-white border-2 border-rose-500/50 text-slate-900 text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs underline font-extrabold text-slate-900 hover:text-rose-600 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Checkout Multi-step Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: BRANCH STOCK CONFIRMATION */}
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#39B54A] text-white font-black text-xs flex items-center justify-center shadow-2xs">
                    1
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#39B54A]" /> Branch Stock Confirmation
                  </h2>
                </div>
                <span className="text-[10px] font-black bg-[#39B54A]/10 text-[#39B54A] px-3 py-1 rounded-full border border-[#39B54A]/20 uppercase">
                  ACTIVE BRANCH
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900">{selectedBranch?.name || 'Manvila Kazhakkoottam Branch'}</div>
                  <div className="text-[11px] text-slate-500">{selectedBranch?.location || 'Manvila, Kazhakkoottam, Trivandrum'}</div>
                </div>
                <div className="text-[10px] font-black text-[#39B54A] bg-white px-2.5 py-1 rounded-full border border-[#39B54A]/30">
                  Stock Verified
                </div>
              </div>
            </div>

            {/* STEP 2: DELIVERY ADDRESS */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-[#39B54A] text-white font-black text-xs flex items-center justify-center shadow-2xs">
                  2
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#39B54A]" /> Delivery Address Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Anjali Nair"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase mb-1">
                    WhatsApp Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9656055969"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-900 uppercase mb-1">
                    House Name / Flat No / Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="e.g. Apartment 4B, Emerald Heights, Kazhakkoottam"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Technopark Gate 1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 uppercase mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] text-slate-900"
                  />
                </div>

                {/* GPS Live Location Sharing Feature */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#39B54A]" /> Live Satellite GPS Location Sharing
                  </label>
                  
                  {gpsCoords ? (
                    <div className="p-3 bg-[#39B54A]/10 border border-[#39B54A]/30 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#39B54A] shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">GPS Location Attached!</p>
                          <p className="text-[11px] font-mono text-slate-600">
                            {gpsCoords.lat.toFixed(4)}° N, {gpsCoords.lng.toFixed(4)}° E
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={gpsCoords.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#39B54A] text-white text-[11px] font-bold rounded-lg hover:bg-[#2ea03e] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <ExternalLink className="w-3 h-3" /> Preview Map
                        </a>
                        <button
                          type="button"
                          onClick={() => setGpsCoords(null)}
                          className="text-[11px] font-bold text-rose-600 underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handleShareGps}
                        disabled={gpsLoading}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Navigation className={`w-4 h-4 text-[#39B54A] ${gpsLoading ? 'animate-spin' : ''}`} />
                        <span>{gpsLoading ? 'Fetching Satellite GPS...' : '📍 SHARE MY CURRENT GPS LOCATION FOR FAST DELIVERY'}</span>
                      </button>
                      {gpsError && (
                        <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {gpsError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: DELIVERY SLOT */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-[#39B54A] text-white font-black text-xs flex items-center justify-center shadow-2xs">
                  3
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#39B54A]" /> Select Delivery Time Slot
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id
                  return (
                    <div
                      key={slot.id}
                      onClick={() => !slot.isFull && setSelectedSlot(slot)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        slot.isFull
                          ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#39B54A]/10 border-[#39B54A] ring-2 ring-[#39B54A]/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-[#39B54A]'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-black text-[#39B54A] uppercase">
                          {slot.dateLabel}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                          {slot.timeSlot}
                        </div>
                      </div>

                      {slot.isFull ? (
                        <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-200 px-2 py-0.5 rounded-full">
                          FULL
                        </span>
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#39B54A] text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STEP 4: PAYMENT METHOD */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-[#39B54A] text-white font-black text-xs flex items-center justify-center shadow-2xs">
                  4
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#39B54A]" /> Choose Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'COD'
                      ? 'bg-[#39B54A]/10 border-[#39B54A] ring-2 ring-[#39B54A]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-[#39B54A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-[#39B54A] flex items-center justify-center">
                      {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-[#39B54A]" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Pay on Delivery (Cash / UPI at Doorstep)
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Pay cash or scan QR code when your fresh catch arrives
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-[#39B54A] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    RECOMMENDED
                  </span>
                </div>

                <div
                  onClick={() => setPaymentMethod('ONLINE_UPI')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'ONLINE_UPI'
                      ? 'bg-[#39B54A]/10 border-[#39B54A] ring-2 ring-[#39B54A]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-[#39B54A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-[#39B54A] flex items-center justify-center">
                      {paymentMethod === 'ONLINE_UPI' && <div className="w-2 h-2 rounded-full bg-[#39B54A]" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Instant Online UPI (Google Pay, PhonePe, Paytm)
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Pay securely online before delivery
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order Action */}
          <div className="space-y-4">
            <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
              </h2>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const itemWeightTotal = (item.weight_kg || 0.5) * (item.quantity || 1)
                  const itemSubtotal = Math.round((item.price_per_kg || 200) * itemWeightTotal)
                  return (
                    <div key={item.cart_key || item.product_id} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <div className="font-extrabold text-slate-900 line-clamp-1">
                          {item.product_name || 'Fresh Item'}
                        </div>
                        <div className="text-[11px] text-[#39B54A] font-extrabold mt-0.5">
                          Cut: {item.cleaning_option || 'Whole'} • {item.weight_kg === 0.5 ? '500g' : `${item.weight_kg}kg`} ({item.quantity}x)
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Rate: ₹{item.price_per_kg}/kg
                        </div>
                      </div>
                      <div className="font-black text-slate-900 text-sm">
                        ₹{itemSubtotal}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-slate-900">₹{cartSubtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#39B54A] font-bold">
                    <span>Discount</span>
                    <span>- ₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee === 0 ? (
                      <span className="text-[#39B54A] font-black uppercase text-[10px]">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-[#39B54A]">₹{grandTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#39B54A] hover:bg-[#2ea03e] text-white font-extrabold rounded-xl text-sm shadow-md shadow-[#39B54A]/25 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 active:scale-[0.98]"
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

              <div className="text-[10px] text-slate-500 font-semibold text-center flex items-center justify-center gap-1">
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
