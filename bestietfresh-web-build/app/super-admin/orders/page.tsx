'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Search, RefreshCw, MessageSquare, Globe, Store, Phone, ExternalLink } from 'lucide-react'

function OrdersContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchOrders()
  }, [filter, statusFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          branch:branches(*),
          items:order_items(*, product:products(*))
        `)
        .gte('business_date', filter.startDate)
        .lte('business_date', filter.endDate)
        .order('created_at', { ascending: false })

      if (filter.branchId !== 'ALL') {
        query = query.eq('branch_id', filter.branchId)
      }

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter.toLowerCase())
      }

      const { data, error } = await query
      if (error) throw error

      const production = (data || []).filter((o: any) => {
        if (o.source === 'test') return false
        const remarks = o.customer_remarks || ''
        const custName = o.customer?.name || ''
        const phone = o.customer_phone || o.customer?.phone || ''
        if (remarks.includes('[TEST_ORDER]') || remarks.includes('Tester') || custName.includes('Tester') || phone.startsWith('91987654')) {
          return false
        }
        return true
      })

      setOrders(production)
    } catch (err) {
      console.error('Super Admin Orders Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatWhatsAppPhone = (phoneRaw: string | undefined | null) => {
    if (!phoneRaw) return { display: 'N/A', raw: '' }
    let digits = String(phoneRaw).replace(/\D/g, '')
    if (digits.length === 10) digits = `91${digits}`
    if (digits.startsWith('91') && digits.length === 12) {
      return { display: `+91 ${digits.slice(2)}`, raw: digits }
    }
    return { display: phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`, raw: digits }
  }

  const filteredOrders = orders.filter((ord) => {
    if (!search) return true
    const q = search.toLowerCase()
    const num = (ord.order_number || '').toLowerCase()
    const custId = (ord.customer_id || '').toLowerCase()
    const phone = ord.customer_phone || ord.customer?.phone || ''
    const phoneInfo = formatWhatsAppPhone(phone)
    const name = (ord.customer?.name || '').toLowerCase()
    return num.includes(q) || custId.includes(q) || phoneInfo.raw.includes(q) || phoneInfo.display.includes(q) || name.includes(q)
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">Loading Production Orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">ORDER ANALYTICS & LOG</h1>
          <p className="text-xs text-slate-400 mt-1">
            Global order monitoring across WhatsApp and Website channels
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PREPARING">Preparing</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="text-xs text-slate-400 font-medium">({filteredOrders.length} orders found)</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, phone, customer..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-800">
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Customer & WhatsApp</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const phoneInfo = formatWhatsAppPhone(ord.customer_phone || ord.customer?.phone)
                  const isWa = (ord.source || 'whatsapp').toLowerCase() === 'whatsapp'
                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white font-mono">
                        {ord.order_number}
                      </td>
                      <td className="p-3.5">
                        {isWa ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Globe className="w-3 h-3" /> Website
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {ord.branch?.name || 'Manvila'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{ord.customer?.name || 'Customer'}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span>{phoneInfo.display}</span>
                          {phoneInfo.raw && (
                            <a
                              href={`https://wa.me/${phoneInfo.raw}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300"
                              title="Open WhatsApp Chat"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400 text-sm">
                        ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          ord.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {ord.business_date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminOrdersPage() {
  return (
    <SuperAdminLayout>
      <OrdersContent />
    </SuperAdminLayout>
  )
}
