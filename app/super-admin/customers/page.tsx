'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { Users, Search, RefreshCw, ShoppingBag, IndianRupee, Store, Phone, Award } from 'lucide-react'

function CustomersContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [filter])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      let query = supabase.from('customers').select(`
        *,
        preferred_branch:branches(*)
      `).order('created_at', { ascending: false })

      if (filter.branchId !== 'ALL') {
        query = query.eq('preferred_branch_id', filter.branchId)
      }

      const { data: custData } = await query
      if (!custData) {
        setCustomers([])
        return
      }

      // Fetch Order Aggregates per customer
      const { data: orderStats } = await supabase
        .from('orders')
        .select('customer_id, total, status')
        .gte('business_date', filter.startDate)
        .lte('business_date', filter.endDate)

      const statsMap: Record<string, { count: number; spend: number }> = {}
      if (orderStats) {
        orderStats.forEach((o) => {
          if (o.status !== 'cancelled') {
            if (!statsMap[o.customer_id]) {
              statsMap[o.customer_id] = { count: 0, spend: 0 }
            }
            statsMap[o.customer_id].count += 1
            statsMap[o.customer_id].spend += Number(o.total || 0)
          }
        })
      }

      const enriched = custData.map((c) => {
        const st = statsMap[c.id] || { count: 0, spend: 0 }
        return {
          ...c,
          ordersCount: st.count,
          totalSpend: st.spend,
          aov: st.count > 0 ? Math.round(st.spend / st.count) : 0,
        }
      })

      // Sort by total spend descending
      enriched.sort((a, b) => b.totalSpend - a.totalSpend)
      setCustomers(enriched)
    } catch (err) {
      console.error('Customer Analytics Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.preferred_branch?.name || '').toLowerCase().includes(q)
    )
  })

  const totalCustomersCount = customers.length
  const activeCustomersCount = customers.filter((c) => c.ordersCount > 0).length
  const inactiveCustomersCount = totalCustomersCount - activeCustomersCount

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">Aggregating Customer Analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">CUSTOMER ANALYTICS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Customer ordering behavior, lifetime value and branch preferences
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{totalCustomersCount}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Buyers in Period</span>
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{activeCustomersCount}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive Buyers</span>
            <Users className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-slate-400 mt-2">{inactiveCustomersCount}</p>
        </div>
      </div>

      {/* Customer Leaderboard Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Top Spenders Leaderboard
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name or phone..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-800">
                <th className="p-3.5">Rank / Customer</th>
                <th className="p-3.5">WhatsApp Phone</th>
                <th className="p-3.5">Total Orders</th>
                <th className="p-3.5">Total Spend</th>
                <th className="p-3.5">Avg Order Value</th>
                <th className="p-3.5">Preferred Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, index) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{c.name || 'Customer'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {c.id?.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      +{c.phone}
                    </td>
                    <td className="p-3.5 font-bold text-slate-200">
                      {c.ordersCount} orders
                    </td>
                    <td className="p-3.5 font-bold text-emerald-400 text-sm">
                      {formatCurrency(c.totalSpend)}
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">
                      {formatCurrency(c.aov)}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {c.preferred_branch?.name || 'Manvila Kazhakkoottam'}
                      </span>
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

export default function CustomerAnalyticsPage() {
  return (
    <SuperAdminLayout>
      <CustomersContent />
    </SuperAdminLayout>
  )
}
