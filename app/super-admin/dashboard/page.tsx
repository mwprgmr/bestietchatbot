'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingBag,
  IndianRupee,
  Users,
  MessageSquare,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Fish,
  Truck,
  CreditCard,
  Building2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

function DashboardContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [filter])

  const fetchDashboardData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data: res, error } = await supabase.rpc('get_super_admin_dashboard_summary', {
        p_start_date: filter.startDate,
        p_end_date: filter.endDate,
        p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
      })

      if (error) throw error
      setData(res)
    } catch (err: any) {
      console.error('Failed to load dashboard summary:', err)
      setErrorMsg(err.message || 'Error fetching production analytics.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">Aggregating Super Admin Dashboard...</p>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 flex items-start gap-4 shadow-sm">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-lg text-slate-900">Dashboard Error</h3>
          <p className="text-sm mt-1 text-red-600">{errorMsg}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            Retry Analytics Query
          </button>
        </div>
      </div>
    )
  }

  const stats = data || {}

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SUPER ADMIN DASHBOARD</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global production metrics for period {filter.startDate} to {filter.endDate}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Orders */}
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">{stats.total_orders || 0}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>WhatsApp: <strong className="text-slate-700">{stats.whatsapp_orders || 0}</strong></span>
            <span>Website: <strong className="text-slate-700">{stats.website_orders || 0}</strong></span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] border border-[#7FBA44]/30 flex items-center justify-center text-[#7FBA44]">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#7FBA44] mt-3">{formatCurrency(stats.total_revenue)}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>AOV: <strong className="text-slate-700">{formatCurrency(stats.avg_order_value)}</strong></span>
            <span>Delivery: <strong className="text-slate-700">{formatCurrency(stats.delivery_revenue)}</strong></span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Customers</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-3">{stats.total_customers || 0}</p>
          <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Registered customer database</span>
          </div>
        </div>

        {/* Fish Sold */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fish Quantity Sold</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Fish className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-teal-700 mt-3">{Number(stats.total_quantity_sold || 0).toLocaleString()} kg</p>
          <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Non-cancelled orders</span>
          </div>
        </div>
      </div>

      {/* Secondary Status & Payment Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Order Status Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Order Status Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <span className="text-xs font-semibold text-amber-900">Pending / Preparing</span>
              <span className="text-sm font-extrabold text-amber-700">{stats.pending_orders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-900">Completed / Delivered</span>
              <span className="text-sm font-extrabold text-emerald-700">{stats.completed_orders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
              <span className="text-xs font-semibold text-red-900">Cancelled</span>
              <span className="text-sm font-extrabold text-red-700">{stats.cancelled_orders || 0}</span>
            </div>
          </div>
        </div>

        {/* Order Source Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Order Source Channel
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">WhatsApp Chatbot</span>
              </div>
              <span className="text-sm font-extrabold text-emerald-700">{stats.whatsapp_orders || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">Web App Direct</span>
              </div>
              <span className="text-sm font-extrabold text-blue-700">{stats.website_orders || 0}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Split */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            Payment Method Split
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <span className="text-xs font-semibold text-slate-800">Cash on Delivery (COD)</span>
              <span className="text-sm font-extrabold text-purple-700">{formatCurrency(stats.cod_revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-slate-800">Online Payments</span>
              <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(stats.online_revenue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboardPage() {
  return (
    <SuperAdminLayout>
      <DashboardContent />
    </SuperAdminLayout>
  )
}
