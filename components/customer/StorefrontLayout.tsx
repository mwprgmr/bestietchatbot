'use client'

import React from 'react'
import { CustomerProvider } from '@/lib/context/CustomerContext'
import Header from './Header'
import LocationModal from './LocationModal'
import CartDrawer from './CartDrawer'
import MobileNav from './MobileNav'
import Footer from './Footer'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerProvider>
      <div className="min-h-screen bg-[#FFFFFF] text-[#101814] flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-800">
        <Header />
        <LocationModal />
        <CartDrawer />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
        <Footer />
        <MobileNav />
      </div>
    </CustomerProvider>
  )
}
