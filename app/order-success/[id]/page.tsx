'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { CheckCircle2, Truck, Clock, MapPin, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function OrderSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.id as string
  const orderNumParam = searchParams.get('num') || 'BF-ORDER'

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrderData() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: o } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle()

        if (o) {
          setOrder(o)
          const { data: itemRows } = await supabase
            .from('order_items')
            .select('*, product:products(name, category)')
            .eq('order_id', orderId)

          if (itemRows) setItems(itemRows)
        }
      } catch (err) {
        console.warn('Order success load error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) loadOrderData()
  }, [orderId])

  const displayOrderNum = order?.order_number || orderNumParam
  const grandTotal = order?.total_amount || order?.total || 0

  return (
    <StorefrontLayout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 pb-20 md:pb-6">
        {/* Success Header Card */}
        <div className="bg-white rounded-none p-6 sm:p-8 border border-[#E2E8F0] shadow-md text-center space-y-4 relative overflow-hidden">
          <div className="w-16 h-16 rounded-none bg-[#39B54A]/20 text-[#39B54A] flex items-center justify-center mx-auto border border-[#39B54A]/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#39B54A] bg-[#39B54A]/10 px-3 py-1 rounded-none border border-[#39B54A]/30">
              Order Placed Successfully
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] mt-2 tracking-tight">
              THANK YOU FOR YOUR ORDER!
            </h1>
            <p className="text-xs text-[#0F172A]/70 mt-1">
              Order Number: <span className="font-extrabold text-[#0F172A]">{displayOrderNum}</span>
            </p>
          </div>

          <div className="p-4 rounded-none bg-[#E2E8F0]/60 border border-[#E2E8F0] text-xs text-[#0F172A] flex flex-col sm:flex-row items-center justify-around gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#39B54A]" />
              <span>
                Payment: <strong className="text-[#0F172A] uppercase">{order?.payment_method || 'COD'} ({order?.payment_status || 'PENDING'})</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#39B54A]" />
              <span>
                Status: <strong className="text-[#39B54A] uppercase">{order?.status || 'PENDING'}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/track/${orderId}`}
              className="w-full sm:w-auto px-6 py-3 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-extrabold text-xs rounded-none shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>TRACK ORDER STATUS</span>
            </Link>

            <a
              href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, I placed order ${displayOrderNum}. Please confirm delivery status.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] hover:bg-[#0F172A]/90 text-white font-extrabold text-xs rounded-none shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-[#39B54A]" />
              <span>WHATSAPP SUPPORT</span>
            </a>
          </div>
        </div>

        {/* Order Details Breakdown */}
        {order && (
          <div className="bg-white rounded-none p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
              Itemized Order Summary
            </h3>

            <div className="space-y-3">
              {items.map((item: any) => {
                const weightDisplay = item.quantity < 1 ? `${item.quantity * 1000}g` : `${item.quantity}kg`
                return (
                  <div key={item.id} className="flex justify-between items-center text-xs pb-2.5 border-b border-[#E2E8F0]">
                    <div>
                      <div className="font-extrabold text-[#0F172A]">{item.product?.name || 'Fresh Catch'}</div>
                      <div className="text-[10px] text-[#39B54A] font-bold">
                        Cut: {item.cutting_type || 'Whole'} • Pack: {weightDisplay}
                      </div>
                      <div className="text-[10px] text-[#0F172A]/60">Rate: ₹{item.price_per_kg}/kg</div>
                    </div>
                    <div className="font-black text-[#0F172A] text-sm">₹{item.total}</div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 text-xs space-y-1.5 text-[#0F172A]/80">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-bold text-[#0F172A]">₹{order.subtotal || grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="font-bold text-[#0F172A]">
                  {Number(order.delivery_charge || 0) === 0 ? 'FREE' : `₹${order.delivery_charge}`}
                </span>
              </div>
              <div className="flex justify-between text-[#0F172A] font-extrabold text-sm pt-2 border-t border-[#E2E8F0]">
                <span>Total Amount</span>
                <span className="text-[#39B54A] text-base font-black">₹{grandTotal}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] text-xs text-[#0F172A]/80">
              <div className="font-bold text-[#0F172A] flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#39B54A]" /> Delivery Address:
              </div>
              <p>{order.delivery_address || 'Address provided at checkout'}</p>
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-xs font-extrabold text-[#39B54A] hover:underline inline-flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Fresh Products
          </Link>
        </div>
      </div>
    </StorefrontLayout>
  )
}
