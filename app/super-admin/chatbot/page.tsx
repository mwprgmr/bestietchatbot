'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  RefreshCw,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  Store,
  Clock,
  Filter,
  Megaphone
} from 'lucide-react'

function ChatbotContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [openingConfig, setOpeningConfig] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchChatbotData()
  }, [filter])

  const fetchChatbotData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Chatbot Analytics RPC
      const { data: analyticsRes, error: aErr } = await supabase.rpc('get_chatbot_analytics', {
        p_start_date: filter.startDate,
        p_end_date: filter.endDate,
        p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
      })
      if (!aErr) setData(analyticsRes)

      // 2. Fetch Chatbot Sessions
      let query = supabase.from('chat_sessions').select(`
        *,
        customer:customers(*),
        branch:branches(*)
      `).order('updated_at', { ascending: false }).limit(50)

      if (filter.branchId !== 'ALL') {
        query = query.eq('branch_id', filter.branchId)
      }

      const { data: sessData } = await query
      if (sessData) setSessions(sessData)

      // 3. Fetch Store / Opening Message Config
      const { data: storeSettings } = await supabase.rpc('get_store_business_settings')
      if (storeSettings && storeSettings.length > 0) {
        setOpeningConfig(storeSettings[0])
      }

    } catch (err) {
      console.error('Chatbot Analytics Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = data || {}

  // Conversion calculations
  const totalConvs = stats.total_conversations || 1
  const cartCreated = stats.cart_created || 0
  const checkoutStarted = stats.checkout_started || 0
  const ordersCreated = stats.orders_created || 0
  const completedOrders = stats.completed_orders || 0

  const convToCart = Math.round((cartCreated / totalConvs) * 100)
  const cartToCheckout = cartCreated > 0 ? Math.round((checkoutStarted / cartCreated) * 100) : 0
  const checkoutToOrder = checkoutStarted > 0 ? Math.round((ordersCreated / checkoutStarted) * 100) : 0
  const orderToCompletion = ordersCreated > 0 ? Math.round((completedOrders / ordersCreated) * 100) : 0

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    const phone = s.customer?.phone || s.phone || ''
    const name = s.customer?.name || ''
    const state = s.state || ''
    return phone.includes(q) || name.toLowerCase().includes(q) || state.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7FBA44]" />
        <p className="text-sm font-semibold">Loading WhatsApp Chatbot Analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">WHATSAPP CHATBOT ANALYTICS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real customer interaction events & conversion metrics
          </p>
        </div>
        <button
          onClick={fetchChatbotData}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Opening Message Widget */}
      {openingConfig && (
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#7FBA44]/30 flex items-center justify-center text-[#7FBA44] shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Chatbot Greeting Tagline</h3>
                <span className="bg-[#F0FDF4] text-[#71A83A] border border-[#7FBA44]/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-1">
                "{openingConfig.tagline || 'Your Fresh Friend At The Door'}"
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Store Brand: {openingConfig.brand_name || 'Bestiet Fresh'} • Delivery Charge: ₹{openingConfig.delivery_charge || 30}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Event Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conversations</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_conversations || 0}</p>
        </div>
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cart Created</p>
          <p className="text-2xl font-black text-cyan-600 mt-1">{stats.cart_created || 0}</p>
        </div>
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Checkout Started</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.checkout_started || 0}</p>
        </div>
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Orders Confirmed</p>
          <p className="text-2xl font-black text-[#7FBA44] mt-1">{stats.orders_created || 0}</p>
        </div>
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No Stock Events</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.no_inventory_events || 0}</p>
        </div>
        <div className="bg-white border border-[#E2ECE7] p-4 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cart Clears</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.cart_clears || 0}</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border border-[#E2ECE7] rounded-2xl p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Chatbot Conversion Funnel</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7] relative">
            <div className="text-[11px] font-bold text-slate-600">Step 1: Start → Cart</div>
            <div className="text-2xl font-black text-cyan-600 mt-1">{convToCart}%</div>
            <p className="text-[10px] text-slate-500 mt-1">{cartCreated} of {stats.total_conversations || 0} users added items</p>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7] relative">
            <div className="text-[11px] font-bold text-slate-600">Step 2: Cart → Checkout</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{cartToCheckout}%</div>
            <p className="text-[10px] text-slate-500 mt-1">{checkoutStarted} of {cartCreated} carts proceeded</p>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7] relative">
            <div className="text-[11px] font-bold text-slate-600">Step 3: Checkout → Order</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{checkoutToOrder}%</div>
            <p className="text-[10px] text-slate-500 mt-1">{ordersCreated} of {checkoutStarted} checkouts confirmed</p>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7] relative">
            <div className="text-[11px] font-bold text-slate-600">Step 4: Order → Delivered</div>
            <div className="text-2xl font-black text-[#7FBA44] mt-1">{orderToCompletion}%</div>
            <p className="text-[10px] text-slate-500 mt-1">{completedOrders} of {ordersCreated} completed</p>
          </div>
        </div>
      </div>

      {/* Chatbot Session Table */}
      <div className="bg-white border border-[#E2ECE7] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2ECE7] flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Active Chatbot Sessions</h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone or state..."
              className="bg-white border border-[#E2ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7FBA44]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-[#E2ECE7]">
                <th className="p-3.5">Customer / Phone</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Current State</th>
                <th className="p-3.5">Cart Items</th>
                <th className="p-3.5">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    No active chatbot sessions found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{s.customer?.name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        +{s.customer?.phone || s.phone}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700">
                        {s.branch?.name || 'Default Branch'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-[#F0FDF4] border border-[#7FBA44]/30 text-[#71A83A] font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        {s.state}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {Array.isArray(s.cart) ? s.cart.length : 0} items
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ChatbotAnalyticsPage() {
  return (
    <SuperAdminLayout>
      <ChatbotContent />
    </SuperAdminLayout>
  )
}
