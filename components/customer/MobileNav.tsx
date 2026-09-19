'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { Home, Grid, Search, ShoppingBag, User, ArrowRight } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  const { cart, grandTotal, cartSubtotal, deliveryFee, isCartOpen, setIsCartOpen } = useCustomer()

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Don't show bottom nav on checkout or order success pages to avoid clutter
  if (pathname?.startsWith('/checkout') || pathname?.startsWith('/order-success')) {
    return null
  }

  const isCartPage = pathname === '/cart'

  const handleCategoriesClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      const catEl = document.getElementById('categories')
      if (catEl) {
        catEl.scrollIntoView({ behavior: 'smooth' })
      } else {
        window.scrollTo({ top: 380, behavior: 'smooth' })
      }
    }
  }

  const handleCartClick = (e: React.MouseEvent) => {
    if (isCartPage) {
      e.preventDefault()
    } else {
      e.preventDefault()
      setIsCartOpen(true)
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden flex flex-col pointer-events-auto">
      {/* Sticky Cart Bar (only show if cart has items AND drawer is NOT open AND not on cart page) */}
      {totalItems > 0 && !isCartOpen && !isCartPage && (
        <div className="p-3 px-4 bg-[#7FBA44] text-white shadow-2xl rounded-t-2xl flex items-center justify-between border-t border-[#7FBA44]/50 animate-fade-in-up">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center font-black text-xs text-white shrink-0">
              {totalItems}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white truncate">
                {totalItems} ITEM{totalItems > 1 ? 'S' : ''} ADDED
              </div>
              <div className="text-xs font-black text-white truncate">
                ₹{grandTotal}{' '}
                <span className="text-[10px] font-medium opacity-90">
                  ({deliveryFee === 0 ? 'Free Delivery' : `+ ₹${deliveryFee} Delivery`})
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/checkout"
            onClick={() => setIsCartOpen(false)}
            className="py-2 px-3.5 bg-white text-slate-900 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>CHECKOUT</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#7FBA44]" />
          </Link>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="glass-surface border-t border-slate-200/80 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-2 flex items-center justify-around text-slate-600 shadow-2xl">
        {/* HOME */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
            pathname === '/' ? 'text-[#7FBA44] bg-[#7FBA44]/10' : 'hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {/* CATEGORIES */}
        <Link
          href="/#categories"
          onClick={handleCategoriesClick}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
            pathname?.startsWith('/category') ? 'text-[#7FBA44] bg-[#7FBA44]/10' : 'hover:text-slate-900'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>Categories</span>
        </Link>

        {/* SEARCH */}
        <Link
          href="/search"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
            pathname === '/search' ? 'text-[#7FBA44] bg-[#7FBA44]/10' : 'hover:text-slate-900'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </Link>

        {/* ORDERS */}
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
            pathname === '/orders' ? 'text-[#7FBA44] bg-[#7FBA44]/10' : 'hover:text-slate-900'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Orders</span>
        </Link>

        {/* CART */}
        <Link
          href="/cart"
          onClick={handleCartClick}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative py-1 px-3 rounded-xl transition-all active:scale-95 cursor-pointer ${
            isCartPage || isCartOpen ? 'text-[#7FBA44] bg-[#7FBA44]/10' : 'hover:text-[#7FBA44]'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#7FBA44] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                {totalItems}
              </span>
            )}
          </div>
          <span>Cart</span>
        </Link>
      </nav>
    </div>
  )
}
