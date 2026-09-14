'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { generatePDFReport } from '@/lib/reports/pdf-generator'
import { downloadCSVReport } from '@/lib/reports/csv-generator'
import {
  FileText,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  CheckCircle2,
  Store,
  Calendar,
  Search,
  Filter,
  BarChart3,
  ShoppingBag,
  Users,
  MessageSquare,
  TrendingUp,
  Package,
  Fish
} from 'lucide-react'

type ReportType =
  | 'DAILY_SALES'
  | 'ORDER_LOG'
  | 'PRODUCT_SALES'
  | 'CHATBOT_ANALYTICS'
  | 'CUSTOMER_LEADERBOARD'
  | 'INVENTORY_STOCK'
  | 'BRANCH_COMPARISON'

export default function SuperAdminReportsPage() {
  return (
    <SuperAdminLayout>
      <ReportsContent />
    </SuperAdminLayout>
  )
}

function ReportsContent() {
  const { filter, branches } = useSuperAdminContext()
  const supabase = createClient()

  const [selectedReport, setSelectedReport] = useState<ReportType>('DAILY_SALES')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadReportData()
  }, [selectedReport, filter])

  const getBranchName = () => {
    if (filter.branchId === 'ALL') return 'All Branches (Global)'
    const match = branches.find((b) => b.id === filter.branchId)
    return match ? match.name : 'Selected Branch'
  }

  const loadReportData = async () => {
    setLoading(true)
    try {
      if (selectedReport === 'DAILY_SALES') {
        const { data } = await supabase.rpc('get_super_admin_dashboard_summary', {
          p_start_date: filter.startDate,
          p_end_date: filter.endDate,
          p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
        })
        setReportData(data)
      } else if (selectedReport === 'ORDER_LOG') {
        let q = supabase
          .from('orders')
          .select('order_number, business_date, source, total, status, payment_method, customer_phone')
          .gte('business_date', filter.startDate)
          .lte('business_date', filter.endDate)
          .order('created_at', { ascending: false })
          .limit(200)

        if (filter.branchId !== 'ALL') q = q.eq('branch_id', filter.branchId)
        const { data } = await q
        setReportData(data || [])
      } else if (selectedReport === 'CHATBOT_ANALYTICS') {
        const { data } = await supabase.rpc('get_chatbot_analytics', {
          p_start_date: filter.startDate,
          p_end_date: filter.endDate,
          p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
        })
        setReportData(data)
      } else if (selectedReport === 'CUSTOMER_LEADERBOARD') {
        const { data } = await supabase
          .from('customers')
          .select('id, name, phone, address, total_orders, total_spent, created_at')
          .order('total_spent', { ascending: false })
          .limit(100)
        setReportData(data || [])
      } else if (selectedReport === 'PRODUCT_SALES') {
        const { data } = await supabase.rpc('get_product_sales_report', {
          p_start_date: filter.startDate,
          p_end_date: filter.endDate,
          p_branch_id: filter.branchId === 'ALL' ? null : filter.branchId,
        })
        setReportData(data?.products || [])
      } else if (selectedReport === 'INVENTORY_STOCK') {
        let q = supabase
          .from('inventory')
          .select('product:products(name), available_stock, sold_stock, price_per_kg, inventory_date')
          .gte('inventory_date', filter.startDate)
          .lte('inventory_date', filter.endDate)
          .order('inventory_date', { ascending: false })
          .limit(150)
        if (filter.branchId !== 'ALL') q = q.eq('branch_id', filter.branchId)
        const { data } = await q
        setReportData(data || [])
      } else if (selectedReport === 'BRANCH_COMPARISON') {
        const { data } = await supabase.rpc('get_branch_comparison', {
          p_start_date: filter.startDate,
          p_end_date: filter.endDate,
        })
        setReportData(data?.branches || [])
      }
    } catch (err) {
      console.error('Report Generation Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'DOWNLOAD_PDF_REPORT',
        p_entity_type: 'REPORT',
        p_entity_id: selectedReport,
        p_metadata: { date_from: filter.startDate, date_to: filter.endDate, branch: getBranchName() },
      })
    } catch (_) {}

    if (selectedReport === 'DAILY_SALES') {
      const s = reportData || {}
      generatePDFReport({
        reportTitle: 'Executive Sales Summary Report',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_sales_${filter.startDate}_to_${filter.endDate}.pdf`,
        summaryCards: [
          { label: 'Total Orders', value: String(s.total_orders || 0) },
          { label: 'Total Revenue', value: `₹${Number(s.total_revenue || 0).toLocaleString('en-IN')}` },
          { label: 'Avg Order Value', value: `₹${Number(s.avg_order_value || 0).toLocaleString('en-IN')}` },
          { label: 'Fish Quantity', value: `${s.total_quantity_sold || 0} kg` },
        ],
        tableHeaders: ['Executive Metric Description', 'Recorded Value'],
        tableRows: [
          ['Total Orders Placed', String(s.total_orders || 0)],
          ['Gross Financial Revenue', `₹${Number(s.total_revenue || 0).toLocaleString('en-IN')}`],
          ['Average Order Value (AOV)', `₹${Number(s.avg_order_value || 0).toLocaleString('en-IN')}`],
          ['Total Fish Volume Sold', `${s.total_quantity_sold || 0} kg`],
          ['WhatsApp Chatbot Orders', String(s.whatsapp_orders || 0)],
          ['Website Direct Orders', String(s.website_orders || 0)],
          ['Completed / Delivered Orders', String(s.completed_orders || 0)],
          ['Pending / Preparing Orders', String(s.pending_orders || 0)],
          ['Cancelled Orders', String(s.cancelled_orders || 0)],
          ['Delivery Revenue Collected', `₹${Number(s.delivery_revenue || 0).toLocaleString('en-IN')}`],
          ['Cash on Delivery (COD) Total', `₹${Number(s.cod_revenue || 0).toLocaleString('en-IN')}`],
          ['Online Payments Total', `₹${Number(s.online_revenue || 0).toLocaleString('en-IN')}`],
        ],
      })
    } else if (selectedReport === 'PRODUCT_SALES') {
      const list = Array.isArray(reportData) ? reportData : []
      generatePDFReport({
        reportTitle: 'Fish & Product Sales Breakdown',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_product_sales_${filter.startDate}.pdf`,
        tableHeaders: ['Product Name', 'Category', 'Quantity Sold', 'Revenue (₹)', 'Orders', 'Avg Price (₹/kg)'],
        tableRows: list.map((p: any) => [
          p.product_name || 'Fish Variety',
          p.category || 'Fresh Fish',
          `${p.quantity_sold || 0} ${p.unit || 'kg'}`,
          `₹${Number(p.revenue || 0).toLocaleString('en-IN')}`,
          String(p.order_count || 0),
          `₹${Number(p.avg_selling_price || 0).toLocaleString('en-IN')}`,
        ]),
      })
    } else if (selectedReport === 'ORDER_LOG') {
      const list = Array.isArray(reportData) ? reportData : []
      generatePDFReport({
        reportTitle: 'Production Orders Transaction Log',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_orders_log_${filter.startDate}.pdf`,
        tableHeaders: ['Order #', 'Business Date', 'Channel', 'Phone', 'Total (₹)', 'Status'],
        tableRows: list.map((o: any) => [
          o.order_number,
          o.business_date || '',
          o.source || 'whatsapp',
          o.customer_phone ? `+${o.customer_phone}` : 'N/A',
          `₹${Number(o.total || 0).toLocaleString('en-IN')}`,
          o.status || 'completed',
        ]),
      })
    } else if (selectedReport === 'CHATBOT_ANALYTICS') {
      const c = reportData || {}
      generatePDFReport({
        reportTitle: 'WhatsApp Chatbot Performance Report',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_chatbot_analytics_${filter.startDate}.pdf`,
        tableHeaders: ['Chatbot Performance Metric', 'Metric Count'],
        tableRows: [
          ['Active Chat Conversations', String(c.total_sessions || 0)],
          ['Total Customer Messages', String(c.inbound_messages || 0)],
          ['Total Outbound Responses', String(c.outbound_messages || 0)],
          ['Catalog / Menu Views', String(c.catalog_views || 0)],
          ['Cart Additions', String(c.cart_additions || 0)],
          ['Checkouts Initiated', String(c.checkouts_started || 0)],
          ['Orders Completed via Chatbot', String(c.orders_placed || 0)],
          ['Chatbot Conversion Rate', `${c.conversion_rate || 0}%`],
        ],
      })
    } else if (selectedReport === 'CUSTOMER_LEADERBOARD') {
      const list = Array.isArray(reportData) ? reportData : []
      generatePDFReport({
        reportTitle: 'Customer Leaderboard & Spending Report',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_customers_${filter.startDate}.pdf`,
        tableHeaders: ['Customer Name', 'Phone', 'Total Orders', 'Total Spent (₹)', 'Registered Date'],
        tableRows: list.map((cust: any) => [
          cust.name || 'Customer',
          cust.phone || '',
          String(cust.total_orders || 0),
          `₹${Number(cust.total_spent || 0).toLocaleString('en-IN')}`,
          cust.created_at ? cust.created_at.slice(0, 10) : '',
        ]),
      })
    } else if (selectedReport === 'INVENTORY_STOCK') {
      const list = Array.isArray(reportData) ? reportData : []
      generatePDFReport({
        reportTitle: 'Inventory Stock & Sales Movement Report',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: getBranchName(),
        filename: `bestietfresh_inventory_${filter.startDate}.pdf`,
        tableHeaders: ['Product Variety', 'Date', 'Price (₹/kg)', 'Available Stock', 'Sold Stock'],
        tableRows: list.map((inv: any) => [
          inv.product?.name || 'Fish Variety',
          inv.inventory_date || '',
          `₹${Number(inv.price_per_kg || 0).toLocaleString('en-IN')}`,
          `${inv.available_stock || 0} kg`,
          `${inv.sold_stock || 0} kg`,
        ]),
      })
    } else if (selectedReport === 'BRANCH_COMPARISON') {
      const list = Array.isArray(reportData) ? reportData : []
      generatePDFReport({
        reportTitle: 'Branch Performance Comparison Report',
        dateRangeText: `${filter.startDate} to ${filter.endDate}`,
        branchText: 'All Active Branches',
        filename: `bestietfresh_branch_comparison_${filter.startDate}.pdf`,
        tableHeaders: ['Branch Name', 'Total Orders', 'Revenue (₹)', 'AOV (₹)', 'Fish Sold (kg)'],
        tableRows: list.map((b: any) => [
          b.branch_name || b.name,
          String(b.total_orders || 0),
          `₹${Number(b.total_revenue || 0).toLocaleString('en-IN')}`,
          `₹${Number(b.avg_order_value || 0).toLocaleString('en-IN')}`,
          `${b.total_quantity_sold || 0} kg`,
        ]),
      })
    }
  }

  const handleExportCSV = () => {
    if (selectedReport === 'PRODUCT_SALES') {
      const list = Array.isArray(reportData) ? reportData : []
      downloadCSVReport({
        filename: `bestietfresh_product_sales_${filter.startDate}.csv`,
        headers: ['Product Name', 'Category', 'Quantity Sold', 'Revenue', 'Order Count', 'Avg Price'],
        rows: list.map((p: any) => [
          p.product_name,
          p.category,
          p.quantity_sold,
          p.revenue,
          p.order_count,
          p.avg_selling_price,
        ]),
      })
    } else if (selectedReport === 'ORDER_LOG') {
      const list = Array.isArray(reportData) ? reportData : []
      downloadCSVReport({
        filename: `bestietfresh_orders_log_${filter.startDate}.csv`,
        headers: ['Order Number', 'Business Date', 'Channel Source', 'Customer Phone', 'Total Amount', 'Status', 'Payment Method'],
        rows: list.map((o: any) => [
          o.order_number,
          o.business_date,
          o.source,
          o.customer_phone,
          o.total,
          o.status,
          o.payment_method,
        ]),
      })
    } else if (selectedReport === 'CUSTOMER_LEADERBOARD') {
      const list = Array.isArray(reportData) ? reportData : []
      downloadCSVReport({
        filename: `bestietfresh_customers_${filter.startDate}.csv`,
        headers: ['Customer Name', 'Phone', 'Total Orders', 'Total Spent', 'Registered Date'],
        rows: list.map((c: any) => [
          c.name,
          c.phone,
          c.total_orders,
          c.total_spent,
          c.created_at,
        ]),
      })
    } else if (selectedReport === 'INVENTORY_STOCK') {
      const list = Array.isArray(reportData) ? reportData : []
      downloadCSVReport({
        filename: `bestietfresh_inventory_${filter.startDate}.csv`,
        headers: ['Product Name', 'Date', 'Price Per Kg', 'Available Stock', 'Sold Stock'],
        rows: list.map((i: any) => [
          i.product?.name,
          i.inventory_date,
          i.price_per_kg,
          i.available_stock,
          i.sold_stock,
        ]),
      })
    } else if (selectedReport === 'BRANCH_COMPARISON') {
      const list = Array.isArray(reportData) ? reportData : []
      downloadCSVReport({
        filename: `bestietfresh_branches_${filter.startDate}.csv`,
        headers: ['Branch Name', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Quantity Sold'],
        rows: list.map((b: any) => [
          b.branch_name || b.name,
          b.total_orders,
          b.total_revenue,
          b.avg_order_value,
          b.total_quantity_sold,
        ]),
      })
    } else {
      downloadCSVReport({
        filename: `bestietfresh_${selectedReport.toLowerCase()}.csv`,
        headers: ['Key', 'Value'],
        rows: [['Report Type', selectedReport], ['Branch', getBranchName()], ['Period', `${filter.startDate} to ${filter.endDate}`]],
      })
    }
  }

  const reportTypes: { id: ReportType; label: string; desc: string; icon: any }[] = [
    { id: 'DAILY_SALES', label: 'Daily Sales Executive Report', desc: 'Gross revenue, channel splits & AOV summary', icon: TrendingUp },
    { id: 'ORDER_LOG', label: 'Detailed Order Log', desc: 'Itemized production order transactions', icon: ShoppingBag },
    { id: 'PRODUCT_SALES', label: 'Fish & Product Sales Breakdown', desc: 'Top-selling fish varieties, quantity & revenue', icon: Fish },
    { id: 'CHATBOT_ANALYTICS', label: 'WhatsApp Chatbot Analytics', desc: 'Conversations, conversion funnel & event totals', icon: MessageSquare },
    { id: 'CUSTOMER_LEADERBOARD', label: 'Customer Leaderboard', desc: 'Customer ordering frequency and spend', icon: Users },
    { id: 'INVENTORY_STOCK', label: 'Inventory Stock Movement', desc: 'Opening stock, sold stock and current stock levels', icon: Package },
    { id: 'BRANCH_COMPARISON', label: 'Branch Comparison Report', desc: 'Manvila vs Peroorkada performance comparison', icon: Store },
  ]

  // Render Table Preview based on Report Type
  const renderPreviewTable = () => {
    if (!reportData) {
      return (
        <div className="py-12 text-center text-xs text-slate-400">
          No data records returned for selected period and branch filter.
        </div>
      )
    }

    if (selectedReport === 'DAILY_SALES') {
      const s = reportData || {}
      const rows = [
        { key: 'Total Orders Placed', val: String(s.total_orders || 0), type: 'num' },
        { key: 'Gross Financial Revenue', val: `₹${Number(s.total_revenue || 0).toLocaleString('en-IN')}`, type: 'currency' },
        { key: 'Average Order Value (AOV)', val: `₹${Number(s.avg_order_value || 0).toLocaleString('en-IN')}`, type: 'currency' },
        { key: 'Total Fish Volume Sold', val: `${s.total_quantity_sold || 0} kg`, type: 'qty' },
        { key: 'WhatsApp Chatbot Orders', val: String(s.whatsapp_orders || 0), type: 'num' },
        { key: 'Website Direct Orders', val: String(s.website_orders || 0), type: 'num' },
        { key: 'Completed / Delivered Orders', val: String(s.completed_orders || 0), type: 'status' },
        { key: 'Pending / Preparing Orders', val: String(s.pending_orders || 0), type: 'status' },
        { key: 'Cancelled Orders', val: String(s.cancelled_orders || 0), type: 'status' },
        { key: 'Delivery Charge Revenue', val: `₹${Number(s.delivery_revenue || 0).toLocaleString('en-IN')}`, type: 'currency' },
        { key: 'Cash on Delivery (COD) Revenue', val: `₹${Number(s.cod_revenue || 0).toLocaleString('en-IN')}`, type: 'currency' },
        { key: 'Online Payments Revenue', val: `₹${Number(s.online_revenue || 0).toLocaleString('en-IN')}`, type: 'currency' },
      ]

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Executive Metric Description</th>
                <th className="py-3 px-4 text-right">Recorded Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.key}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'ORDER_LOG') {
      const list = (Array.isArray(reportData) ? reportData : []).filter((o: any) => {
        if (!searchTerm) return true
        const s = searchTerm.toLowerCase()
        return (
          (o.order_number || '').toLowerCase().includes(s) ||
          (o.customer_phone || '').includes(s) ||
          (o.status || '').toLowerCase().includes(s)
        )
      })

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Customer Phone</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No order logs matching search filter.</td>
                </tr>
              ) : (
                list.map((o: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3 px-4 text-slate-600">{o.business_date || '-'}</td>
                    <td className="py-3 px-4 font-medium text-slate-700 capitalize">{o.source || 'whatsapp'}</td>
                    <td className="py-3 px-4 text-slate-600">{o.customer_phone ? `+${o.customer_phone}` : '-'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      ₹{Number(o.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (o.status || '').toLowerCase() === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status || 'completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'PRODUCT_SALES') {
      const list = Array.isArray(reportData) ? reportData : []
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Fish Variety / Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Quantity Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Avg Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No product sales records available.</td>
                </tr>
              ) : (
                list.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.product_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.category || 'Fresh Fish'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-teal-700">{p.quantity_sold} {p.unit || 'kg'}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">₹{Number(p.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">{p.order_count}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">₹{Number(p.avg_selling_price || 0).toLocaleString('en-IN')}/kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'CHATBOT_ANALYTICS') {
      const c = reportData || {}
      const rows = [
        { label: 'Active Chat Sessions', val: String(c.total_sessions || 0) },
        { label: 'Total Customer Inbound Messages', val: String(c.inbound_messages || 0) },
        { label: 'Total Outbound Bot Responses', val: String(c.outbound_messages || 0) },
        { label: 'Fish Catalog Views', val: String(c.catalog_views || 0) },
        { label: 'Items Added to Cart', val: String(c.cart_additions || 0) },
        { label: 'Checkouts Initiated', val: String(c.checkouts_started || 0) },
        { label: 'Orders Completed via Chatbot', val: String(c.orders_placed || 0) },
        { label: 'Chatbot Conversion Funnel Rate', val: `${c.conversion_rate || 0}%` },
      ]
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Chatbot Metric Description</th>
                <th className="py-3 px-4 text-right">Count / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.label}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700">{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'CUSTOMER_LEADERBOARD') {
      const list = Array.isArray(reportData) ? reportData : []
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-center">Total Orders</th>
                <th className="py-3 px-4 text-right">Total Lifetime Spend</th>
                <th className="py-3 px-4">Address / Locality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No customer leaderboard records available.</td>
                </tr>
              ) : (
                list.map((cust: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{cust.name || 'Customer'}</td>
                    <td className="py-3 px-4 text-slate-600">{cust.phone ? `+${cust.phone}` : '-'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{cust.total_orders || 0}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">₹{Number(cust.total_spent || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{cust.address || 'Trivandrum'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'INVENTORY_STOCK') {
      const list = Array.isArray(reportData) ? reportData : []
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Product Variety</th>
                <th className="py-3 px-4">Stock Date</th>
                <th className="py-3 px-4 text-right">Price (₹/kg)</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Sold Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No inventory stock movement data recorded.</td>
                </tr>
              ) : (
                list.map((inv: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.product?.name || 'Fish Variety'}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.inventory_date || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">₹{Number(inv.price_per_kg || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{inv.available_stock || 0} kg</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">{inv.sold_stock || 0} kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (selectedReport === 'BRANCH_COMPARISON') {
      const list = Array.isArray(reportData) ? reportData : []
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Branch Name</th>
                <th className="py-3 px-4 text-center">Total Orders</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Avg Order Value</th>
                <th className="py-3 px-4 text-right">Fish Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No branch comparison metrics available.</td>
                </tr>
              ) : (
                list.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-slate-900">{b.branch_name || b.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{b.total_orders || 0}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">₹{Number(b.total_revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">₹{Number(b.avg_order_value || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-bold text-teal-700">{b.total_quantity_sold || 0} kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SUPER ADMIN REPORT CENTER</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export structured PDF business reports and CSV raw data
          </p>
        </div>
      </div>

      {/* Report Selection Grid & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Report Type</h3>

          {reportTypes.map((r) => {
            const Icon = r.icon
            const isSelected = selectedReport === r.id
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {r.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{r.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right Column: Interactive Table Preview & Download Toolbar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {reportTypes.find((r) => r.id === selectedReport)?.label}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Period: <span className="text-slate-800 font-bold">{filter.startDate} to {filter.endDate}</span> • Branch: <span className="text-slate-800 font-bold">{getBranchName()}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD PDF</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs disabled:opacity-50 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>EXPORT CSV</span>
              </button>
            </div>
          </div>

          {/* Live Data Preview Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                Interactive Data Preview
              </h3>

              {selectedReport === 'ORDER_LOG' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by order #, phone, status..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold">Loading data preview...</p>
              </div>
            ) : (
              renderPreviewTable()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
