'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { CheckCircle2, Truck, Clock, MapPin, ArrowLeft, PackageCheck, UtensilsCrossed, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const TRACKING_STAGES = [
  { key: 'PLACED', label: 'Order Placed', desc: 'Received by Bestiet Fresh' },
  { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Assigned to nearest branch' },
  { key: 'PREPARING', label: 'Preparing & Cleaning', desc: 'Custom cleaned and iced' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider en route to your door' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your fresh meal' },
]

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrackingData() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: o } = await supabase
          .from('orders')
          .select('*, items:order_items(*), branch:branches(name)')
          .eq('id', orderId)
          .single()

        if (o) setOrder(o)
      } catch (err) {
        console.error('Tracking fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) loadTrackingData()
  }, [orderId])

  const getStageIndex = (status: string) => {
    const norm = (status || 'PLACED').toUpperCase()
    if (norm === 'DELIVERED') return 4
    if (norm === 'OUT_FOR_DELIVERY' || norm === 'DISPATCHED') return 3
    if (norm === 'PREPARING' || norm === 'CLEANING' || norm === 'PROCESSING') return 2
    if (norm === 'CONFIRMED' || norm === 'ACCEPTED') return 1
    return 0
  }

  const currentStageIdx = order ? getStageIndex(order.status) : 0

  return (
    <StorefrontLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Orders</span>
        </Link>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase">Fetching live tracking status...</p>
          </div>
        ) : !order ? (
          <div className="p-10 text-center bg-[#F7F8F5] rounded-3xl border border-slate-200 text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="text-base font-extrabold text-slate-900">Order Tracking Not Found</h3>
            <p className="text-xs">Invalid order ID or tracking session.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-8">
            {/* Header Status Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Live Order Tracker
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  ORDER #{order.order_number}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fulfilled by <span className="font-bold text-slate-800">{order.branch?.name || 'Bestiet Fresh Branch'}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">Estimated Delivery:</span>
                <div className="text-sm font-extrabold text-emerald-700">{order.delivery_slot || 'Today'}</div>
              </div>
            </div>

            {/* 5-Stage Animated Tracking Timeline */}
            <div className="space-y-6 relative">
              <div className="absolute top-3 left-4 bottom-3 w-0.5 bg-slate-200 z-0" />

              {TRACKING_STAGES.map((stage, idx) => {
                const isPassed = idx <= currentStageIdx
                const isCurrent = idx === currentStageIdx

                return (
                  <div key={stage.key} className="flex items-start gap-4 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/20 scale-110 shadow-md'
                          : isPassed
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-sm font-extrabold ${
                            isPassed ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order Items & Address Summary */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Itemized Order Summary
              </h3>

              <div className="space-y-2 text-xs">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-slate-700">
                    <div>
                      <span className="font-extrabold text-slate-900">{item.product_name}</span>{' '}
                      <span className="text-[11px] text-emerald-700">({item.cutting_type || 'Cleaned'} • {item.quantity_kg}kg)</span>
                    </div>
                    <span className="font-extrabold text-slate-900">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount Paid</span>
                <span className="text-emerald-700">₹{order.total_amount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F8F5] border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Delivery Address:</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{order.delivery_address}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
