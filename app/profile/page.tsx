'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { User, MapPin, ShoppingBag, Plus, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function ProfilePage() {
  const { deliveryAddress, setDeliveryAddress, selectedBranch } = useCustomer()

  const [name, setName] = useState('Anjali Nair')
  const [phone, setPhone] = useState('+91 96560 55969')
  const [savedAddresses, setSavedAddresses] = useState<string[]>([
    deliveryAddress,
    'Flat 4B, Emerald Heights, Kazhakkoottam, Trivandrum',
    'House 12, Kowdiar Gardens, Peroorkada, Trivandrum',
  ])

  const [newAddr, setNewAddr] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault()
    if (newAddr.trim()) {
      setSavedAddresses([newAddr.trim(), ...savedAddresses])
      setDeliveryAddress(newAddr.trim())
      setNewAddr('')
      setShowAddForm(false)
    }
  }

  return (
    <StorefrontLayout>
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MY ACCOUNT & PROFILE</h1>
          <p className="text-xs text-slate-500">Manage your profile, delivery addresses, and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center border-2 border-emerald-500">
              {name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{name}</h2>
              <p className="text-xs text-slate-500">{phone}</p>
              <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                Verified Customer
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link
              href="/orders"
              className="p-3.5 rounded-2xl bg-[#F7F8F5] hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all font-bold text-slate-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>My Orders</span>
              </div>
              <span>→</span>
            </Link>

            <Link
              href="/offers"
              className="p-3.5 rounded-2xl bg-[#F7F8F5] hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all font-bold text-slate-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Offers</span>
              </div>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Saved Addresses Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" /> Saved Delivery Addresses
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Address
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddAddress} className="p-4 bg-[#F7F8F5] rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">New Address Details:</label>
              <input
                type="text"
                required
                value={newAddr}
                onChange={(e) => setNewAddr(e.target.value)}
                placeholder="House Name, Flat No, Landmark, Pincode..."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-xs"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {savedAddresses.map((addr, idx) => {
              const isSelected = deliveryAddress === addr
              return (
                <div
                  key={idx}
                  onClick={() => setDeliveryAddress(addr)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-800 pr-2">
                    {addr}
                    {isSelected && (
                      <span className="ml-2 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  )
}
