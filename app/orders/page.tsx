'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShoppingBag, Truck, Clock, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react'

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomerOrders() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: oList } = await supabase
          .from('orders')
          .select('*, branch:branches(name), items:order_items(*)')
          .order('created_at', { ascending: false })
          .limit(20)

        setOrders(oList || [])
      } catch (err) {
        console.error('Error loading customer orders:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCustomerOrders()
  }, [])

  return (
    <StorefrontLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MY ORDERS HISTORY</h1>
          <p className="text-xs text-slate-500">Track current fresh deliveries and view past orders</p>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase">Loading order history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-[#F7F8F5] rounded-3xl border border-slate-200 text-slate-500 space-y-3 max-w-md mx-auto">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-400" />
            <h2 className="text-base font-extrabold text-slate-900">No Past Orders Yet</h2>
            <p className="text-xs">Once you place an order for fresh fish or meat, it will appear here.</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md"
            >
              BROWSE STOREFRONT
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const formattedDate = new Date(o.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })

              return (
                <div
                  key={o.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          Order #{o.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            o.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status || 'PLACED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Placed on {formattedDate} • {o.branch?.name || 'Bestiet Fresh Branch'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-emerald-700">₹{o.total_amount}</div>
                      <div className="text-[10px] text-slate-400">{o.payment_method || 'Pay on Delivery'}</div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {o.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span>
                          {item.product_name}{' '}
                          <span className="text-[11px] text-slate-500">
                            ({item.cutting_type || 'Cleaned'} • {item.quantity_kg}kg)
                          </span>
                        </span>
                        <span className="font-bold text-slate-900">₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" /> {o.delivery_slot || 'Express Slot'}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, query regarding order #${o.order_number}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Support
                      </a>

                      <Link
                        href={`/track/${o.id}`}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Status</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
