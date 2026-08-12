'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Inventory, Product, InventoryMovement, InventoryStatus, MovementType } from '@/types/database'
import {
  Boxes,
  Plus,
  Calendar as CalendarIcon,
  Search,
  Sliders,
  History,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Fish,
  DollarSign
} from 'lucide-react'
import { format } from 'date-fns'

export default function InventoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [inventoryList, setInventoryList] = useState<Inventory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryStatus>('ALL')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // Selected item for adjust / history
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Add Inventory form
  const [addForm, setAddForm] = useState({
    product_id: '',
    price_per_kg: '',
    opening_stock: '',
    low_stock_threshold: '2',
  })

  // Adjust Stock form
  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: 'RESTOCK' as MovementType,
    adjustment_qty: '',
    reason: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [selectedDate])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data || [])
        if (data && data.length > 0 && !addForm.product_id) {
          setAddForm((prev) => ({ ...prev, product_id: data[0].id }))
        }
        return
      }

      // Client query fallback
      const { data: clientProducts } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientProducts) {
        setProducts(clientProducts)
        if (clientProducts.length > 0 && !addForm.product_id) {
          setAddForm((prev) => ({ ...prev, product_id: clientProducts[0].id }))
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/inventory?date=${selectedDate}`)
      if (!res.ok) {
        const text = await res.text()
        console.error('Server returned non-OK status for inventory fetch:', res.status, text)

        const { data: clientData, error: clientErr } = await supabase
          .from('inventory')
          .select('*, product:products(*)')
          .eq('inventory_date', selectedDate)
          .order('created_at', { ascending: false })

        if (clientErr) throw clientErr
        setInventoryList(clientData || [])
        return
      }

      const data = await res.json()
      setInventoryList(data || [])
    } catch (err: any) {
      console.error('Error fetching inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatus = (inv: Inventory): InventoryStatus => {
    const avail = Number(inv.available_stock)
    const threshold = Number(inv.low_stock_threshold || 2)
    if (avail <= 0) return 'OUT_OF_STOCK'
    if (avail <= threshold) return 'LOW_STOCK'
    return 'AVAILABLE'
  }

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: addForm.product_id,
          inventory_date: selectedDate,
          price_per_kg: addForm.price_per_kg,
          opening_stock: addForm.opening_stock,
          low_stock_threshold: addForm.low_stock_threshold,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Server returned non-OK status:', res.status, text)

        // Fallback to client RPC or direct upsert
        const price = parseFloat(addForm.price_per_kg)
        const stock = parseFloat(addForm.opening_stock)
        const threshold = parseFloat(addForm.low_stock_threshold || '2')

        const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_inventory_sec', {
          p_product_id: addForm.product_id,
          p_inventory_date: selectedDate,
          p_price_per_kg: price,
          p_opening_stock: stock,
          p_low_stock_threshold: threshold,
        })

        if (rpcErr) {
          const { error: directErr } = await supabase
            .from('inventory')
            .upsert({
              product_id: addForm.product_id,
              inventory_date: selectedDate,
              price_per_kg: price,
              opening_stock: stock,
              available_stock: stock,
              sold_stock: 0,
              reserved_stock: 0,
              low_stock_threshold: threshold,
              updated_at: new Date().toISOString(),
            })
          if (directErr) throw directErr
        }
      }

      setIsAddModalOpen(false)
      fetchInventory()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save inventory')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenAdjustModal = (inv: Inventory) => {
    setSelectedInventory(inv)
    setAdjustForm({
      adjustment_type: 'RESTOCK',
      adjustment_qty: '',
      reason: '',
    })
    setFormError(null)
    setIsAdjustModalOpen(true)
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInventory) return
    setSubmitting(true)
    setFormError(null)

    try {
      const rawQty = parseFloat(adjustForm.adjustment_qty)
      if (isNaN(rawQty) || rawQty <= 0) throw new Error('Quantity must be greater than 0')

      let changeQty = rawQty
      if (['DAMAGED', 'MANUAL_ADJUSTMENT'].includes(adjustForm.adjustment_type)) {
        changeQty = -Math.abs(rawQty)
      } else {
        changeQty = Math.abs(rawQty)
      }

      const { data, error } = await supabase.rpc('adjust_inventory_stock', {
        p_inventory_id: selectedInventory.id,
        p_adjustment_qty: changeQty,
        p_movement_type: adjustForm.adjustment_type,
        p_reason: adjustForm.reason || `Adjusted stock (${adjustForm.adjustment_type})`,
      })

      if (error) throw error

      setIsAdjustModalOpen(false)
      fetchInventory()
    } catch (err: any) {
      setFormError(err.message || 'Failed to adjust stock')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenHistory = async (inv: Inventory) => {
    setSelectedInventory(inv)
    setIsHistoryDrawerOpen(true)
    setHistoryLoading(true)

    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('inventory_id', inv.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMovements(data || [])
    } catch (err) {
      console.error('Error fetching movement history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredInventory = inventoryList.filter((inv) => {
    const pName = inv.product?.name || ''
    const matchesSearch = pName.toLowerCase().includes(search.toLowerCase())
    const status = calculateStatus(inv)
    const matchesStatus = statusFilter === 'ALL' || statusFilter === status
    return matchesSearch && matchesStatus
  })

  // Quick stats
  const totalFishCount = inventoryList.length
  const availableCount = inventoryList.filter((i) => calculateStatus(i) === 'AVAILABLE').length
  const lowStockCount = inventoryList.filter((i) => calculateStatus(i) === 'LOW_STOCK').length
  const outOfStockCount = inventoryList.filter((i) => calculateStatus(i) === 'OUT_OF_STOCK').length

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-600" />
            Daily Fish Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage date-based fresh stock, prices, adjustments, and live WhatsApp sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Presets */}
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              const tm = new Date()
              tm.setDate(tm.getDate() + 1)
              setSelectedDate(tm.toISOString().split('T')[0])
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tomorrow
          </button>

          {/* Date Picker Input */}
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fish Stock</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fish Added</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{totalFishCount}</p>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">In Stock (Available)</p>
          <p className="text-xl font-extrabold text-emerald-800 mt-1">{availableCount}</p>
        </div>
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Low Stock Alert</p>
          <p className="text-xl font-extrabold text-amber-800 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-xs">
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Out of Stock</p>
          <p className="text-xl font-extrabold text-red-800 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fish in today's stock..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'All Items'
                : st === 'AVAILABLE'
                ? 'In Stock'
                : st === 'LOW_STOCK'
                ? 'Low Stock'
                : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading inventory for {selectedDate}...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Fish className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No fish added for {selectedDate}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "+ Add Fish Stock" to configure prices and opening inventory for this date.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fish To Inventory</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fish Product</th>
                  <th className="py-3.5 px-4">Price / kg</th>
                  <th className="py-3.5 px-4">Opening</th>
                  <th className="py-3.5 px-4">Sold</th>
                  <th className="py-3.5 px-4">Available</th>
                  <th className="py-3.5 px-4">Threshold</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredInventory.map((inv) => {
                  const status = calculateStatus(inv)
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {inv.product?.image_url ? (
                              <img
                                src={inv.product.image_url}
                                alt={inv.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Fish className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{inv.product?.name}</p>
                            <p className="text-[11px] text-slate-500">{inv.product?.category || 'Fish'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 text-sm">₹{inv.price_per_kg}</span>
                        <span className="text-[10px] text-slate-400 block">/kg</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{inv.opening_stock} kg</td>

                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">{inv.sold_stock} kg</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-extrabold text-sm ${
                            status === 'OUT_OF_STOCK'
                              ? 'text-red-600'
                              : status === 'LOW_STOCK'
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {inv.available_stock} kg
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">{inv.low_stock_threshold} kg</td>

                      <td className="py-3.5 px-4">
                        {status === 'AVAILABLE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Available
                          </span>
                        )}
                        {status === 'LOW_STOCK' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock
                          </span>
                        )}
                        {status === 'OUT_OF_STOCK' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Out of Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAdjustModal(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => handleOpenHistory(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Audit Movement History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add Fish To Inventory ({selectedDate})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInventory} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Fish Product *
                </label>
                <select
                  required
                  value={addForm.product_id}
                  onChange={(e) => setAddForm({ ...addForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price per kg (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addForm.price_per_kg}
                    onChange={(e) => setAddForm({ ...addForm, price_per_kg: e.target.value })}
                    placeholder="220"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Stock (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={addForm.opening_stock}
                    onChange={(e) => setAddForm({ ...addForm, opening_stock: e.target.value })}
                    placeholder="15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Low Stock Threshold (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={addForm.low_stock_threshold}
                  onChange={(e) => setAddForm({ ...addForm, low_stock_threshold: e.target.value })}
                  placeholder="2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedInventory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Adjust Stock: {selectedInventory.product?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Current Available Stock: <strong className="text-emerald-700">{selectedInventory.available_stock} kg</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustForm.adjustment_type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value as MovementType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="RESTOCK">+ Restock (Add Stock)</option>
                  <option value="DAMAGED">- Damaged / Spoiled (Remove Stock)</option>
                  <option value="MANUAL_ADJUSTMENT">- Manual Correction / Removal</option>
                  <option value="RETURN">+ Customer Return</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={adjustForm.adjustment_qty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_qty: e.target.value })}
                  placeholder="e.g. 1.5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment
                </label>
                <textarea
                  rows={2}
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Damaged in transport, evening restock"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Audit History Drawer */}
      {isHistoryDrawerOpen && selectedInventory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  Audit Log: {selectedInventory.product?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {selectedInventory.inventory_date}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading audit history...</div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No movement history recorded yet.</div>
              ) : (
                movements.map((m) => {
                  const isPositive = Number(m.quantity_change) > 0
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase ${
                              m.movement_type === 'OPENING'
                                ? 'bg-blue-100 text-blue-700'
                                : m.movement_type === 'SALE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.movement_type === 'RESTOCK'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(m.created_at), 'hh:mm a')}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mt-1">{m.reason || 'Inventory action'}</p>
                      </div>
                      <span
                        className={`font-extrabold text-sm shrink-0 ${
                          isPositive ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? `+${m.quantity_change}` : m.quantity_change} kg
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
