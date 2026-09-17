'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { MapPin, Search, ShoppingBag, User, ChevronDown, Zap, X } from 'lucide-react'

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
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-4">
        {/* Main Nav Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 lg:gap-10">
          
          {/* 1. BRAND LOGO (Left on Mobile & Desktop) */}
          <Link href="/" className="flex items-center shrink-0">
            <img src="/logo-brand.png" alt="Bestiet Fresh Logo" className="h-8 sm:h-11 md:h-13 w-auto object-contain" />
          </Link>

          {/* 2. CENTER SEARCH BAR (Desktop Only) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search fresh fish, chicken, mutton, prawns...'
                className="w-full pl-11 pr-10 py-3 sm:py-3.5 bg-[#F8FAF8] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm font-semibold text-[#0F172A] placeholder-[#0F172A]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 focus:border-[#39B54A] transition-all shadow-2xs"
              />
              <Search className="w-4.5 h-4.5 text-[#39B54A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#0F172A]/40 hover:text-[#0F172A] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* 3. LOCATION SELECTOR (Right on Mobile, Center-Left on Desktop) */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 text-left cursor-pointer px-2.5 sm:px-3.5 py-1.5 bg-[#F8FAF8] sm:bg-transparent rounded-full sm:rounded-none border sm:border-0 border-[#E2E8F0] sm:border-l shrink-0 max-w-[170px] sm:max-w-xs"
          >
            <Zap className="w-4 h-4 text-[#39B54A] fill-[#39B54A] shrink-0 hidden sm:block" />
            <MapPin className="w-3.5 h-3.5 text-[#39B54A] shrink-0 sm:hidden" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] sm:text-xs font-black text-[#0F172A] uppercase hidden sm:block">
                Delivery in 15-30 Mins*
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0F172A] sm:text-[#0F172A]/70 truncate">
                {deliveryAddress || selectedBranch?.name || 'Kazhakkoottam Branch'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#39B54A] ml-0.5" />
          </button>

          {/* 4. RIGHT USER & CART ACTIONS (Desktop Only - Hidden on Mobile as per request) */}
          <div className="hidden md:flex items-center gap-5 sm:gap-7 shrink-0">
            {/* Account Link */}
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center text-[#0F172A] hover:text-[#39B54A] transition-colors group"
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-extrabold mt-0.5">Account</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center text-[#0F172A] hover:text-[#39B54A] transition-colors relative group cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#39B54A] text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold mt-0.5">Cart</span>
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
              placeholder='Search fresh fish, chicken, mutton...'
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-[#F8FAF8] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] placeholder-[#0F172A]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 focus:border-[#39B54A] transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-[#39B54A] absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#0F172A]/40 hover:text-[#0F172A]"
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
