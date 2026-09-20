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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7FBA44]" />
        <p className="text-sm font-semibold">Aggregating Inventory Movements...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">INVENTORY & STOCK MOVEMENT ANALYTICS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Canonical stock movements: Opening stock, purchased stock, sold stock & available quantity for date {filter.endDate}
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Usable Stock</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalUsableStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sold Stock</span>
          <p className="text-3xl font-black text-cyan-600 mt-2">{totalSoldStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Stock</span>
          <p className="text-3xl font-black text-[#7FBA44] mt-2">{totalAvailableStock.toFixed(1)} kg</p>
        </div>

        <div className="bg-white border border-[#E2ECE7] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{lowStockCount} items</p>
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className="bg-white border border-[#E2ECE7] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2ECE7] flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-[#7FBA44]" />
            Live Stock Level Table
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or branch..."
              className="bg-white border border-[#E2ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7FBA44]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-[#E2ECE7]">
                <th className="p-3.5">Fish Product</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Opening Stock</th>
                <th className="p-3.5">Purchased Stock</th>
                <th className="p-3.5">Sold Stock</th>
                <th className="p-3.5">Available Stock</th>
                <th className="p-3.5">Price / kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
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
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        {inv.product?.name || 'Fish Product'}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {inv.branch?.name || 'Manvila'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        {Number(inv.opening_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        +{Number(inv.purchased_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5 font-bold text-cyan-600">
                        {Number(inv.sold_stock || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold text-sm ${isLow ? 'text-amber-600' : 'text-[#7FBA44]'}`}>
                          {Number(inv.available_stock || 0).toFixed(1)} kg
                        </span>
                        {isLow && (
                          <span className="ml-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
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
