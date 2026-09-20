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
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">REVENUE & FINANCIAL ANALYTICS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Financial breakdown, net sales, delivery fees and cancelled value
          </p>
        </div>
        <button
          onClick={fetchRevenueData}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales</span>
          <p className="text-3xl font-black text-[#7FBA44] mt-2">{formatCurrency(grossSales)}</p>
          <p className="text-[11px] text-slate-500 mt-2">All completed & non-cancelled orders</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Fish Sales</span>
          <p className="text-3xl font-black text-cyan-600 mt-2">{formatCurrency(netSales)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Gross sales minus delivery charges</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Charges Collected</span>
          <p className="text-3xl font-black text-blue-600 mt-2">{formatCurrency(deliveryFees)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Standard ₹30 delivery per order</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancelled Orders Value</span>
          <p className="text-3xl font-black text-red-600 mt-2">{formatCurrency(cancelledValue)}</p>
          <p className="text-[11px] text-slate-500 mt-2">Lost revenue from cancellations</p>
        </div>
      </div>

      {/* Financial Split Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Payment Method Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2ECE7]">
              <span className="text-xs font-bold text-slate-700">Cash on Delivery (COD)</span>
              <span className="text-sm font-black text-purple-600">{formatCurrency(r.cod_revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2ECE7]">
              <span className="text-xs font-bold text-slate-700">Online Payments</span>
              <span className="text-sm font-black text-[#7FBA44]">{formatCurrency(r.online_revenue)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Key Performance Metric</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2ECE7]">
              <span className="text-xs font-bold text-slate-700">Average Order Value (AOV)</span>
              <span className="text-sm font-black text-[#7FBA44]">{formatCurrency(r.avg_order_value)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2ECE7]">
              <span className="text-xs font-bold text-slate-700">Total Non-Cancelled Orders</span>
              <span className="text-sm font-black text-slate-900">{r.total_orders || 0}</span>
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
