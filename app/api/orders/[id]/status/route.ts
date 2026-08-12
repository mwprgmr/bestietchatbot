import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppStatusUpdate } from '@/lib/whatsapp/client'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await req.json()
    const { status } = body

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let updatedOrder: any = null

    if (status === 'CANCELLED') {
      const { data, error } = await supabase.rpc('cancel_order_atomic', {
        p_order_id: orderId,
        p_reason: body.cancellation_reason || 'Cancelled by admin',
      })
      if (error) throw error
      updatedOrder = data
    } else {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*, customer:customers(*)')
        .single()

      if (error) throw error
      updatedOrder = data
    }

    // Send WhatsApp notification if customer phone is available
    if (updatedOrder?.customer?.phone) {
      try {
        await sendWhatsAppStatusUpdate({
          phone: updatedOrder.customer.phone,
          orderNumber: updatedOrder.order_number,
          newStatus: status,
        })
      } catch (waErr) {
        console.error('[WhatsApp Status Update Warning]:', waErr)
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (err: any) {
    console.error('[Order Status API Error]:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
