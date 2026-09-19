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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-md text-center space-y-5 relative overflow-hidden animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-[#7FBA44]/10 text-[#7FBA44] flex items-center justify-center mx-auto border border-[#7FBA44]/20 shadow-2xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7FBA44] bg-[#7FBA44]/10 px-3 py-1 rounded-full border border-[#7FBA44]/20">
              Order Placed Successfully
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tracking-tight">
              THANK YOU FOR YOUR ORDER!
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Order Number: <span className="font-black text-slate-900">{displayOrderNum}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-around gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7FBA44]" />
              <span>
                Payment: <strong className="text-slate-900 uppercase font-extrabold">{order?.payment_method || 'COD'} ({order?.payment_status || 'PENDING'})</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#7FBA44]" />
              <span>
                Status: <strong className="text-[#7FBA44] uppercase font-black">{order?.status || 'PENDING'}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/track/${orderId}`}
              className="w-full sm:w-auto px-6 py-3 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#7FBA44]/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Truck className="w-4 h-4" />
              <span>TRACK ORDER STATUS</span>
            </Link>

            <a
              href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, I placed order ${displayOrderNum}. Please confirm delivery status.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4 text-[#7FBA44]" />
              <span>WHATSAPP SUPPORT</span>
            </a>
          </div>
        </div>

        {/* Order Details Breakdown */}
        {order && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Itemized Order Summary
            </h3>

            <div className="space-y-3">
              {items.map((item: any) => {
                const weightDisplay = item.quantity < 1 ? `${item.quantity * 1000}g` : `${item.quantity}kg`
                return (
                  <div key={item.id} className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                    <div>
                      <div className="font-extrabold text-slate-900">{item.product?.name || 'Fresh Catch'}</div>
                      <div className="text-[11px] text-[#7FBA44] font-extrabold">
                        Cut: {item.cutting_type || 'Whole'} • Pack: {weightDisplay}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Rate: ₹{item.price_per_kg}/kg</div>
                    </div>
                    <div className="font-black text-slate-900 text-sm">₹{item.total}</div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-bold text-slate-900">₹{order.subtotal || grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="font-bold text-slate-900">
                  {Number(order.delivery_charge || 0) === 0 ? 'FREE' : `₹${order.delivery_charge}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2.5 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-[#7FBA44] text-base font-black">₹{grandTotal}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#7FBA44]" /> Delivery Address:
              </div>
              <p className="text-slate-500 font-medium">{order.delivery_address || 'Address provided at checkout'}</p>
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-xs font-extrabold text-[#7FBA44] hover:underline inline-flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Fresh Products
          </Link>
        </div>
      </div>
    </StorefrontLayout>
  )
}
