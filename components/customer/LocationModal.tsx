'use client'

import React, { useState } from 'react'
import { useCustomer, Branch } from '@/lib/context/CustomerContext'
import { MapPin, Navigation, Check, X, Building2 } from 'lucide-react'

export default function LocationModal() {
  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    deliveryAddress,
    setDeliveryAddress,
    isLocationOpen,
    setIsLocationOpen,
    setUserLocation,
  } = useCustomer()

  const [inputAddress, setInputAddress] = useState(deliveryAddress)
  const [detecting, setDetecting] = useState(false)

  if (!isLocationOpen) return null

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude, addressName: 'Current Location' })
        // If latitude is near Kazhakkoottam (approx 8.56), set Manvila Branch
        const detectedAddress = `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        setInputAddress(detectedAddress)
        setDeliveryAddress(detectedAddress)
        setDetecting(false)
        setIsLocationOpen(false)
      },
      (error) => {
        console.warn('Geolocation error:', error)
        alert('Could not fetch GPS location. Please select your area manually.')
        setDetecting(false)
      },
      { timeout: 10000 }
    )
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    const newAddr = `${branch.location}`
    setInputAddress(newAddr)
    setDeliveryAddress(newAddr)
    setIsLocationOpen(false)
  }

  const handleSaveCustomAddress = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputAddress.trim()) {
      setDeliveryAddress(inputAddress.trim())
      setIsLocationOpen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Select Delivery Location</h3>
              <p className="text-xs text-slate-500">Products & stock availability depend on your area</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* GPS Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={detecting}
            className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
          >
            <Navigation className="w-4 h-4 text-emerald-600 group-hover:rotate-45 transition-transform" />
            <span>{detecting ? 'Detecting Location...' : 'Use Current GPS Location'}</span>
          </button>

          {/* Service Branches Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5">
              Select Servicing Branch:
            </label>
            <div className="space-y-2.5">
              {branches.map((b) => {
                const isSelected = selectedBranch.id === b.id
                return (
                  <div
                    key={b.id}
                    onClick={() => handleBranchSelect(b)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{b.location}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Manual Address Input */}
          <form onSubmit={handleSaveCustomAddress} className="pt-3 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Or Enter Custom Address:
            </label>
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="House Name, Flat No, Street, Landmark..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#101814] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              Confirm Delivery Address
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
