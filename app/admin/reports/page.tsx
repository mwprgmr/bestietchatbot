'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Fish,
  Calendar,
  DollarSign,
  PieChart as PieIcon,
  ArrowUpRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#16a34a', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [salesSummary, setSalesSummary] = useState({
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    totalOrdersCount: 0,
    avgOrderValue: 0,
    totalFishSoldKg: 0,
  })

  const [dailySalesData, setDailySalesData] = useState<any[]>([])
  const [fishShareData, setFishShareData] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchReportAnalytics()
  }, [])

  const fetchReportAnalytics = async () => {
    setLoading(true)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Calculate dates for 7 days ago and 30 days ago
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    try {
      // 1. Fetch Orders for analytics
      const { data: allOrders, error: ordersErr } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .neq('status', 'CANCELLED')

      if (ordersErr) throw ordersErr

      let todayRev = 0
      let weekRev = 0
      let monthRev = 0
      let totalKg = 0

      const dailyMap: Record<string, { date: string; sales: number; orders: number }> = {}

      allOrders?.forEach((ord) => {
        const amt = Number(ord.total_amount || 0)
        const dateStr = ord.created_at.split('T')[0]

        // Daily chart aggregator
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr.slice(5), sales: 0, orders: 0 }
        }
        dailyMap[dateStr].sales += amt
        dailyMap[dateStr].orders += 1

        if (dateStr === todayStr) todayRev += amt
        if (new Date(ord.created_at) >= new Date(weekAgo)) weekRev += amt
        if (new Date(ord.created_at) >= new Date(monthAgo)) monthRev += amt

        ord.items?.forEach((i: any) => {
          totalKg += Number(i.quantity_kg || 0)
        })
      })

      const totalCount = allOrders?.length || 0
      const totalRevAll = allOrders?.reduce((a, b) => a + Number(b.total_amount), 0) || 0
      const avgVal = totalCount > 0 ? totalRevAll / totalCount : 0

      setSalesSummary({
        todaySales: todayRev,
        weeklySales: weekRev,
        monthlySales: monthRev,
        totalOrdersCount: totalCount,
        avgOrderValue: Math.round(avgVal),
        totalFishSoldKg: Math.round(totalKg * 10) / 10,
      })

      // Convert daily map to array sorted by date
      const sortedDaily = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)

      setDailySalesData(sortedDaily)

      // 2. Calculate Fish share for Pie chart
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('*, product:products(*)')

      if (!itemsErr && items) {
        const fishMap: Record<string, number> = {}
        items.forEach((it) => {
          const name = it.product?.name || 'Fish'
          fishMap[name] = (fishMap[name] || 0) + Number(it.quantity_kg || 0)
        })

        const pieArr = Object.entries(fishMap).map(([name, value]) => ({
          name,
          value: Math.round(value * 10) / 10,
        }))
        setFishShareData(pieArr)
      }
    } catch (err) {
      console.error('Error fetching report analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Sales & Inventory Analytics Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial revenue metrics, order velocity, and fish consumption stats.
          </p>
        </div>
      </div>

      {/* Sales Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</p>
          <p className="text-lg font-extrabold text-emerald-700 mt-1">₹{salesSummary.todaySales.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">7-Day Sales</p>
          <p className="text-lg font-extrabold text-slate-900 mt-1">₹{salesSummary.weeklySales.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">30-Day Sales</p>
          <p className="text-lg font-extrabold text-slate-900 mt-1">₹{salesSummary.monthlySales.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</p>
          <p className="text-lg font-extrabold text-slate-900 mt-1">{salesSummary.totalOrdersCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Order Value</p>
          <p className="text-lg font-extrabold text-slate-900 mt-1">₹{salesSummary.avgOrderValue}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fish Sold</p>
          <p className="text-lg font-extrabold text-indigo-700 mt-1">{salesSummary.totalFishSoldKg} kg</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Bar Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Daily Revenue Trend (₹)
          </h3>

          <div className="h-64 w-full pt-4">
            {dailySalesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue records available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sales" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fish Share Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            Fish Product Consumption (kg)
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {fishShareData.length === 0 ? (
              <div className="text-xs text-slate-400">No fish item data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fishShareData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {fishShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
