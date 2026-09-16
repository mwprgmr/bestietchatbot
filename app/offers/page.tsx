'use client'

import React from 'react'
import Link from 'next/link'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { Tag, Sparkles, ArrowRight, Percent, CheckCircle2 } from 'lucide-react'

export default function OffersPage() {
  return (
    <StorefrontLayout>
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Deals & Savings
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            TODAY'S BEST OFFERS & PROMO CODES
          </h1>
          <p className="text-xs text-slate-500">Save big on fresh ocean fish, chicken, and Kerala mutton</p>
        </div>

        {/* Promo Banners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 rounded-3xl border border-emerald-800 shadow-lg space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              <Sparkles className="w-3 h-3 fill-slate-950" /> Featured Offer
            </div>
            <h2 className="text-2xl font-black text-white">FLAT ₹100 OFF</h2>
            <p className="text-xs text-emerald-200">On all orders above ₹499 across all fresh categories.</p>
            <div className="pt-2 flex items-center justify-between">
              <div className="px-3 py-1.5 bg-slate-950/80 border border-emerald-700 rounded-xl text-xs font-mono font-black text-amber-400 tracking-wider">
                BESTIET100
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-emerald-950 text-white p-6 rounded-3xl border border-amber-600/60 shadow-lg space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1 bg-white text-emerald-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              <Percent className="w-3 h-3" /> Welcome Deal
            </div>
            <h2 className="text-2xl font-black text-white">20% OFF FIRST ORDER</h2>
            <p className="text-xs text-amber-100">Get 20% discount up to ₹150 on your first fresh order.</p>
            <div className="pt-2 flex items-center justify-between">
              <div className="px-3 py-1.5 bg-slate-950/80 border border-amber-500 rounded-xl text-xs font-mono font-black text-amber-400 tracking-wider">
                FRESH20
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-white text-emerald-900 font-extrabold rounded-xl text-xs hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <span>CLAIM DEAL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Offer Rules & Terms */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Terms & Conditions for Offers
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li>Promo coupons are valid for online website checkout and WhatsApp orders.</li>
            <li>Only one coupon code can be applied per order.</li>
            <li>Free delivery applies automatically on orders with subtotal above ₹500.</li>
          </ul>
        </div>
      </div>
    </StorefrontLayout>
  )
}
