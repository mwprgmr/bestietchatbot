'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee, TrendingUp, RefreshCw, CreditCard, DollarSign, Truck, AlertTriangle } from 'lucide-react'

function RevenueContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<any>(null)

  useEffect(() => {
    fetchRevenueData()
  }, [filter])

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      const { data: res } = await supabase.rpc('get_super_admin_dashboard_summary', {
        p_start_date: filter.startDate,
        p_end_date: filter.endDate,
        p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
      })

      // Fetch Cancelled Orders Value
      const { data: cancelledOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'cancelled')
        .gte('business_date', filter.startDate)
        .lte('business_date', filter.endDate)

      let cancelledVal = 0
      if (cancelledOrders) {
        cancelledVal = cancelledOrders.reduce((acc, curr) => acc + Number(curr.total || 0), 0)
      }

      setRevenueData({
        ...res,
        cancelled_value: cancelledVal,
      })
    } catch (err) {
      console.error('Revenue Analytics Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">Calculating Revenue Analytics...</p>
      </div>
    )
  }

  const r = revenueData || {}
  const grossSales = Number(r.total_revenue || 0)
  const deliveryFees = Number(r.delivery_revenue || 0)
  const netSales = grossSales - deliveryFees
  const cancelledValue = Number(r.cancelled_value || 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">REVENUE & FINANCIAL ANALYTICS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Financial breakdown, net sales, delivery fees and cancelled value
          </p>
        </div>
        <button
          onClick={fetchRevenueData}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales</span>
          <p className="text-3xl font-black text-emerald-400 mt-2">{formatCurrency(grossSales)}</p>
          <p className="text-[11px] text-slate-500 mt-2">All completed & non-cancelled orders</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Fish Sales</span>
          <p className="text-3xl font-black text-cyan-400 mt-2">{formatCurrency(netSales)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Gross sales minus delivery charges</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Charges Collected</span>
          <p className="text-3xl font-black text-blue-400 mt-2">{formatCurrency(deliveryFees)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Standard ₹30 delivery per order</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled Orders Value</span>
          <p className="text-3xl font-black text-red-400 mt-2">{formatCurrency(cancelledValue)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Lost revenue from cancellations</p>
        </div>
      </div>

      {/* Financial Split Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Payment Method Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Cash on Delivery (COD)</span>
              <span className="text-sm font-bold text-purple-400">{formatCurrency(r.cod_revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Online Payments</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(r.online_revenue)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Key Performance Metric</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Average Order Value (AOV)</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(r.avg_order_value)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Total Non-Cancelled Orders</span>
              <span className="text-sm font-bold text-white">{r.total_orders || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminRevenuePage() {
  return (
    <SuperAdminLayout>
      <RevenueContent />
    </SuperAdminLayout>
  )
}
