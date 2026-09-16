'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { MapPin, Search, ShoppingBag, User, ChevronDown, Zap, Sparkles } from 'lucide-react'

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

  return (
    <header className="sticky top-0 z-40 bg-[#F7F2EB] border-b border-[#EEEEEE] shadow-2xs w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        {/* Main Nav Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          
          {/* 1. BRAND LOGO ONLY (NO TEXT) */}
          <Link href="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="Bestiet Fresh Logo" className="h-8 sm:h-10 w-auto object-contain" />
          </Link>

          {/* 2. LOCATION SELECTOR (Desktop & Mobile) */}
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 text-left cursor-pointer group hover:opacity-85 transition-opacity px-2 sm:px-3 py-1 bg-white sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-[#EEEEEE] sm:border-l shrink-0 max-w-[150px] sm:max-w-xs"
          >
            <Zap className="w-3.5 h-3.5 text-[#8B9A6E] fill-[#8B9A6E] shrink-0 hidden sm:block" />
            <MapPin className="w-3.5 h-3.5 text-[#8B9A6E] shrink-0 sm:hidden" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] font-black text-[#232B1E] uppercase hidden sm:block">
                Delivery in 15-30 Mins*
              </span>
              <span className="text-[11px] font-bold text-[#232B1E] sm:text-[#232B1E]/70 truncate">
                {deliveryAddress || selectedBranch?.name || 'Kazhakkoottam Branch'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 shrink-0 text-[#8B9A6E] group-hover:translate-y-0.5 transition-transform ml-0.5" />
          </button>

          {/* 3. CENTER SEARCH BAR (Desktop) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search for "neymeen", "chicken curry cut", "mutton"...'
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#EEEEEE] rounded-xl text-xs font-semibold text-[#232B1E] placeholder-[#232B1E]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A6E]/40 focus:border-[#8B9A6E] transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-[#232B1E]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          {/* 4. RIGHT USER & CART ACTIONS */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            {/* Account Link */}
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center text-[#232B1E] hover:text-[#8B9A6E] transition-colors group"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-extrabold mt-0.5">Account</span>
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center text-[#232B1E] hover:text-[#8B9A6E] transition-colors relative group cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#8B9A6E] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-extrabold mt-0.5">Cart</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-2 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search for "neymeen", "chicken", "mutton"...'
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#EEEEEE] rounded-xl text-xs font-semibold text-[#232B1E] placeholder-[#232B1E]/40 focus:outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            />
            <Search className="w-3.5 h-3.5 text-[#232B1E]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </form>

        {/* Categories Sub-nav */}
        <nav className="mt-2 pt-1.5 border-t border-[#EEEEEE] flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar text-xs font-bold text-[#232B1E] w-full">
          <Link href="/" className="text-[#8B9A6E] font-extrabold hover:underline whitespace-nowrap">
            All Products
          </Link>
          <Link href="/category/fish" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Fish & Seafood
          </Link>
          <Link href="/category/chicken" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Fresh Chicken
          </Link>
          <Link href="/category/mutton" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Tender Mutton
          </Link>
          <Link href="/category/seafood" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Prawns & Crabs
          </Link>
          <Link href="/category/ready-to-cook" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Ready to Cook
          </Link>
          <Link href="/category/combos" className="hover:text-[#8B9A6E] whitespace-nowrap">
            Combos
          </Link>
          <Link href="/offers" className="text-[#8B9A6E] hover:underline whitespace-nowrap flex items-center gap-1 ml-auto">
            <Sparkles className="w-3 h-3 text-[#8B9A6E]" /> Offers
          </Link>
        </nav>
      </div>
    </header>
  )
}
