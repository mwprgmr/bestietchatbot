'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { CheckCircle2, Truck, Clock, MapPin, ArrowRight, MessageSquare, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function OrderSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.id as string
  const orderNumParam = searchParams.get('num') || 'BF10234'

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrderData() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: o } = await supabase
          .from('orders')
          .select('*, customer:customers(*), items:order_items(*)')
          .eq('id', orderId)
          .single()

        if (o) setOrder(o)
      } catch (err) {
        console.warn('Order success load error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) loadOrderData()
  }, [orderId])

  const displayOrderNum = order?.order_number || orderNumParam

  return (
    <StorefrontLayout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Success Header Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-lg text-center space-y-4 relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Order Placed Successfully
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              THANK YOU FOR YOUR ORDER!
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Order ID: <span className="font-extrabold text-slate-900">{displayOrderNum}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-around gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>
                Delivery Slot: <strong className="text-slate-900">{order?.delivery_slot || 'Today • Express Slot'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>
                Status: <strong className="text-emerald-700 uppercase">CONFIRMED</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/track/${orderId}`}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>TRACK ORDER STATUS</span>
            </Link>

            <a
              href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, I placed order ${displayOrderNum}. Please confirm delivery.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#101814] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WHATSAPP SUPPORT</span>
            </a>
          </div>
        </div>

        {/* Order Details Breakdown */}
        {order && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Order Details
            </h3>

            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <div>
                    <div className="font-extrabold text-slate-900">{item.product_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {item.cutting_type || 'Cleaned'} • {item.quantity_kg}kg
                    </div>
                  </div>
                  <div className="font-extrabold text-slate-900">₹{item.subtotal}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{order.subtotal_amount || order.total_amount}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Total Paid</span>
                <span className="text-emerald-700">₹{order.total_amount}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Address:
              </div>
              <p>{order.delivery_address}</p>
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Fresh Products
          </Link>
        </div>
      </div>
    </StorefrontLayout>
  )
}
