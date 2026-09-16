'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { MapPin, Search, ShoppingBag, User, ChevronDown, Percent, Sparkles } from 'lucide-react'

export default function Header() {
  const router = useRouter()
  const {
    selectedBranch,
    deliveryAddress,
    setIsLocationOpen,
    cart,
    cartSubtotal,
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
    <header className="sticky top-0 z-40 bg-[#F7F2EB] border-b border-[#EEEEEE] shadow-2xs">
      {/* Top Location Strip */}
      <div className="bg-[#EEEEEE] border-b border-[#EEEEEE] py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 text-[#232B1E] hover:text-[#8B9A6E] font-medium transition-colors group cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#8B9A6E] shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-bold uppercase tracking-wide text-[11px]">
              Delivering to:
            </span>
            <span className="truncate max-w-[200px] sm:max-w-xs font-bold text-[#8B9A6E]">
              {deliveryAddress} ({selectedBranch.name.replace(' Branch', '')})
            </span>
            <ChevronDown className="w-3 h-3 text-[#232B1E]/60 group-hover:text-[#8B9A6E]" />
          </button>

          <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-[#232B1E]/80">
            <span className="inline-flex items-center gap-1 text-[#8B9A6E] font-bold bg-[#F7F2EB] px-2.5 py-0.5 rounded-full border border-[#8B9A6E]/30">
              <Sparkles className="w-3 h-3 text-[#8B9A6E]" /> Free Express Delivery above ₹500
            </span>
            <a
              href="https://wa.me/919656055969"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#8B9A6E] font-semibold flex items-center gap-1 text-[#232B1E]"
            >
              <span>Order via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="p-1 rounded-xl bg-[#F7F2EB] border border-[#EEEEEE] shadow-2xs group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="font-black text-lg tracking-tight text-[#232B1E] leading-tight flex items-center gap-1">
                BESTIET FRESH
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B9A6E] animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-[#8B9A6E] tracking-wider uppercase">
                Your Fresh Friend At The Door
              </p>
            </div>
          </Link>

          {/* Header Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh Neymeen, Ayala, Prawns, Chicken, Mutton..."
                className="w-full pl-10 pr-4 py-2 bg-[#EEEEEE] border border-[#EEEEEE] rounded-xl text-xs font-semibold text-[#232B1E] placeholder-[#232B1E]/50 focus:bg-[#F7F2EB] focus:outline-none focus:ring-2 focus:ring-[#8B9A6E]/40 focus:border-[#8B9A6E] transition-all"
              />
              <Search className="w-4 h-4 text-[#232B1E]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          {/* Quick Nav & User Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/offers"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#8B9A6E] bg-[#EEEEEE] hover:bg-[#8B9A6E]/10 rounded-xl border border-[#EEEEEE] transition-colors"
            >
              <Percent className="w-3.5 h-3.5 text-[#8B9A6E]" />
              <span>Offers</span>
            </Link>

            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#232B1E] hover:text-[#8B9A6E] hover:bg-[#EEEEEE] rounded-xl transition-colors"
            >
              <User className="w-4 h-4 text-[#8B9A6E]" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#232B1E] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#8B9A6E]">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <div className="text-[10px] font-medium text-[#F7F2EB] uppercase tracking-wider">Cart</div>
                <div>₹{cartSubtotal}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <form onSubmit={handleSearchSubmit} className="mt-2 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fish, chicken, mutton..."
              className="w-full pl-9 pr-3 py-2 bg-[#EEEEEE] border border-[#EEEEEE] rounded-xl text-xs font-medium text-[#232B1E] placeholder-[#232B1E]/50 focus:bg-[#F7F2EB] focus:outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            />
            <Search className="w-3.5 h-3.5 text-[#232B1E]/50 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </form>

        {/* Categories Bar */}
        <nav className="mt-3 pt-2 border-t border-[#EEEEEE] flex items-center gap-6 overflow-x-auto no-scrollbar text-xs font-semibold text-[#232B1E]">
          <Link href="/" className="text-[#8B9A6E] font-black hover:text-[#7A895D] whitespace-nowrap">
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
            Combos & Packs
          </Link>
          <Link href="/offers" className="text-[#8B9A6E] font-bold hover:text-[#7A895D] whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8B9A6E]" /> Today's Deals
          </Link>
        </nav>
      </div>
    </header>
  )
}
