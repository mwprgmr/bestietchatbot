'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Home, Grid, Search, ShoppingBag, User, ArrowRight } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const { cart, grandTotal, setIsCartOpen } = useCustomer()

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Don't show bottom nav on checkout or order success pages to avoid clutter
  if (pathname?.startsWith('/checkout') || pathname?.startsWith('/order-success')) {
    return null
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none">
      {/* Sticky Cart Bar */}
      {totalItems > 0 && (
        <div className="p-3 px-4 bg-[#8B9A6E] text-white shadow-xl flex items-center justify-between pointer-events-auto border-t border-[#8B9A6E]/50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#232B1E] flex items-center justify-center font-extrabold text-xs text-white">
              {totalItems}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#F7F2EB]/90">
                {totalItems} ITEM{totalItems > 1 ? 'S' : ''} ADDED
              </div>
              <div className="text-sm font-extrabold text-white">₹{grandTotal}</div>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="py-1.5 px-3.5 bg-[#F7F2EB] text-[#232B1E] font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs hover:bg-white transition-colors"
          >
            <span>VIEW CART</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8B9A6E]" />
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="bg-[#F7F2EB] border-t border-[#EEEEEE] py-2 px-3 flex items-center justify-around text-[#232B1E]/70 pointer-events-auto shadow-2xl">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            pathname === '/' ? 'text-[#8B9A6E]' : 'hover:text-[#232B1E]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/category/fish"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            pathname?.startsWith('/category') ? 'text-[#8B9A6E]' : 'hover:text-[#232B1E]'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>Categories</span>
        </Link>

        <Link
          href="/search"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            pathname === '/search' ? 'text-[#8B9A6E]' : 'hover:text-[#232B1E]'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </Link>

        <Link
          href="/orders"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            pathname === '/orders' ? 'text-[#8B9A6E]' : 'hover:text-[#232B1E]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Orders</span>
        </Link>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#232B1E]/70 hover:text-[#8B9A6E] relative"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Cart</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 right-2 bg-[#8B9A6E] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-[#F7F2EB]">
              {totalItems}
            </span>
          )}
        </button>
      </nav>
    </div>
  )
}

