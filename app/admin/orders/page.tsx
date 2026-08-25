'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types/database'
import { sendWhatsAppStatusUpdate } from '@/lib/whatsapp/client'
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
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
  DollarSign
} from 'lucide-react'
import { format } from 'date-fns'

import { useBranchContext } from '../BranchContext'
import { Store, MessageSquare } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'ALL' | OrderStatus>('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()
  const { selectedBranchId, currentUser } = useBranchContext()

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
  }, [selectedBranchId, currentUser?.branch_id])

  const fetchOrders = async () => {
    setLoading(true)
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
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Supabase Orders Query Error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log(`[Dev Log]: Query returned 0 orders for user branch scope: ${currentUser?.branch_id || selectedBranchId || 'RLS'}`)
      }

      setOrders(data || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      const statusLower = newStatus.toLowerCase()
      if (newStatus === 'CANCELLED' || statusLower === 'cancelled') {
        const { data, error } = await supabase.rpc('cancel_order_atomic', {
          p_order_id: orderId,
          p_reason: 'Cancelled by admin',
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('orders')
          .update({ status: statusLower, updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (error) throw error
      }

      // Send WhatsApp status notification
      if (selectedOrder?.customer?.phone) {
        try {
          await sendWhatsAppStatusUpdate({
            phone: selectedOrder.customer.phone,
            orderNumber: selectedOrder.order_number,
            newStatus,
          })
        } catch (waErr) {
          console.error('WhatsApp notification failed:', waErr)
        }
      }

      await fetchOrders()
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenDrawer = (order: Order) => {
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }

  const filteredOrders = orders.filter((ord) => {
    const matchesBranch =
      selectedBranchId === 'ALL' ||
      ord.branch_id === selectedBranchId ||
      (!ord.branch_id && selectedBranchId === 'b1111111-1111-1111-1111-111111111111')
    const ordStatusUpper = (ord.status || '').toUpperCase()
    const matchesTab = activeTab === 'ALL' || ordStatusUpper === activeTab
    const q = search.toLowerCase()
    const matchesSearch =
      ord.order_number.toLowerCase().includes(q) ||
      (ord.customer?.phone && ord.customer.phone.includes(q)) ||
      (ord.customer?.name && ord.customer.name.toLowerCase().includes(q))
    return matchesBranch && matchesTab && matchesSearch
  })

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
        return null
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
            Monitor incoming WhatsApp customer orders, update statuses, and send live customer notifications.
          </p>
        </div>
      </div>

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
            placeholder="Search order number (BF-...), customer name or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Order List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading orders from database...</p>
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
              : 'WhatsApp orders will automatically appear here when customers complete checkout.'}
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
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-[11px]">
                        {ord.order_number}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                        <Store className="w-3 h-3 text-blue-600" />
                        {ord.branch?.name || 'Marine Drive Branch'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{ord.customer?.name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {ord.customer?.phone}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">
                        {ord.items && ord.items.length > 0
                          ? ord.items.map((i) => `${i.product?.name || 'Fish'} (${i.quantity_kg}kg)`).join(', ')
                          : '1 item'}
                      </p>
                      {ord.customer_remarks && (
                        <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
                          <MessageSquare className="w-2.5 h-2.5" /> {ord.customer_remarks}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 text-sm">₹{ord.total_amount}</span>
                      <span className="text-[10px] text-slate-400 block">{ord.payment_status}</span>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(ord.status)}</td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {format(new Date(ord.created_at), 'dd MMM yyyy, hh:mm a')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDrawer(ord)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {isDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg text-xs">
                  {selectedOrder.order_number}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Placed on {format(new Date(selectedOrder.created_at), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Status Header & Badges */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Current Status:</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>

                {/* Status Quick Actions */}
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-600 uppercase mb-2">Update Status Workflow:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.status === 'PENDING' && (
                      <button
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept Order
                      </button>
                    )}

                    {['PENDING', 'ACCEPTED'].includes(selectedOrder.status) && (
                      <button
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Fish className="w-3.5 h-3.5" /> Start Preparing
                      </button>
                    )}

                    {['PREPARING'].includes(selectedOrder.status) && (
                      <button
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PACKED')}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Package className="w-3.5 h-3.5" /> Mark Packed
                      </button>
                    )}

                    {['PACKED'].includes(selectedOrder.status) && (
                      <button
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                        className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" /> Out for Delivery
                      </button>
                    )}

                    {['OUT_FOR_DELIVERY'].includes(selectedOrder.status) && (
                      <button
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark Delivered
                      </button>
                    )}

                    {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                      <button
                        disabled={updating}
                        onClick={() => {
                          const r = prompt('Reason for cancelling order:')
                          if (r !== null) {
                            handleUpdateStatus(selectedOrder.id, 'CANCELLED')
                          }
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer & Address & Branch Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Order & Branch Information</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Fulfilling Branch:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                      <Store className="w-3.5 h-3.5 text-blue-600" />
                      {selectedOrder.branch?.name || 'Marine Drive Branch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-800">{selectedOrder.customer?.name || 'WhatsApp Customer'}</span>
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedOrder.customer?.phone}
                    </span>
                  </div>

                  {selectedOrder.address && (
                    <div className="pt-2 border-t border-slate-200/60 text-slate-600 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-800">{selectedOrder.address.title || 'Delivery Address'}</p>
                        <p>{selectedOrder.address.address_line1}</p>
                        {selectedOrder.address.address_line2 && <p>{selectedOrder.address.address_line2}</p>}
                        <p>{selectedOrder.address.city} - {selectedOrder.address.pincode}</p>
                      </div>
                    </div>
                  )}

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
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Fish className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{item.product?.name || 'Fish'}</p>
                            <p className="text-[11px] text-slate-500 capitalize">
                              Cut: <span className="font-semibold text-slate-700">{item.cutting_type.replace('_', ' ')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">₹{item.subtotal}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.quantity_kg} kg × ₹{item.unit_price}/kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>₹{(Number(selectedOrder.total_amount) - Number(selectedOrder.delivery_fee)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee:</span>
                      <span>₹{selectedOrder.delivery_fee}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total Paid:</span>
                      <span className="text-emerald-700">₹{selectedOrder.total_amount}</span>
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
