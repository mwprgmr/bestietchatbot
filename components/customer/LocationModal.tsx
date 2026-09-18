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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#39B54A]/10 text-[#39B54A]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Select Delivery Location</h3>
              <p className="text-xs text-slate-500 font-medium">Products & stock availability depend on your area</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* GPS Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={detecting}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]"
          >
            <Navigation className="w-4 h-4 text-[#39B54A] group-hover:rotate-45 transition-transform" />
            <span>{detecting ? 'Detecting Location...' : 'Use Current GPS Location'}</span>
          </button>

          {/* Service Branches Selector */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5">
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
                        ? 'bg-[#39B54A]/10 border-[#39B54A] ring-2 ring-[#39B54A]/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-[#39B54A] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? 'bg-[#39B54A] text-white' : 'bg-slate-100 border border-slate-200 text-slate-500'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">{b.location}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#39B54A] text-white flex items-center justify-center shrink-0 shadow-2xs">
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
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Or Enter Custom Address:
            </label>
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="House Name, Flat No, Street, Landmark..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
            />
            <button
              type="submit"
              className="w-full py-3 bg-[#39B54A] hover:bg-[#2ea03e] text-white font-extrabold rounded-xl text-xs transition-all shadow-xs active:scale-[0.98]"
            >
              Confirm Delivery Address
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
