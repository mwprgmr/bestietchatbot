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
          <h1 className="text-2xl font-black text-[#232B1E] tracking-tight">MY ORDERS HISTORY</h1>
          <p className="text-xs text-[#232B1E]/70">Track current fresh deliveries and view past orders</p>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#8B9A6E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#232B1E]/70 uppercase">Loading order history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-[#F7F2EB] rounded-3xl border border-[#EEEEEE] text-[#232B1E]/70 space-y-3 max-w-md mx-auto">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#8B9A6E]" />
            <h2 className="text-base font-extrabold text-[#232B1E]">No Past Orders Yet</h2>
            <p className="text-xs">Once you place an order for fresh fish or meat, it will appear here.</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold text-xs rounded-xl shadow-md"
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
                  className="bg-white rounded-3xl p-5 border border-[#EEEEEE] shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#EEEEEE]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#232B1E]">
                          Order #{o.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            o.status === 'DELIVERED'
                              ? 'bg-[#8B9A6E] text-white'
                              : o.status === 'CANCELLED'
                              ? 'bg-[#232B1E] text-white'
                              : 'bg-[#8B9A6E]/20 text-[#232B1E]'
                          }`}
                        >
                          {o.status || 'PLACED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#232B1E]/60 mt-0.5">
                        Placed on {formattedDate} • {o.branch?.name || 'Bestiet Fresh Branch'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-[#8B9A6E]">₹{o.total_amount}</div>
                      <div className="text-[10px] text-[#232B1E]/60">{o.payment_method || 'Pay on Delivery'}</div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1.5 text-xs text-[#232B1E]/80">
                    {o.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span>
                          {item.product_name}{' '}
                          <span className="text-[11px] text-[#232B1E]/60">
                            ({item.cutting_type || 'Cleaned'} • {item.quantity_kg}kg)
                          </span>
                        </span>
                        <span className="font-bold text-[#232B1E]">₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-[#EEEEEE] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#232B1E]/70 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#8B9A6E]" /> {o.delivery_slot || 'Express Slot'}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/919656055969?text=${encodeURIComponent(`Hi Bestiet Fresh, query regarding order #${o.order_number}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#EEEEEE] hover:bg-[#8B9A6E]/20 text-[#232B1E] font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#8B9A6E]" /> Support
                      </a>

                      <Link
                        href={`/track/${o.id}`}
                        className="px-3.5 py-1.5 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1"
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
