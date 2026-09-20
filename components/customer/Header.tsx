'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { MapPin, Search, ShoppingBag, User, ChevronDown, X } from 'lucide-react'

export default function Header() {
  const router = useRouter()
  const {
    selectedBranch,
    deliveryAddress,
    setIsLocationOpen,
    cart,
    setIsCartOpen,
  } = useCustomer()
  const [searchQuery, setSearchQuery] = useState('')

  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const clearSearch = () => setSearchQuery('')

  return (
    <header className="sticky top-0 z-40 bg-white/95 sm:bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs w-full max-w-full transform-gpu gpu-layer">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5">
        {/* Main Nav Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 lg:gap-10">
          
          {/* 1. BRAND LOGO (Left on Mobile & Desktop) */}
          <Link href="/" className="flex items-center shrink-0 group">
            <img src="/logo-brand.png" alt="Bestiet Fresh Logo" className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>

          {/* 2. CENTER SEARCH BAR (Desktop Only) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 rounded-full p-1 pl-5 shadow-2xs focus-within:ring-2 focus-within:ring-[#7FBA44]/30 focus-within:border-[#7FBA44] transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh fish, chicken, mutton, prawns..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 pr-2"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-extrabold text-xs sm:text-sm px-5 py-2 rounded-full shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* 3. LOCATION SELECTOR */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-2 text-left cursor-pointer px-3 py-2 bg-slate-50 hover:bg-slate-100 sm:bg-slate-50/80 rounded-xl border border-slate-200 shrink-0 max-w-[170px] sm:max-w-xs transition-all active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-[#7FBA44]/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#7FBA44]" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate leading-tight min-w-0">
              {deliveryAddress || selectedBranch?.name || 'Select Location'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400 ml-0.5" />
          </button>

          {/* 4. RIGHT USER & CART ACTIONS (Desktop) */}
          <div className="hidden md:flex items-center gap-5 sm:gap-6 shrink-0">
            {/* Account Link */}
            <Link
              href="/orders"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-[#7FBA44] hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm"
            >
              <User className="w-4.5 h-4.5" />
              <span>Orders</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#7FBA44] hover:bg-[#71A83A] text-white transition-all font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <div className="relative">
                <ShoppingBag className="w-4.5 h-4.5" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-[#7FBA44] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-2xs">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </button>
          </div>
        </div>

        {/* Upgraded Mobile Capsule Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-1.5 md:hidden">
          <div className="relative flex items-center bg-slate-50 focus-within:bg-white border border-slate-200 rounded-full p-1 pl-4 shadow-2xs focus-within:ring-2 focus-within:ring-[#7FBA44]/30 focus-within:border-[#7FBA44] transition-all">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ..."
              className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-900 placeholder-slate-400 pr-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 text-slate-400 hover:text-slate-700 mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="shrink-0 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>
    </header>
  )
}
