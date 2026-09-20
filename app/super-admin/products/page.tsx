'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { Fish, Search, RefreshCw, IndianRupee, ShoppingBag, Award } from 'lucide-react'

function ProductsContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProductSales()
  }, [filter])

  const fetchProductSales = async () => {
    setLoading(true)
    try {
      const { data: res, error } = await supabase.rpc('get_product_sales_report', {
        p_start_date: filter.startDate,
        p_end_date: filter.endDate,
        p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
      })

      if (error) throw error
      if (res?.products) {
        setProducts(res.products)
      }
    } catch (err) {
      console.error('Product Sales Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const filteredProducts = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.product_name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7FBA44]" />
        <p className="text-sm font-semibold">Aggregating Fish & Product Sales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">PRODUCT & FISH SALES ANALYTICS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Top-selling fish varieties, total quantities sold, revenue & average selling price
          </p>
        </div>
        <button
          onClick={fetchProductSales}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white border border-[#E2ECE7] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2ECE7] flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#7FBA44]" />
            Product Sales Leaderboard
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fish name or category..."
              className="bg-white border border-[#E2ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7FBA44]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-[#E2ECE7]">
                <th className="p-3.5">Rank / Fish Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Quantity Sold</th>
                <th className="p-3.5">Total Revenue</th>
                <th className="p-3.5">Orders Count</th>
                <th className="p-3.5">Avg Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No products found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr key={p.product_id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <Fish className="w-4 h-4 text-[#7FBA44] shrink-0" />
                          <span className="font-bold text-slate-900 block">{p.product_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {p.category || 'Fresh Fish'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {Number(p.quantity_sold || 0).toLocaleString()} {p.unit || 'kg'}
                    </td>
                    <td className="p-3.5 font-bold text-[#7FBA44] text-sm">
                      {formatCurrency(p.revenue)}
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {p.order_count || 0} orders
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {formatCurrency(p.avg_selling_price)} / {p.unit || 'kg'}
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

export default function ProductAnalyticsPage() {
  return (
    <SuperAdminLayout>
      <ProductsContent />
    </SuperAdminLayout>
  )
}
