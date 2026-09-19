import React from 'react'
import Link from 'next/link'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShoppingBag, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <StorefrontLayout>
      <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-6">
        <div className="w-20 h-20 bg-[#7FBA44]/20 text-[#7FBA44] rounded-full flex items-center justify-center mx-auto border border-[#7FBA44]/30">
          <ShoppingBag className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#7FBA44]">
            404 — PAGE NOT FOUND
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] uppercase">
            PAGE COULD NOT BE FOUND
          </h1>
          <p className="text-xs text-[#0F172A]/70 leading-relaxed">
            The page or product you are looking for might have been moved or is no longer available.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO STOREFRONT</span>
          </Link>

          <Link
            href="/search"
            className="w-full sm:w-auto px-6 py-3 bg-[#E2E8F0] hover:bg-[#E2E8F0]/80 text-[#0F172A] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 text-[#7FBA44]" />
            <span>SEARCH PRODUCTS</span>
          </Link>
        </div>
      </div>
    </StorefrontLayout>
  )
}
