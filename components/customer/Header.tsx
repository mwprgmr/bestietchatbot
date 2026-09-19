'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { MapPin, Search, ShoppingBag, User, ChevronDown, X } from 'lucide-react'

function HeaderComponent() {
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs w-full max-w-full gpu-layer">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5">
        {/* Main Nav Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 lg:gap-10">
          
          {/* 1. BRAND LOGO (Left on Mobile & Desktop) */}
          <Link href="/" className="flex items-center shrink-0 group">
            <img src="/logo-brand.png" alt="Bestiet Fresh Logo" className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>

          {/* 2. CENTER SEARCH BAR (Desktop Only) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh fish, chicken, mutton, prawns..."
                className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/25 focus:border-[#39B54A] transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-[#39B54A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* 3. LOCATION SELECTOR */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-2 text-left cursor-pointer px-3 py-1.5 bg-slate-50 hover:bg-slate-100 sm:bg-slate-50/80 rounded-xl border border-slate-200 shrink-0 max-w-[170px] sm:max-w-xs transition-all active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-[#39B54A]/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#39B54A]" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] font-black text-[#39B54A] uppercase tracking-wider hidden sm:block">
                Express Delivery 15-30 Mins
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {deliveryAddress || selectedBranch?.name || 'Select Location'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400 ml-0.5" />
          </button>

          {/* 4. RIGHT USER & CART ACTIONS (Desktop) */}
          <div className="hidden md:flex items-center gap-5 sm:gap-6 shrink-0">
            {/* Account Link */}
            <Link
              href="/orders"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-[#39B54A] hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm"
            >
              <User className="w-4.5 h-4.5" />
              <span>Orders</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#39B54A] hover:bg-[#2ea03e] text-white transition-all font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <div className="relative">
                <ShoppingBag className="w-4.5 h-4.5" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-[#39B54A] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-2xs">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </button>
          </div>
        </div>

        {/* Upgraded Mobile Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-2.5 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fresh fish, chicken, mutton..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/25 focus:border-[#39B54A] transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-[#39B54A] absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </header>
  )
}

const Header = React.memo(HeaderComponent)
export default Header
