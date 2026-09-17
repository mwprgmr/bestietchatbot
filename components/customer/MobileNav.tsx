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
        <div className="p-3 px-4 bg-[#39B54A] text-white shadow-2xl flex items-center justify-between border-t border-[#39B54A]/50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-none bg-[#0F172A] flex items-center justify-center font-extrabold text-xs text-white shrink-0">
              {totalItems}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFFFFF] truncate">
                {totalItems} ITEM{totalItems > 1 ? 'S' : ''} ADDED
              </div>
              <div className="text-xs font-black text-white truncate">
                ₹{grandTotal}{' '}
                <span className="text-[10px] font-normal opacity-90">
                  ({deliveryFee === 0 ? 'Free Delivery' : `+ ₹${deliveryFee} Delivery`})
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/checkout"
            onClick={() => setIsCartOpen(false)}
            className="py-2.5 px-3.5 bg-[#FFFFFF] text-[#0F172A] font-extrabold rounded-none text-xs flex items-center gap-1.5 shadow-md hover:bg-white active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>PROCEED TO CHECKOUT</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#39B54A]" />
          </Link>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="bg-[#FFFFFF] border-t border-[#E2E8F0] pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-2 flex items-center justify-around text-[#0F172A]/70 shadow-2xl">
        {/* HOME */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-none transition-all active:scale-95 cursor-pointer ${
            pathname === '/' ? 'text-[#39B54A]' : 'hover:text-[#0F172A]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {/* CATEGORIES */}
        <Link
          href="/#categories"
          onClick={handleCategoriesClick}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-none transition-all active:scale-95 cursor-pointer ${
            pathname?.startsWith('/category') ? 'text-[#39B54A]' : 'hover:text-[#0F172A]'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>Categories</span>
        </Link>

        {/* SEARCH */}
        <Link
          href="/search"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-none transition-all active:scale-95 cursor-pointer ${
            pathname === '/search' ? 'text-[#39B54A]' : 'hover:text-[#0F172A]'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </Link>

        {/* ORDERS */}
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-none transition-all active:scale-95 cursor-pointer ${
            pathname === '/orders' ? 'text-[#39B54A]' : 'hover:text-[#0F172A]'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Orders</span>
        </Link>

        {/* CART */}
        <Link
          href="/cart"
          onClick={handleCartClick}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative py-1 px-2.5 rounded-none transition-all active:scale-95 cursor-pointer ${
            isCartPage || isCartOpen ? 'text-[#39B54A]' : 'text-[#0F172A]/70 hover:text-[#39B54A]'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#39B54A] text-white text-[9px] font-black w-4 h-4 rounded-none flex items-center justify-center border border-[#FFFFFF]">
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
