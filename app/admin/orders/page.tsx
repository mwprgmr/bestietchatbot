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
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
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
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEBSITE' | 'WHATSAPP'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Date Filter State
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL')
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Helper functions for Quantity and Price formatting
  const formatQuantity = (item: any) => {
    if (!item) return '1 kg'
    const qty = Number(item.quantity ?? item.quantity_kg ?? 1)
    const unit = item.unit || item.product?.unit || 'kg'
    return `${qty} ${unit}`
  }

  const formatCurrency = (val: any) => {
    const num = Number(val || 0)
    if (isNaN(num)) return '0'
    return num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  }

  const formatDateDDMMYYYY = (isoDateStr: string) => {
    if (!isoDateStr) return ''
    const parts = isoDateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return isoDateStr
  }

  const formatWhatsAppPhone = (phoneRaw: string | undefined | null) => {
    if (!phoneRaw) return { display: 'N/A', raw: '' }
    let digits = String(phoneRaw).replace(/\D/g, '')
    if (digits.length === 10) {
      digits = `91${digits}`
    }
    if (digits.startsWith('91') && digits.length === 12) {
      const subscriberNumber = digits.slice(2)
      return {
        display: `+91 ${subscriberNumber}`,
        raw: digits,
      }
    }
    const formattedDisplay = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`
    return {
      display: formattedDisplay,
      raw: digits,
    }
  }

  const getOrderCustomerDetails = (ord: any) => {
    let name = ord.customer?.name || ''
    let phone = ord.customer_phone || ord.customer?.phone || ''
    const remarks = ord.customer_remarks || ''
    const deliveryAddr = ord.delivery_address || ''
    const ordChannel = ((ord as any).order_channel || ((ord as any).whatsapp_message_id ? 'whatsapp' : 'storefront')).toLowerCase()

    if (!name || name === 'Customer 4153' || name === 'WhatsApp Customer' || name.startsWith('Customer ')) {
      name = ''
    }

    if (phone === '15551964153') {
      phone = ''
    }

    if (remarks) {
      const match = remarks.match(/Customer:\s*([^()]+)\s*\(([^()]+)\)/i)
      if (match) {
        if (!name) name = match[1].trim()
        if (!phone) phone = match[2].trim().replace(/\D/g, '')
      }
    }

    if (!phone && deliveryAddr) {
      const phoneMatch = deliveryAddr.match(/\b(91\d{10}|\d{10})\b/)
      if (phoneMatch) {
        phone = phoneMatch[1]
      }
    }

    if (!name) {
      name = ordChannel === 'whatsapp' ? 'WhatsApp Customer' : 'Storefront Website Customer'
    }

    let rawPhone = phone.replace(/\D/g, '')
    let displayPhone = 'N/A'

    if (rawPhone.length === 10) {
      rawPhone = `91${rawPhone}`
    }

    if (rawPhone.startsWith('91') && rawPhone.length === 12) {
      displayPhone = `+91 ${rawPhone.slice(2)}`
    } else if (rawPhone.length > 0) {
      displayPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`
    }

    return {
      name,
      phone: rawPhone,
      displayPhone,
      channel: ordChannel,
      isWebsite: ordChannel === 'storefront',
    }
  }

  const parseOrderLocation = (ord: any) => {
    let address = ord.delivery_address || ord.address?.address_line || ''
    let lat = ord.latitude ?? ord.address?.latitude
    let lng = ord.longitude ?? ord.address?.longitude
    let mapsUrl = ord.maps_url ?? ord.address?.maps_url
    const remarks = ord.customer_remarks || ''

    if (!address && remarks) {
      const match = remarks.match(/Delivery:\s*([^,|]+(?:\s*,\s*[^,|]+)*)/i)
      if (match) address = match[1].trim()
    }

    if (!mapsUrl && remarks) {
      const mapsMatch = remarks.match(/https:\/\/www\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (mapsMatch) {
        mapsUrl = mapsMatch[0]
        lat = parseFloat(mapsMatch[1])
        lng = parseFloat(mapsMatch[2])
      }
    }

    if (!mapsUrl && address) {
      const mapsMatch = address.match(/https:\/\/www\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (mapsMatch) {
        mapsUrl = mapsMatch[0]
        lat = parseFloat(mapsMatch[1])
        lng = parseFloat(mapsMatch[2])
      }
    }

    if (!mapsUrl && lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    }

    const cleanAddr = address.replace(/\|?\s*GPS:\s*https:\/\/[^\s]+/g, '').replace(/\|?\s*GPS Shared:\s*https:\/\/[^\s]+/g, '').trim() || 'Address not specified'

    return {
      address: cleanAddr,
      hasGps: !!mapsUrl,
      mapsUrl,
      lat,
      lng,
    }
  }

  // Modals state
  const [orderToMarkPaid, setOrderToMarkPaid] = useState<Order | null>(null)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  const [cancellationNoticeFailed, setCancellationNoticeFailed] = useState<string | null>(null)
  const [cancellationPhone, setCancellationPhone] = useState<string>('')
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

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
          items:order_items(*, product:products(*)),
          order_items(*, product:products(*))
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

      // Filter out automated test orders and non-production records
      const productionOrders = data.filter((ord: any) => {
        if (ord.source === 'test') return false
        const remarks = ord.customer_remarks || ''
        const custName = ord.customer?.name || ''
        const phone = ord.customer?.phone || ''
        if (remarks.includes('[TEST_ORDER]') || remarks.includes('Tester') || custName.includes('Tester') || phone.startsWith('91987654')) {
          return false
        }
        return true
      })

      setOrders(productionOrders)
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

    if ((lat === undefined || lat === null || lng === undefined || lng === null) && ord.customer_remarks) {
      const match = ord.customer_remarks.match(/https:\/\/www\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (match) {
        lat = parseFloat(match[1])
        lng = parseFloat(match[2])
        mapsUrl = match[0]
      }
    }

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

  // MARK AS PAID ACTION & ATOMIC AUDIT
  const handleConfirmMarkPaid = async () => {
    if (!orderToMarkPaid) return
    setUpdating(true)
    try {
      const orderId = orderToMarkPaid.id
      const nowIso = new Date().toISOString()
      const staffName = currentUser?.name || 'Admin User'

      const { error: rpcErr } = await supabase.rpc('mark_order_paid_atomic', {
        p_order_id: orderId,
        p_paid_by: staffName,
      })

      if (rpcErr) {
        console.warn('mark_order_paid_atomic RPC missing, using direct update fallback:', rpcErr.message)
        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            payment_status: 'PAID',
            updated_at: nowIso,
          })
          .eq('id', orderId)

        if (updateErr) throw updateErr

        try {
          await supabase.from('payment_audits').insert({
            order_id: orderId,
            previous_payment_status: orderToMarkPaid.payment_status || 'UNPAID',
            new_payment_status: 'PAID',
            paid_by: staffName,
            paid_at: nowIso,
          })
        } catch (_) {}
      }

      setActionSuccessMsg(`Order ${orderToMarkPaid.order_number} marked as PAID.`)
      setTimeout(() => setActionSuccessMsg(null), 4000)
      setOrderToMarkPaid(null)
      await fetchOrders()

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, payment_status: 'PAID' } : null))
      }
    } catch (err: any) {
      alert('Failed to mark order as paid: ' + (err?.message || 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  // CANCEL ORDER ACTION WITH WHATSAPP NOTIFICATION & FALLBACK CHAT LINK
  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return
    setUpdating(true)
    setCancellationNoticeFailed(null)
    setCancellationPhone('')

    try {
      const orderId = orderToCancel.id
      const phone = orderToCancel.customer?.phone || ''
      setCancellationPhone(phone)

      // 1. Atomic Cancel Order in DB & Restore Inventory
      const { error: cancelErr } = await supabase.rpc('cancel_order_atomic', {
        p_order_id: orderId,
        p_reason: 'Cancelled from admin dashboard',
      })

      if (cancelErr) {
        console.warn('cancel_order_atomic RPC error, falling back to direct update:', cancelErr.message)
        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        if (updateErr) throw updateErr
      }

      // 2. Trigger WhatsApp Customer Notification
      let notificationSent = false
      if (phone) {
        try {
          await sendWhatsAppStatusUpdate({
            phone,
            orderNumber: orderToCancel.order_number,
            newStatus: 'CANCELLED',
          })
          notificationSent = true
        } catch (waErr: any) {
          console.error('WhatsApp cancellation notification failed:', waErr)
          notificationSent = false
        }
      }

      await fetchOrders()
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null))
      }

      if (!notificationSent && phone) {
        setCancellationNoticeFailed(`Order status updated to CANCELLED, but WhatsApp API notification could not be sent. You can notify the customer directly via WhatsApp chat.`)
      } else {
        setActionSuccessMsg(`Order ${orderToCancel.order_number} cancelled and customer notified.`)
        setTimeout(() => setActionSuccessMsg(null), 4000)
        setOrderToCancel(null)
      }
    } catch (err: any) {
      alert('Error cancelling order: ' + (err?.message || 'Cancellation failed'))
    } finally {
      setUpdating(false)
    }
  }

  const getWhatsAppChatUrl = (phone: string, orderNumber: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
    const msg = encodeURIComponent(
      `Hello! We're sorry, but your Bestiet Fresh order ${orderNumber} is going to be cancelled. We'll update you shortly. If you have any questions, please contact Bestiet Fresh support.`
    )
    return `https://wa.me/${formattedPhone}?text=${msg}`
  }

  const handleOpenDrawer = (order: Order) => {
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }

  // Date Filtering Logic
  const filteredOrders = Array.isArray(orders)
    ? orders.filter((ord) => {
        if (!ord) return false
        const matchesBranch =
          !assignedBranchId ||
          assignedBranchId === 'ALL' ||
          ord.branch_id === assignedBranchId ||
          (!ord.branch_id && assignedBranchId === 'b1111111-1111-1111-1111-111111111111')

        const ordStatusUpper = (ord.status || '').toUpperCase()
        const matchesTab =
          activeTab === 'ALL' ||
          ordStatusUpper === activeTab ||
          (activeTab === 'PENDING' && ordStatusUpper === 'PLACED')

        const ordChannel = ((ord as any).order_channel || ((ord as any).whatsapp_message_id ? 'whatsapp' : 'storefront')).toLowerCase()
        const matchesSource =
          sourceFilter === 'ALL' ||
          (sourceFilter === 'WEBSITE' && ordChannel === 'storefront') ||
          (sourceFilter === 'WHATSAPP' && ordChannel === 'whatsapp')

        // Date-wise filtering
        const ordDateStr = (ord as any).business_date || (ord.created_at ? ord.created_at.split('T')[0] : '')
        const todayStr = new Date().toISOString().split('T')[0]
        const yesterdayStr = subDays(new Date(), 1).toISOString().split('T')[0]

        let matchesDate = true
        if (dateFilterPreset === 'TODAY') {
          matchesDate = ordDateStr === todayStr
        } else if (dateFilterPreset === 'YESTERDAY') {
          matchesDate = ordDateStr === yesterdayStr
        } else if (dateFilterPreset === 'LAST_7_DAYS') {
          const sevenDaysAgoStr = subDays(new Date(), 7).toISOString().split('T')[0]
          matchesDate = ordDateStr >= sevenDaysAgoStr
        } else if (dateFilterPreset === 'THIS_MONTH') {
          const monthStartStr = startOfMonth(new Date()).toISOString().split('T')[0]
          matchesDate = ordDateStr >= monthStartStr
        } else if (dateFilterPreset === 'CUSTOM') {
          matchesDate = ordDateStr === customDate
        }

        const q = (search || '').toLowerCase()
        const custDetails = getOrderCustomerDetails(ord)

        const matchesSearch =
          (ord.order_number || '').toLowerCase().includes(q) ||
          (ord.customer_id || '').toLowerCase().includes(q) ||
          custDetails.name.toLowerCase().includes(q) ||
          custDetails.phone.includes(q) ||
          custDetails.displayPhone.toLowerCase().includes(q) ||
          (ord.delivery_address && ord.delivery_address.toLowerCase().includes(q)) ||
          (ord.customer_remarks && ord.customer_remarks.toLowerCase().includes(q))

        return matchesBranch && matchesTab && matchesSource && matchesDate && matchesSearch
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

  const getPaymentBadge = (paymentStatus: string | undefined) => {
    const isPaid = (paymentStatus || '').toUpperCase() === 'PAID'
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <DollarSign className="w-3 h-3 text-emerald-700" /> PAID
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-700" /> UNPAID
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
            Order Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor incoming WhatsApp customer orders for your assigned branch, update payment/order status, and view customer GPS delivery locations.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

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

      {/* DATE FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Date Filter:</span>
          {dateFilterPreset === 'CUSTOM' && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ml-1">
              📅 {formatDateDDMMYYYY(customDate)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'All Dates', value: 'ALL' },
            { label: 'Today', value: 'TODAY' },
            { label: 'Yesterday', value: 'YESTERDAY' },
            { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
            { label: 'This Month', value: 'THIS_MONTH' },
          ].map((dp) => (
            <button
              key={dp.value}
              onClick={() => setDateFilterPreset(dp.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                dateFilterPreset === dp.value
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dp.label}
            </button>
          ))}

          {/* Calendar Picker Box */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-all ${
            dateFilterPreset === 'CUSTOM'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}>
            <span className="text-xs font-semibold whitespace-nowrap">📅 Calendar Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value)
                  setDateFilterPreset('CUSTOM')
                }
              }}
              className={`text-xs font-bold focus:outline-none cursor-pointer bg-transparent ${
                dateFilterPreset === 'CUSTOM' ? 'text-white' : 'text-slate-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tabs Bar: Channel Source & Status Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        {/* Source Channel Filter */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Channel:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                sourceFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setSourceFilter('WEBSITE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sourceFilter === 'WEBSITE'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
            >
              🌐 Storefront Website
            </button>
            <button
              onClick={() => setSourceFilter('WHATSAPP')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sourceFilter === 'WHATSAPP'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              💬 WhatsApp Chatbot
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="overflow-x-auto flex items-center gap-1 pt-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
              : dateFilterPreset !== 'ALL'
              ? `No production orders found for the selected date filter. Click "All Dates" or "This Month" above to view past orders.`
              : 'Orders for this branch will automatically appear here when customers complete checkout.'}
          </p>
          {dateFilterPreset !== 'ALL' && (
            <button
              onClick={() => setDateFilterPreset('ALL')}
              className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              View All Dates
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">WhatsApp Number</th>
                  <th className="py-3.5 px-4">Items & Remarks</th>
                  <th className="py-3.5 px-4">Delivery Address & GPS Location</th>
                  <th className="py-3.5 px-4">Items & Remarks</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Payment</th>
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
                  const locInfo = parseOrderLocation(ord)
                  const isPaid = (ord.payment_status || '').toUpperCase() === 'PAID'
                  const isCancelled = (ord.status || '').toUpperCase() === 'CANCELLED'
                  const ordChannel = ((ord as any).order_channel || ((ord as any).whatsapp_message_id ? 'whatsapp' : 'storefront')).toLowerCase()
                  const isWebsite = ordChannel === 'storefront'

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-[11px]">
                          {ord.order_number || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isWebsite ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-100 text-cyan-800 border border-cyan-200 whitespace-nowrap">
                            🌐 Website
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            💬 WhatsApp
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          <Store className="w-3 h-3 text-blue-600" />
                          {branchName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {(() => {
                          const custDetails = getOrderCustomerDetails(ord)
                          return (
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">
                                {custDetails.name}
                              </p>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {custDetails.isWebsite ? '🌐 Storefront Guest' : '💬 WhatsApp Customer'}
                              </span>
                            </div>
                          )
                        })()}
                      </td>

                      <td className="py-3.5 px-4">
                        {(() => {
                          const custDetails = getOrderCustomerDetails(ord)
                          if (!custDetails.phone) return <span className="text-[11px] text-slate-400 italic">No Phone Captured</span>

                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono font-bold text-slate-800 text-[11px]">
                                {custDetails.displayPhone}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={`tel:+${custDetails.phone}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                                  title={`Call ${custDetails.name}`}
                                >
                                  <Phone className="w-2.5 h-2.5" /> Call
                                </a>
                                <a
                                  href={`https://wa.me/${custDetails.phone}?text=${encodeURIComponent(`Hello ${custDetails.name}! Regarding your Bestiet Fresh order ${ord.order_number}...`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 text-emerald-600" /> WhatsApp
                                </a>
                              </div>
                            </div>
                          )
                        })()}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-col gap-1.5 items-start">
                          <p className="font-semibold text-slate-800 text-[11px] leading-snug line-clamp-2" title={locInfo.address}>
                            📍 {locInfo.address}
                          </p>
                          {locInfo.hasGps ? (
                            <a
                              href={locInfo.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors whitespace-nowrap"
                              title="Open exact GPS location in Google Maps"
                            >
                              <MapPin className="w-3 h-3 text-white" />
                              <span>Open GPS Maps</span>
                              <ExternalLink className="w-3 h-3 text-emerald-200" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No GPS Shared</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {(() => {
                          const itemsList = Array.isArray(ord.items) && ord.items.length > 0
                            ? ord.items
                            : Array.isArray((ord as any).order_items) && (ord as any).order_items.length > 0
                            ? (ord as any).order_items
                            : []

                          if (itemsList.length === 0) {
                            return <span className="text-xs text-slate-400 italic">No item details</span>
                          }

                          return (
                            <div className="flex flex-col gap-1">
                              {itemsList.map((i: any, idx: number) => {
                                const fishName = i.product?.name || i.product_name || 'Fresh Fish'
                                const qtyKg = i.quantity_kg ?? i.quantity ?? 0
                                const cutType = (i.cutting_type || i.cut_type || 'whole').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-200/90 shadow-2xs whitespace-nowrap"
                                  >
                                    <span>🐟 <strong>{fishName}</strong></span>
                                    <span className="text-emerald-700 font-extrabold">• {qtyKg} kg</span>
                                    <span className="text-slate-600 font-medium text-[11px]">({cutType})</span>
                                  </span>
                                )
                              })}
                            </div>
                          )
                        })()}
                        {ord.customer_remarks && (
                          <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> {ord.customer_remarks}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-sm">₹{formatCurrency(totalAmt)}</span>
                      </td>

                      <td className="py-3.5 px-4">{getPaymentBadge(ord.payment_status)}</td>

                      <td className="py-3.5 px-4">{getStatusBadge(ord.status)}</td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {ord.created_at ? format(new Date(ord.created_at), 'dd MMM yyyy, hh:mm a') : 'Recent'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && !isCancelled && (
                            <button
                              onClick={() => setOrderToMarkPaid(ord)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                              title="Mark order as PAID"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Mark Paid</span>
                            </button>
                          )}

                          {!isCancelled && (
                            <button
                              onClick={() => setOrderToCancel(ord)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                              title="Cancel order and notify customer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Cancel</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDrawer(ord)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
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

      {/* MARK AS PAID CONFIRMATION MODAL */}
      {orderToMarkPaid && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Mark Order as PAID?</h3>
                <p className="text-xs text-slate-500 font-mono">#{orderToMarkPaid.order_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that payment of <strong className="text-slate-900">₹{orderToMarkPaid.total_amount || orderToMarkPaid.total}</strong> for customer <strong className="text-slate-900">{orderToMarkPaid.customer?.name || 'WhatsApp Customer'}</strong> has been received. This action will update payment status to PAID and log an audit timestamp.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrderToMarkPaid(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleConfirmMarkPaid}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'CONFIRM MARK PAID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL ORDER CONFIRMATION & WHATSAPP NOTIFICATION MODAL */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Are you sure you want to cancel this order?</h3>
                <p className="text-xs text-slate-500 font-mono">#{orderToCancel.order_number}</p>
              </div>
            </div>

            {cancellationNoticeFailed ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  {cancellationNoticeFailed}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={getWhatsAppChatUrl(cancellationPhone, orderToCancel.order_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open WhatsApp Chat</span>
                  </a>
                  <button
                    onClick={() => {
                      setOrderToCancel(null)
                      setCancellationNoticeFailed(null)
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The customer will be notified on WhatsApp and reserved stock will be automatically restored to branch inventory.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderToCancel(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={handleConfirmCancelOrder}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'CONFIRM CANCEL'}
                  </button>
                </div>
              </>
            )}
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
                  {getPaymentBadge(selectedOrder.payment_status)}
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
                    onClick={() => setOrderToCancel(selectedOrder)}
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

                  {(() => {
                    const drawerCust = getOrderCustomerDetails(selectedOrder)
                    return (
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{drawerCust.name}</p>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {drawerCust.isWebsite ? '🌐 Storefront Order' : '💬 WhatsApp Chatbot Order'}
                          </span>
                        </div>
                        {drawerCust.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:+${drawerCust.phone}`}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors text-[11px]"
                              title={`Call ${drawerCust.name}`}
                            >
                              <Phone className="w-3 h-3 text-slate-600" />
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/${drawerCust.phone}?text=${encodeURIComponent(`Hello ${drawerCust.name}! Regarding your Bestiet Fresh order ${selectedOrder.order_number}...`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-colors text-[11px]"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-mono">{drawerCust.displayPhone}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No phone captured</span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Text Address & GPS Card */}
                  {(() => {
                    const drawerLoc = parseOrderLocation(selectedOrder)
                    return (
                      <div className="pt-2 border-t border-slate-200/60 text-slate-600 space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 text-xs">Delivery Address:</p>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              {drawerLoc.address}
                            </p>
                          </div>
                        </div>

                        {drawerLoc.hasGps ? (
                          <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-emerald-600" />
                                📍 Live Satellite GPS Attached
                              </span>
                              {drawerLoc.lat && drawerLoc.lng && (
                                <span className="text-[10px] font-mono text-emerald-700">
                                  {drawerLoc.lat.toFixed(4)}°, {drawerLoc.lng.toFixed(4)}°
                                </span>
                              )}
                            </div>
                            <a
                              href={drawerLoc.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                            >
                              <span>🗺️ Open in Google Maps</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic bg-slate-100 p-2.5 rounded-xl">GPS Satellite Location not shared for this order</p>
                        )}
                      </div>
                    )
                  })()}
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
                      selectedOrder.items.map((item) => {
                        const qty = Number(item.quantity ?? item.quantity_kg ?? 1)
                        const unit = item.unit || item.product?.unit || 'kg'
                        const unitPrice = Number(item.unit_price ?? item.price_per_kg ?? item.product?.price_per_kg ?? 0)
                        const subtotalAmt = Number(item.total ?? item.total_price ?? item.subtotal ?? (qty * unitPrice))

                        return (
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
                              <p className="font-extrabold text-slate-900">₹{formatCurrency(subtotalAmt)}</p>
                              <p className="text-[10px] text-slate-400">
                                {qty} {unit} × ₹{formatCurrency(unitPrice)}/{unit}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">No items specified for this order</div>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>₹{formatCurrency(Number(selectedOrder.total_amount || selectedOrder.total || 0) - Number(selectedOrder.delivery_fee || selectedOrder.delivery_charge || 30))}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee:</span>
                      <span>₹{formatCurrency(selectedOrder.delivery_fee || selectedOrder.delivery_charge || 30)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total Paid:</span>
                      <span className="text-emerald-700">₹{formatCurrency(selectedOrder.total_amount || selectedOrder.total || 0)}</span>
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
