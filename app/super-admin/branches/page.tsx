'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { Store, RefreshCw, ShoppingBag, IndianRupee, Fish, CheckCircle2, XCircle } from 'lucide-react'

function BranchesContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [branchesData, setBranchesData] = useState<any[]>([])

  useEffect(() => {
    fetchBranchComparison()
  }, [filter])

  const fetchBranchComparison = async () => {
    setLoading(true)
    try {
      const { data: res } = await supabase.rpc('get_branch_comparison', {
        p_start_date: filter.startDate,
        p_end_date: filter.endDate,
      })

      if (res?.branches) {
        setBranchesData(res.branches)
      }
    } catch (err) {
      console.error('Branch Comparison Error:', err)
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
        <p className="text-sm font-semibold">Comparing Branch Performance...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">BRANCH COMPARISON</h1>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side performance comparison between Manvila and Peroorkada branches
          </p>
        </div>
        <button
          onClick={fetchBranchComparison}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Branch Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branchesData.map((b) => (
          <div key={b.branch_id} className="bg-white border border-[#E2ECE7] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2ECE7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#7FBA44]/30 flex items-center justify-center text-[#7FBA44]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{b.branch_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {b.branch_id?.slice(0, 8)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{b.total_orders}</p>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
                <p className="text-2xl font-black text-[#7FBA44] mt-1">{formatCurrency(b.total_revenue)}</p>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fish Quantity Sold</span>
                <p className="text-2xl font-black text-cyan-600 mt-1">{Number(b.quantity_sold || 0).toLocaleString()} kg</p>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2ECE7]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Order Value</span>
                <p className="text-2xl font-black text-purple-600 mt-1">{formatCurrency(b.avg_order_value)}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E2ECE7]">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>Completed Orders:</span>
                <span className="font-bold text-[#71A83A]">{b.completed_orders}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>Cancelled Orders:</span>
                <span className="font-bold text-red-600">{b.cancelled_orders}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BranchComparisonPage() {
  return (
    <SuperAdminLayout>
      <BranchesContent />
    </SuperAdminLayout>
  )
}
