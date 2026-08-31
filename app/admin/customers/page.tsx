'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types/database'
import {
  Users,
  Search,
  Phone,
  ShoppingBag,
  MapPin,
  Calendar,
  Eye,
  UserCheck
} from 'lucide-react'
import { format } from 'date-fns'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          addresses(*),
          orders(*, items:order_items(*, product:products(*)))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDetail = (cust: any) => {
    setSelectedCustomer(cust)
    setIsModalOpen(true)
  }

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Customer Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Directory of all WhatsApp customers, delivery addresses, and lifetime purchase history.
          </p>
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
            placeholder="Search by customer name or WhatsApp phone number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customers List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading customer database...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No customers registered yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Customers will automatically be added when they message the Bestiet Fresh WhatsApp chatbot.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">WhatsApp Phone</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Location Status</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredCustomers.map((cust) => {
                  const ordersCount = cust.orders?.length || 0
                  const totalSpent = cust.orders?.reduce((acc: number, o: any) => acc + Number(o.total_amount), 0) || 0
                  const hasLocationShared =
                    cust.addresses?.some((a: any) => a.latitude && a.longitude) ||
                    cust.orders?.some((o: any) => o.latitude && o.longitude)

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'W'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{cust.name || 'WhatsApp Customer'}</p>
                            <p className="text-[10px] text-slate-400">ID: {cust.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-800 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {cust.phone}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">{ordersCount} orders</td>

                      <td className="py-3.5 px-4">
                        {hasLocationShared ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MapPin className="w-3 h-3 text-emerald-600" /> Location Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                            ○ Location Not Shared
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          ₹{totalSpent.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {format(new Date(cust.created_at), 'dd MMM yyyy')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(cust)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
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

      {/* Customer Profile Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                  {selectedCustomer.name ? selectedCustomer.name.charAt(0).toUpperCase() : 'W'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedCustomer.name || 'WhatsApp Customer'}</h3>
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedCustomer.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Saved Delivery Addresses */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Saved Delivery Addresses
                </h4>
                {selectedCustomer.addresses?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No saved address yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.addresses?.map((addr: any) => (
                      <div key={addr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 block mb-0.5">{addr.title || 'Home'}</span>
                        <p>{addr.address_line1}</p>
                        {addr.address_line2 && <p>{addr.address_line2}</p>}
                        <p>{addr.city} - {addr.pincode}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Order History ({selectedCustomer.orders?.length || 0})
                </h4>
                {selectedCustomer.orders?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No orders placed yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {selectedCustomer.orders?.map((ord: any) => (
                      <div key={ord.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-slate-900">{ord.order_number}</p>
                          <p className="text-[10px] text-slate-400">
                            {format(new Date(ord.created_at), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-700">₹{ord.total_amount}</span>
                          <span className="block text-[10px] text-slate-500 font-semibold">{ord.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Customer Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
