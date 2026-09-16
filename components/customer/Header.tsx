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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
      {/* Top Location Strip */}
      <div className="bg-[#F7F8F5] border-b border-slate-200/60 py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setIsLocationOpen(true)}
            className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 font-medium transition-colors group cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
              Delivering to:
            </span>
            <span className="truncate max-w-[200px] sm:max-w-xs font-semibold text-emerald-800">
              {deliveryAddress} ({selectedBranch.name.replace(' Branch', '')})
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
          </button>

          <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Free Express Delivery above ₹500
            </span>
            <a
              href="https://wa.me/919656055969"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 font-semibold flex items-center gap-1"
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
            <div className="p-1 rounded-xl bg-white border border-slate-100 shadow-xs group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-[#101814] leading-tight flex items-center gap-1">
                BESTIET FRESH
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">
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
                className="w-full pl-10 pr-4 py-2 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          {/* Quick Nav & User Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/offers"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
            >
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offers</span>
            </Link>

            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {totalItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#101814] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-emerald-600">
                    {totalItemCount}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wider">Cart</div>
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
              className="w-full pl-9 pr-3 py-2 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </form>

        {/* Categories Bar */}
        <nav className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-6 overflow-x-auto no-scrollbar text-xs font-semibold text-slate-700">
          <Link href="/" className="text-emerald-700 font-extrabold hover:text-emerald-800 whitespace-nowrap">
            All Products
          </Link>
          <Link href="/category/fish" className="hover:text-emerald-700 whitespace-nowrap">
            Fish & Seafood
          </Link>
          <Link href="/category/chicken" className="hover:text-emerald-700 whitespace-nowrap">
            Fresh Chicken
          </Link>
          <Link href="/category/mutton" className="hover:text-emerald-700 whitespace-nowrap">
            Tender Mutton
          </Link>
          <Link href="/category/seafood" className="hover:text-emerald-700 whitespace-nowrap">
            Prawns & Crabs
          </Link>
          <Link href="/category/ready-to-cook" className="hover:text-emerald-700 whitespace-nowrap">
            Ready to Cook
          </Link>
          <Link href="/category/combos" className="hover:text-emerald-700 whitespace-nowrap">
            Combos & Packs
          </Link>
          <Link href="/offers" className="text-emerald-700 font-bold hover:text-emerald-800 whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Today's Deals
          </Link>
        </nav>
      </div>
    </header>
  )
}
