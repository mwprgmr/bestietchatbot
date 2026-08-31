'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types/database'
import { sendWhatsAppStatusUpdate } from '@/lib/whatsapp/client'
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Fish,
  Store,
  MessageSquare,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { useBranchContext } from '../BranchContext'

const statusTabs: { label: string; value: 'ALL' | OrderStatus }[] = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ALL' | OrderStatus>('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()
  const { selectedBranchId, currentUser } = useBranchContext()

  const assignedBranchId = currentUser?.branch_id || selectedBranchId

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [assignedBranchId])

  const fetchOrders = async () => {
    setLoading(true)
    setQueryError(null)
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          address:addresses(*),
          branch:branches(*),
          items:order_items(*, product:products(*))
        `)

      if (assignedBranchId && assignedBranchId !== 'ALL') {
        query = query.eq('branch_id', assignedBranchId)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('[Supabase Orders Query Error]:', error)
        setQueryError(error.message || 'Database query error fetching orders.')
        setOrders([])
        return
      }

      if (!data || !Array.isArray(data)) {
        setOrders([])
        return
      }

      setOrders(data)
    } catch (err: any) {
      console.error('[Unhandled error fetching orders]:', err?.message || err)
      setQueryError(err?.message || 'An unexpected error occurred while fetching orders.')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getLocationInfo = (ord: any) => {
    if (!ord) return null
    let lat = ord.latitude ?? ord.address?.latitude
    let lng = ord.longitude ?? ord.address?.longitude
    let mapsUrl = ord.maps_url ?? ord.address?.maps_url

    // Fallback 1: Extract from customer_remarks if present
    if ((lat === undefined || lat === null || lng === undefined || lng === null) && ord.customer_remarks) {
      const match = ord.customer_remarks.match(/https:\/\/www\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (match) {
        lat = parseFloat(match[1])
        lng = parseFloat(match[2])
        mapsUrl = match[0]
      }
    }

    // Fallback 2: Extract from delivery_address tag [GPS:lat,lng] if present
    if ((lat === undefined || lat === null || lng === undefined || lng === null) && ord.delivery_address) {
      const match = ord.delivery_address.match(/\[GPS:(-?\d+\.?\d*),(-?\d+\.?\d*)\]/)
      if (match) {
        lat = parseFloat(match[1])
        lng = parseFloat(match[2])
      }
    }

    const numLat = lat !== undefined && lat !== null ? Number(lat) : null
    const numLng = lng !== undefined && lng !== null ? Number(lng) : null

    if (numLat !== null && !isNaN(numLat) && numLng !== null && !isNaN(numLng)) {
      const finalMapsUrl = mapsUrl || `https://www.google.com/maps?q=${numLat},${numLng}`
      return { lat: numLat, lng: numLng, mapsUrl: finalMapsUrl }
    }
    return null
  }

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      const statusLower = newStatus.toLowerCase()
      if (newStatus === 'CANCELLED' || statusLower === 'cancelled') {
        const { error } = await supabase.rpc('cancel_order_atomic', {
          p_order_id: orderId,
          p_reason: 'Cancelled by admin',
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: statusLower, updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (error) throw error
      }

      if (selectedOrder?.customer?.phone) {
        try {
          await sendWhatsAppStatusUpdate({
            phone: selectedOrder.customer.phone,
            orderNumber: selectedOrder.order_number,
            newStatus,
          })
        } catch (waErr) {
          console.error('WhatsApp notification error:', waErr)
        }
      }

      await fetchOrders()
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (err: any) {
      alert('Error updating status: ' + (err?.message || 'Update failed'))
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenDrawer = (order: Order) => {
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }

  const filteredOrders = Array.isArray(orders)
    ? orders.filter((ord) => {
        if (!ord) return false
        const matchesBranch =
          !assignedBranchId ||
          assignedBranchId === 'ALL' ||
          ord.branch_id === assignedBranchId ||
          (!ord.branch_id && assignedBranchId === 'b1111111-1111-1111-1111-111111111111')

        const ordStatusUpper = (ord.status || '').toUpperCase()
        const matchesTab = activeTab === 'ALL' || ordStatusUpper === activeTab
        const q = (search || '').toLowerCase()
        const matchesSearch =
          (ord.order_number || '').toLowerCase().includes(q) ||
          (ord.customer?.phone && ord.customer.phone.includes(q)) ||
          (ord.customer?.name && ord.customer.name.toLowerCase().includes(q)) ||
          (ord.delivery_address && ord.delivery_address.toLowerCase().includes(q))

        return matchesBranch && matchesTab && matchesSearch
      })
    : []

  const getStatusBadge = (status: OrderStatus | string) => {
    const s = (status || '').toUpperCase()
    switch (s) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        )
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Fish className="w-3 h-3" /> Preparing
          </span>
        )
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Package className="w-3 h-3" /> Packed
          </span>
        )
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Truck className="w-3 h-3" /> Out for Delivery
          </span>
        )
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCheck className="w-3 h-3" /> Delivered
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {status || 'Unknown'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
            Order Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor incoming WhatsApp customer orders for your assigned branch, update statuses, and view customer GPS delivery locations.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Database Error Alert if query fails */}
      {queryError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3 text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-900">Database Query Error</p>
            <p className="mt-0.5">{queryError}</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs overflow-x-auto flex items-center gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number (BF-...), customer name, phone or address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Order List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading branch orders from database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? 'No orders match your search parameters.'
              : 'WhatsApp orders for this branch will automatically appear here when customers complete checkout.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items & Remarks</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredOrders.map((ord) => {
                  const branchName =
                    ord.branch?.name ||
                    (ord.branch_id === 'b2222222-2222-2222-2222-222222222222'
                      ? 'Peroorkada Branch'
                      : 'Manvila Kazhakkoottam Branch')

                  const totalAmt = ord.total_amount ?? ord.total ?? 0
                  const locInfo = getLocationInfo(ord)

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-[11px]">
                          {ord.order_number || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          <Store className="w-3 h-3 text-blue-600" />
                          {branchName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{ord.customer?.name || 'WhatsApp Customer'}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ord.customer?.phone || 'N/A'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {Array.isArray(ord.items) && ord.items.length > 0
                            ? ord.items.map((i) => `${i.product?.name || 'Fish'} (${i.quantity_kg || 1}kg)`).join(', ')
                            : '1 item'}
                        </p>
                        {ord.customer_remarks && (
                          <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> {ord.customer_remarks}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {locInfo ? (
                          <a
                            href={locInfo.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs whitespace-nowrap"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>📍 GPS Available</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">○ No GPS</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-sm">₹{totalAmt}</span>
                        <span className="text-[10px] text-slate-400 block">{ord.payment_status || 'COD'}</span>
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(ord.status)}</td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {ord.created_at ? format(new Date(ord.created_at), 'dd MMM yyyy, hh:mm a') : 'Recent'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDrawer(ord)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDER DETAILS SLIDE-OVER DRAWER */}
      {isDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg tracking-tight font-mono">{selectedOrder.order_number}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Placed on {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'dd MMM yyyy, hh:mm a') : 'Recently'}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Quick Actions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Update Status Workflow:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept Order</span>
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                    className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Start Preparing</span>
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PACKED')}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Mark Packed</span>
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                    className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Out For Delivery</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                    className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                </div>
              </div>

              {/* Customer & Delivery Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Delivery Information</h4>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Fulfilling Branch:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedOrder.branch?.name || 'Main Branch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-800">{selectedOrder.customer?.name || 'WhatsApp Customer'}</span>
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedOrder.customer?.phone || 'N/A'}
                    </span>
                  </div>

                  {/* Text Address */}
                  <div className="pt-2 border-t border-slate-200/60 text-slate-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">{selectedOrder.address?.label || selectedOrder.address?.title || 'Delivery Address'}</p>
                      <p>
                        {selectedOrder.delivery_address ||
                          selectedOrder.address?.address_line ||
                          selectedOrder.address?.address_line1 ||
                          'Address not specified'}
                      </p>
                      {selectedOrder.address?.pincode && <p className="text-slate-500 text-[11px]">Pincode: {selectedOrder.address.pincode}</p>}
                    </div>
                  </div>

                  {/* Prominent Customer Location Section for Delivery Staff */}
                  <div className="pt-3 border-t border-slate-200/60 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">📌 Customer Location</p>
                    {(() => {
                      const drawerLoc = getLocationInfo(selectedOrder);
                      return drawerLoc ? (
                        <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <span>📍 Location shared by customer</span>
                          </div>
                          <a
                            href={drawerLoc.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                          >
                            <span>🗺️ Open in Google Maps</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          </a>
                          <div className="pt-2 border-t border-emerald-200/60 text-[11px] font-mono text-emerald-800 flex items-center justify-between">
                            <span>Latitude: <strong>{drawerLoc.lat.toFixed(4)}</strong></span>
                            <span>Longitude: <strong>{drawerLoc.lng.toFixed(4)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic bg-slate-100 p-2.5 rounded-xl">Location not shared by customer</p>
                      )
                    })()}
                  </div>

                  {selectedOrder.customer_remarks && (
                    <div className="pt-2 border-t border-slate-200/60 text-slate-700 flex items-start gap-2 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 mt-2">
                      <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">Customer Remarks / Special Instructions:</p>
                        <p className="font-medium text-amber-800">{selectedOrder.customer_remarks}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

                {/* Order Items Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Order Items</h4>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <div key={item.id || item.product_id} className="p-3.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                <Fish className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{item.product?.name || 'Fresh Fish'}</p>
                                <p className="text-[11px] text-slate-500 capitalize">
                                  Cut: <span className="font-semibold text-slate-700">{(item.cutting_type || 'whole').replace('_', ' ')}</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="font-extrabold text-slate-900">₹{item.subtotal || 0}</p>
                              <p className="text-[10px] text-slate-400">
                                {item.quantity_kg} kg × ₹{item.unit_price}/kg
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">No items specified for this order</div>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{(Number(selectedOrder.total_amount || selectedOrder.total || 0) - Number(selectedOrder.delivery_fee || selectedOrder.delivery_charge || 30)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Fee:</span>
                        <span>₹{selectedOrder.delivery_fee || selectedOrder.delivery_charge || 30}</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                        <span>Total Paid:</span>
                        <span className="text-emerald-700">₹{selectedOrder.total_amount || selectedOrder.total || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
