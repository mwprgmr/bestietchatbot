import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'
const DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocW9vbmJod3NmZndvanZuZG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk4NTUwNiwiZXhwIjoyMTAwNTYxNTA2fQ.kpOHtCV9jRBBtiQP_aTBh9DYzdoAfWpP77o1preof28'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY
  return createClient(url, serviceKey)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      customerName,
      customerPhone,
      houseAddress,
      landmark,
      pincode,
      gpsCoords,
      selectedSlot,
      selectedBranchId,
      paymentMethod,
      cart,
      cartSubtotal,
      deliveryFee,
      grandTotal,
    } = body

    if (!customerName || !customerPhone || !houseAddress) {
      return NextResponse.json(
        { success: false, error: 'Customer name, phone number, and delivery address are required.' },
        { status: 400 }
      )
    }

    const supabase = getAdminSupabase()
    const cleanPhone = customerPhone.replace(/\D/g, '')
    const targetBranchId = selectedBranchId || 'b1111111-1111-1111-1111-111111111111'
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const idempotencyKey = `web_chk_${cleanPhone}_${Date.now()}`

    let formattedPhone = cleanPhone
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`
    }

    // 1. Ensure Customer Record Exists via Admin Key (No RLS Block)
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
        const { data: newCust, error: cErr } = await supabase
          .from('customers')
          .insert({
            name: customerName.trim(),
            phone: formattedPhone || cleanPhone,
          })
          .select('id')
          .single()

        if (newCust?.id) {
          customerId = newCust.id
        } else {
          console.warn('New customer insert warning:', cErr?.message)
        }
      }
    } catch (cEx) {
      console.warn('Customer query/create exception:', cEx)
    }

    // 2. Prepare Address and Remarks
    let fullAddressString = `${houseAddress.trim()}${landmark?.trim() ? `, Landmark: ${landmark.trim()}` : ''}${pincode ? `, Pincode: ${pincode}` : ''}`
    if (gpsCoords?.mapsUrl) {
      fullAddressString += ` | GPS: ${gpsCoords.mapsUrl}`
    }

    const orderNum = `BF-${todayDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    const slotText = selectedSlot ? `${selectedSlot.dateLabel} ${selectedSlot.timeSlot}` : 'Express Slot'
    const customerRemarkDetails = `Customer: ${customerName.trim()} (${cleanPhone}), Delivery: ${fullAddressString}, Slot: ${slotText}${gpsCoords?.mapsUrl ? ` | GPS Shared: ${gpsCoords.mapsUrl}` : ''}`

    // 3. Normalize Cart Items
    const normalizedCart = (cart || []).map((item: any) => ({
      product_id: item.product_id,
      quantity_kg: Number(item.weight_kg || 0.5) * Number(item.quantity || 1),
      weight_kg: Number(item.weight_kg || 0.5),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.price_per_kg || 200),
      price_per_kg: Number(item.price_per_kg || 200),
      cutting_type: item.cleaning_option || 'Whole',
      product_name: item.product_name || 'Fresh Catch',
    }))

    // 4. Execute Atomic Database RPC Placement
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_atomic', {
      p_customer_id: customerId,
      p_address_id: null,
      p_items: normalizedCart,
      p_inventory_date: todayDate,
      p_idempotency_key: idempotencyKey,
      p_delivery_fee: deliveryFee || 35,
      p_branch_id: targetBranchId,
      p_customer_remarks: customerRemarkDetails,
      p_latitude: gpsCoords?.lat || null,
      p_longitude: gpsCoords?.lng || null,
      p_maps_url: gpsCoords?.mapsUrl || null,
    })

    if (rpcErr || !rpcRes || !rpcRes.success) {
      console.error('create_order_atomic RPC Error:', rpcErr || rpcRes)
      const errorMsg = rpcErr?.message || rpcRes?.error || 'Failed to place order via atomic RPC procedure.'
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: rpcRes.order_id,
      order_number: rpcRes.order_number,
      total_amount: rpcRes.total_amount,
    })
  } catch (err: any) {
    console.error('Order placement API exception:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Server error while placing order.' },
      { status: 500 }
    )
  }
}

