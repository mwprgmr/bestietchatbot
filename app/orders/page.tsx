'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShoppingBag, Truck, Clock, ArrowRight, MessageSquare, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomerOrders()
  }, [])

  const loadCustomerOrders = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      let phone: string | null = null
      let localOrderIds: string[] = []

      try {
        phone = localStorage.getItem('bestiet_customer_phone')
        const rawPlaced = localStorage.getItem('bestiet_placed_orders')
        if (rawPlaced) localOrderIds = JSON.parse(rawPlaced)
      } catch (_) {}

      let query = supabase
        .from('orders')
        .select('*, branch:branches(name), items:order_items(*)')
        .order('created_at', { ascending: false })

      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '')
        const { data: custData } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle()

        if (custData?.id) {
          query = query.eq('customer_id', custData.id)
        } else if (localOrderIds.length > 0) {
          query = query.in('id', localOrderIds)
        } else {
          query = query.limit(20)
        }
      } else if (localOrderIds.length > 0) {
        query = query.in('id', localOrderIds)
      } else {
        query = query.limit(20)
      }

      const { data: oList } = await query
      setOrders(oList || [])
    } catch (err) {
      console.error('Error loading customer orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const isOrderActive = (statusRaw: string | undefined) => {
    const s = (statusRaw || 'PENDING').toUpperCase()
    return s !== 'DELIVERED' && s !== 'CANCELLED'
  }

  const activeOrders = orders.filter((o) => isOrderActive(o.status))
  const pastOrders = orders.filter((o) => !isOrderActive(o.status))

  return (
    <StorefrontLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">MY ORDERS & DELIVERIES</h1>
            <p className="text-xs text-[#0F172A]/70">Track live fresh catch orders and review past delivery history</p>
          </div>
          <button
            onClick={loadCustomerOrders}
            className="p-2.5 bg-[#E2E8F0] hover:bg-[#39B54A]/20 text-[#0F172A] rounded-xl transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#39B54A]' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#39B54A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#0F172A]/70 uppercase">Loading order details...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] rounded-3xl border border-[#E2E8F0] text-[#0F172A]/70 space-y-3 max-w-md mx-auto">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#39B54A]" />
            <h2 className="text-base font-extrabold text-[#0F172A]">No Orders Found</h2>
            <p className="text-xs">Once you place an order for fresh fish or meat, it will appear here live.</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-extrabold text-xs rounded-xl shadow-md"
            >
              BROWSE STOREFRONT
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. ACTIVE / ONGOING ORDERS SECTION */}
            {activeOrders.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="w-3 h-3 rounded-full bg-[#39B54A] animate-ping" />
                  <h2 className="text-base font-black text-[#0F172A] uppercase tracking-wider">
                    Active & In-Progress Orders ({activeOrders.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {activeOrders.map((o) => {
                    const formattedDate = new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div
                        key={o.id}
                        className="bg-white rounded-3xl p-5 border-2 border-[#39B54A]/40 shadow-md space-y-4 relative overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-[#0F172A]">
                                Order #{o.order_number}
                              </span>
                              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#39B54A] text-white uppercase tracking-wider animate-pulse flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {(o.status || 'PENDING').replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#0F172A]/70 mt-1 font-semibold">
                              Placed on {formattedDate} • {o.branch?.name || 'Bestiet Fresh Branch'}
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="text-lg font-black text-[#39B54A]">₹{o.total_amount}</div>
                            <div className="text-[10px] font-bold text-[#0F172A]/60">{o.payment_method || 'Pay on Delivery'} ({o.payment_status || 'PENDING'})</div>
                          </div>
                        </div>

                        {/* Items Breakdown */}
                        <div className="space-y-1.5 text-xs text-[#0F172A]">
                          {o.items?.map((item: any, idx: number) => {
                            const pName = item.product?.name || item.product_name || 'Fresh Fish'
                            const qtyKg = item.quantity_kg ?? item.quantity ?? 0
                            const cutType = (item.cutting_type || item.cut_type || 'whole').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                            return (
                              <div key={item.id || idx} className="flex justify-between items-center py-0.5">
                                <span className="font-semibold text-xs text-[#0F172A]">
                                  🐟 {pName}{' '}
                                  <span className="text-[11px] text-[#0F172A]/70 font-bold ml-1">
                                    — {qtyKg}kg <span className="font-normal text-[#0F172A]/60">({cutType})</span>
                                  </span>
                                </span>
                                <span className="font-extrabold text-[#0F172A]">₹{item.subtotal}</span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Footer & Action Buttons */}
                        <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xs text-[#0F172A]/80 font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[#39B54A]" /> {o.delivery_slot || 'Express Slot'}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, query regarding active order #${o.order_number}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 bg-[#E2E8F0] hover:bg-[#39B54A]/20 text-[#0F172A] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#39B54A]" /> Support
                            </a>

                            <Link
                              href={`/track/${o.id}`}
                              className="px-4 py-2 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                            >
                              <Truck className="w-4 h-4" />
                              <span>LIVE TRACK ORDER</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 2. PAST / COMPLETED ORDERS SECTION */}
            {pastOrders.length > 0 && (
              <section className="space-y-4">
                <div className="pb-2 border-b border-[#E2E8F0]">
                  <h2 className="text-sm font-black text-[#0F172A]/70 uppercase tracking-wider">
                    Completed & Past Deliveries ({pastOrders.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {pastOrders.map((o) => {
                    const formattedDate = new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })

                    const isDelivered = (o.status || '').toUpperCase() === 'DELIVERED'

                    return (
                      <div
                        key={o.id}
                        className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-[#0F172A]">
                                Order #{o.order_number}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  isDelivered
                                    ? 'bg-[#39B54A]/20 text-[#0F172A]'
                                    : 'bg-[#0F172A] text-white'
                                }`}
                              >
                                {o.status || 'DELIVERED'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#0F172A]/60 mt-0.5">
                              Delivered on {formattedDate} • {o.branch?.name || 'Bestiet Fresh Branch'}
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="text-base font-black text-[#0F172A]">₹{o.total_amount}</div>
                            <div className="text-[10px] text-[#0F172A]/60">{o.payment_method || 'Pay on Delivery'}</div>
                          </div>
                        </div>

                        {/* Items Summary */}
                        <div className="space-y-1 text-xs text-[#0F172A]/80">
                          {o.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <span>
                                {item.product_name}{' '}
                                <span className="text-[11px] text-[#0F172A]/60">
                                  ({item.cutting_type || 'Cleaned'} • {item.quantity_kg}kg)
                                </span>
                              </span>
                              <span className="font-bold text-[#0F172A]">₹{item.subtotal}</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[#0F172A]/60">
                            {o.delivery_slot || 'Express Slot'}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, support needed for past order #${o.order_number}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-[#E2E8F0] hover:bg-[#39B54A]/20 text-[#0F172A] font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#39B54A]" /> Support
                            </a>

                            <Link
                              href={`/order-success/${o.id}?num=${o.order_number}`}
                              className="px-3 py-1 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-bold rounded-xl text-xs transition-all"
                            >
                              View Receipt
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
