'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { Package, RefreshCw, AlertTriangle, Search, Store, ArrowDown, ArrowUp } from 'lucide-react'

function InventoryContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [inventoryList, setInventoryList] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchInventory()
  }, [filter])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          product:products(*),
          branch:branches(*)
        `)
        .eq('inventory_date', filter.endDate)
        .order('available_stock', { ascending: true })

      if (filter.branchId !== 'ALL') {
        query = query.eq('branch_id', filter.branchId)
      }

      const { data } = await query
      if (data) setInventoryList(data)
    } catch (err) {
      console.error('Super Admin Inventory Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredInventory = inventoryList.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = (inv.product?.name || '').toLowerCase()
    const branch = (inv.branch?.name || '').toLowerCase()
    return name.includes(q) || branch.includes(q)
  })

  const lowStockCount = inventoryList.filter((inv) => Number(inv.available_stock || 0) < 5).length
  const totalUsableStock = inventoryList.reduce((acc, inv) => acc + Number(inv.total_usable_stock || inv.opening_stock || 0), 0)
  const totalSoldStock = inventoryList.reduce((acc, inv) => acc + Number(inv.sold_stock || 0), 0)
  const totalAvailableStock = inventoryList.reduce((acc, inv) => acc + Number(inv.available_stock || 0), 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">Aggregating Inventory Movements...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">INVENTORY & STOCK MOVEMENT ANALYTICS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Canonical stock movements: Opening stock, purchased stock, sold stock & available quantity for date {filter.endDate}
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Usable Stock</span>
          <p className="text-3xl font-black text-white mt-2">{totalUsableStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sold Stock</span>
          <p className="text-3xl font-black text-cyan-400 mt-2">{totalSoldStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Stock</span>
          <p className="text-3xl font-black text-emerald-400 mt-2">{totalAvailableStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
          <p className="text-3xl font-black text-amber-400 mt-2">{lowStockCount} items</p>
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Live Stock Level Table
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or branch..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-800">
                <th className="p-3.5">Fish Product</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Opening Stock</th>
                <th className="p-3.5">Purchased Stock</th>
                <th className="p-3.5">Sold Stock</th>
                <th className="p-3.5">Available Stock</th>
                <th className="p-3.5">Price / kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No stock records found for {filter.endDate}.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((inv) => {
                  const isLow = Number(inv.available_stock || 0) < 5
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        {inv.product?.name || 'Fish Product'}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {inv.branch?.name || 'Manvila'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-300">
                        {Number(inv.opening_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5 font-medium text-slate-300">
                        +{Number(inv.purchased_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5 font-bold text-cyan-400">
                        {Number(inv.sold_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold text-sm ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {Number(inv.available_stock || 0).toFixed(1)} kg
                        </span>
                        {isLow && (
                          <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        ₹{Number(inv.price_per_kg || inv.product?.price || 0).toLocaleString('en-IN')}
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

export default function SuperAdminInventoryPage() {
  return (
    <SuperAdminLayout>
      <InventoryContent />
    </SuperAdminLayout>
  )
}
