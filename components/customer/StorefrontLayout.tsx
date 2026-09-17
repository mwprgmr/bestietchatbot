'use client'

import React from 'react'
import Header from './Header'
import LocationModal from './LocationModal'
import CartDrawer from './CartDrawer'
import MobileNav from './MobileNav'
import Footer from './Footer'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col font-sans overflow-x-hidden w-full max-w-full storefront-boxy">
      <Header />
      <LocationModal />
      <CartDrawer />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  )
}
