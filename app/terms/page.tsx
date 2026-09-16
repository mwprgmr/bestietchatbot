'use client'

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'

export default function TermsPage() {
  return (
    <StorefrontLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">TERMS OF SERVICE</h1>
          <p className="text-xs text-slate-500">Bestiet Fresh Customer Service Agreement</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">1. Fresh Product Availability & Pricing</h2>
            <p>
              Fish and meat prices are set daily based on fresh harbor market rates and local branch stock. Prices and available weight cuts are subject to daily updates.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">2. Delivery Slots & Location Service</h2>
            <p>
              Deliveries are fulfilled by our active branch networks in Manvila Kazhakkoottam and Peroorkada. Orders are dispatched during your chosen delivery slot window.
            </p>
          </section>
        </div>
      </div>
    </StorefrontLayout>
  )
}
