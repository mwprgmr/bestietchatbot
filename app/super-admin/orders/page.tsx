'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout, { useSuperAdminContext } from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Search, RefreshCw, MessageSquare, Globe, Store, Phone, ExternalLink } from 'lucide-react'

function OrdersContent() {
  const { filter } = useSuperAdminContext()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'STOREFRONT' | 'WHATSAPP'>('ALL')
  const [productsMap, setProductsMap] = useState<Record<string, string>>({})

  const getProductName = (i: any) => {
    const rawName = i.product?.name || i.product_name || (i.product_id ? productsMap[i.product_id] : '') || ''
    if (!rawName) return 'Ayala'
    return rawName.replace(/\b[a-z]/g, (l: string) => l.toUpperCase())
  }

  const getItemIcon = (name: string) => {
    const n = (name || '').toLowerCase()
    if (n.includes('chicken')) return '🍗'
    if (n.includes('mutton') || n.includes('goat') || n.includes('beef') || n.includes('meat')) return '🥩'
    if (n.includes('prawn') || n.includes('shrimp') || n.includes('crab') || n.includes('squid')) return '🦐'
    return '🐟'
  }

  useEffect(() => {
    fetchOrders()
  }, [filter, statusFilter, channelFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let prodsMapObj: Record<string, string> = {}
      try {
        const res = await fetch('/api/products')
        const json = await res.json()
        if (json.success && Array.isArray(json.products)) {
          json.products.forEach((p: any) => {
            if (p.id && p.name) prodsMapObj[p.id] = p.name
          })
        }
      } catch (e) {
        console.warn('API products fetch fallback:', e)
      }

      if (Object.keys(prodsMapObj).length === 0) {
        const { data: prods } = await supabase.from('products').select('id, name')
        if (prods && Array.isArray(prods)) {
          prods.forEach((p: any) => { prodsMapObj[p.id] = p.name })
        }
      }

      setProductsMap(prodsMapObj)

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          branch:branches(*),
          items:order_items(*, product:products(*)),
          order_items(*, product:products(*))
        `)
        .gte('business_date', filter.startDate)
        .lte('business_date', filter.endDate)
        .order('created_at', { ascending: false })

      if (filter.branchId !== 'ALL') {
        query = query.eq('branch_id', filter.branchId)
      }

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter.toLowerCase())
      }

      if (channelFilter === 'STOREFRONT') {
        query = query.or('order_channel.eq.storefront,order_channel.is.null')
      } else if (channelFilter === 'WHATSAPP') {
        query = query.eq('order_channel', 'whatsapp')
      }

      const { data, error } = await query
      if (error) throw error

      const production = (data || []).filter((o: any) => {
        if (o.source === 'test') return false
        const remarks = o.customer_remarks || ''
        const custName = o.customer?.name || ''
        const phone = o.customer_phone || o.customer?.phone || ''
        if (remarks.includes('[TEST_ORDER]') || remarks.includes('Tester') || custName.includes('Tester') || phone.startsWith('91987654')) {
          return false
        }
        return true
      })

      setOrders(production)
    } catch (err) {
      console.error('Super Admin Orders Error:', err)
    } finally {
      setLoading(false)
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

  const filteredOrders = orders.filter((ord) => {
    if (!search) return true
    const q = search.toLowerCase()
    const num = (ord.order_number || '').toLowerCase()
    const custId = (ord.customer_id || '').toLowerCase()
    const cust = getOrderCustomerDetails(ord)
    const loc = parseOrderLocation(ord)
    return num.includes(q) || custId.includes(q) || cust.phone.includes(q) || cust.displayPhone.toLowerCase().includes(q) || cust.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7FBA44]" />
        <p className="text-sm font-semibold">Loading Production Orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wide">ORDER ANALYTICS & LOG</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global order monitoring across WhatsApp and Website channels
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 bg-white border border-[#E2ECE7] hover:border-[#7FBA44] hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7FBA44]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E2ECE7] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2ECE7] flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="bg-white border border-[#E2ECE7] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#7FBA44]"
            >
              <option value="ALL">All Channels</option>
              <option value="STOREFRONT">🌐 Storefront Website</option>
              <option value="WHATSAPP">💬 WhatsApp Chatbot</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#E2ECE7] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#7FBA44]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PREPARING">Preparing</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="text-xs text-slate-500 font-medium">({filteredOrders.length} orders found)</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, phone, customer, address..."
              className="bg-white border border-[#E2ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7FBA44]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-[#E2ECE7]">
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Customer & Contact</th>
                <th className="p-3.5">Delivery Address & GPS</th>
                <th className="p-3.5">Ordered Fish & Quantity (kg)</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const custDetails = getOrderCustomerDetails(ord)
                  const locDetails = parseOrderLocation(ord)
                  const channel = custDetails.channel
                  const isWa = channel === 'whatsapp'
                  const itemsList = Array.isArray(ord.items) && ord.items.length > 0
                    ? ord.items
                    : Array.isArray(ord.order_items) && ord.order_items.length > 0
                    ? ord.order_items
                    : []

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 font-mono">
                        {ord.order_number}
                      </td>
                      <td className="p-3.5">
                        {isWa ? (
                          <span className="inline-flex items-center gap-1 bg-[#F0FDF4] border border-[#7FBA44]/30 text-[#71A83A] px-2 py-0.5 rounded text-[10px] font-bold">
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Globe className="w-3 h-3" /> Website
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {ord.branch?.name || 'Manvila'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{custDetails.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span>{custDetails.displayPhone}</span>
                          {custDetails.phone && (
                            <a
                              href={`https://wa.me/${custDetails.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#7FBA44] hover:text-[#71A83A]"
                              title="Open WhatsApp Chat"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="flex flex-col gap-1.5 items-start">
                          <p className="font-medium text-slate-700 text-[11px] leading-snug line-clamp-2" title={locDetails.address}>
                            📍 {locDetails.address}
                          </p>
                          {locDetails.hasGps ? (
                            <a
                              href={locDetails.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F0FDF4] text-[#71A83A] border border-[#7FBA44]/40 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                              title="Open GPS Location in Google Maps"
                            >
                              <ExternalLink className="w-3 h-3 text-[#7FBA44]" />
                              <span>GPS Maps</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No GPS</span>
                          )}
                        </div>
                      </td>

                      {/* Ordered Fish, Weight in KG & Cut Type Column */}
                      <td className="p-3.5">
                        {itemsList.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">No item details</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                             {itemsList.map((i: any, idx: number) => {
                              const fishName = getProductName(i)
                              const icon = getItemIcon(fishName)
                              const qtyKg = i.quantity_kg ?? i.quantity ?? 0
                              const cutType = (i.cutting_type || i.cut_type || 'whole').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-[#F0FDF4] text-[#71A83A] border border-[#7FBA44]/30 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap"
                                >
                                  {icon} <strong>{fishName}</strong> — {qtyKg} kg <span className="text-slate-500 font-normal">({cutType})</span>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-[#7FBA44] text-sm">
                        ₹{Number(ord.total_amount ?? ord.total ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'delivered' ? 'bg-[#F0FDF4] text-[#71A83A] border border-[#7FBA44]/30' :
                          ord.status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {ord.business_date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '')}
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

export default function SuperAdminOrdersPage() {
  return (
    <SuperAdminLayout>
      <OrdersContent />
    </SuperAdminLayout>
  )
}
