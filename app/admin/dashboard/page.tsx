'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp,
  ShoppingBag,
  Fish,
  DollarSign,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Clock,
  Sparkles
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

import { useBranchContext } from '../BranchContext'
import { Store } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrdersCount: 0,
    fishSoldKg: 0,
    avgOrderValue: 0,
  })

  const [inventorySummary, setInventorySummary] = useState({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    list: [] as any[],
  })

  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [topSellingFish, setTopSellingFish] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const { selectedBranchId } = useBranchContext()

  useEffect(() => {
    fetchDashboardData()
  }, [selectedBranchId])

  const fetchDashboardData = async () => {
    setLoading(true)
    const todayStr = new Date().toISOString().split('T')[0]
    const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
    const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'

    try {
      const targetBranchId = selectedBranchId === FORT_KOCHI_ID ? FORT_KOCHI_ID : MARINE_DRIVE_ID

      // 1. Fetch Today's Orders for Sales KPI
      let ordersQuery = supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`)
        .neq('status', 'CANCELLED')

      ordersQuery = ordersQuery.eq('branch_id', targetBranchId)

      const { data: todayOrders, error: ordersErr } = await ordersQuery

      if (ordersErr) console.error('Orders KPI error:', ordersErr)

      const totalSales = todayOrders?.reduce((acc, o) => acc + Number(o.total_amount || o.total || 0), 0) || 0
      const ordersCount = todayOrders?.length || 0
      let totalKg = 0

      todayOrders?.forEach((o) => {
        o.items?.forEach((i: any) => {
          totalKg += Number(i.quantity_kg || 0)
        })
      })

      const avgOrder = ordersCount > 0 ? totalSales / ordersCount : 0

      setStats({
        todaySales: totalSales,
        todayOrdersCount: ordersCount,
        fishSoldKg: Math.round(totalKg * 10) / 10,
        avgOrderValue: Math.round(avgOrder),
      })

      // 2. Fetch Recent Orders list (branch filtered)
      const recentQuery = supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .eq('branch_id', targetBranchId)
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: recent, error: recentErr } = await recentQuery

      if (!recentErr) setRecentOrders(recent || [])

      // 3. Fetch Today's Inventory Status (branch filtered)
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('*, product:products(*)')
        .eq('inventory_date', todayStr)
        .eq('branch_id', targetBranchId)
        .order('created_at', { ascending: false })

      if (!invErr && invData) {
        let inStk = 0
        let lowStk = 0
        let outStk = 0

        invData.forEach((inv) => {
          const avail = Number(inv.available_stock)
          const thresh = Number(inv.low_stock_threshold || 2)

          if (avail <= 0) outStk++
          else if (avail <= thresh) lowStk++
          else inStk++
        })

        setInventorySummary({
          inStock: inStk,
          lowStock: lowStk,
          outOfStock: outStk,
          list: invData,
        })
      }

      // 4. Calculate Top Selling Fish
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .limit(100)

      if (!itemsErr && itemsData) {
        const map: Record<string, { name: string; category: string; kg: number; sales: number }> = {}

        itemsData.forEach((item) => {
          const pName = item.product?.name || 'Fish'
          if (!map[pName]) {
            map[pName] = {
              name: pName,
              category: item.product?.category || 'Fish',
              kg: 0,
              sales: 0,
            }
          }
          map[pName].kg += Number(item.quantity_kg || 0)
          map[pName].sales += Number(item.subtotal || 0)
        })

        const sorted = Object.values(map).sort((a, b) => b.kg - a.kg).slice(0, 4)
        setTopSellingFish(sorted)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Good Morning 👋
          </h1>
          <p className="text-xs font-semibold text-emerald-700 mt-1">
            Today's Fresh Overview — {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>

        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Boxes className="w-4 h-4" />
          <span>Manage Today's Inventory</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{stats.todaySales.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Live revenue today
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Orders</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.todayOrdersCount}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Processed orders</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fish Sold</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Fish className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.fishSoldKg} kg</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Fresh fish delivered</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Order Value</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">₹{stats.avgOrderValue}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Average per customer</p>
        </div>
      </div>

      {/* Main Grid: Inventory Status & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Inventory Status */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              Today's Inventory Status
            </h3>
            <Link href="/admin/inventory" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-lg font-extrabold text-emerald-700">{inventorySummary.inStock}</p>
              <p className="text-[10px] font-bold text-emerald-800 uppercase">In Stock</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-lg font-extrabold text-amber-700">{inventorySummary.lowStock}</p>
              <p className="text-[10px] font-bold text-amber-800 uppercase">Low Stock</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-lg font-extrabold text-red-700">{inventorySummary.outOfStock}</p>
              <p className="text-[10px] font-bold text-red-800 uppercase">Out of Stock</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Fish Availability</p>
            {inventorySummary.list.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No inventory added for today yet.</p>
            ) : (
              inventorySummary.list.slice(0, 5).map((inv) => {
                const avail = Number(inv.available_stock)
                const thresh = Number(inv.low_stock_threshold || 2)
                const isLow = avail > 0 && avail <= thresh
                const isOut = avail <= 0

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {inv.product?.image_url ? (
                          <img src={inv.product.image_url} alt={inv.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Fish className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900">{inv.product?.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">₹{inv.price_per_kg}/kg</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                          isOut
                            ? 'bg-red-100 text-red-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {avail} kg
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Recent Orders & Top Selling */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Recent Orders
              </h3>
              <Link href="/admin/orders" className="text-[11px] font-semibold text-emerald-600 hover:underline">
                View All Orders →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No orders received yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{ord.order_number}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {ord.customer?.name || ord.customer?.phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 text-sm">₹{ord.total_amount}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {format(new Date(ord.created_at), 'hh:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Fish Ranking */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Fish className="w-4 h-4 text-emerald-600" />
              Top Selling Fish
            </h3>

            {topSellingFish.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales data available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topSellingFish.map((fish, idx) => (
                  <div
                    key={fish.name}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{fish.name}</p>
                        <p className="text-[10px] text-slate-500">{fish.category}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{fish.kg.toFixed(1)} kg sold</p>
                      <p className="text-[10px] text-slate-400">₹{fish.sales}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
