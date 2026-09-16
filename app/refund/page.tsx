'use client'

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShieldCheck, RefreshCw } from 'lucide-react'

export default function RefundPage() {
  return (
    <StorefrontLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">REFUND & CANCELLATION POLICY</h1>
          <p className="text-xs text-slate-500">100% Quality Assurance Guarantee</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-extrabold text-xs">Fresh Catch Guarantee</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                If you receive an item that does not meet our high freshness or cut quality standards, we offer an immediate replacement or full refund.
              </div>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">1. Order Cancellations</h2>
            <p>
              You may cancel an order free of charge before it enters the "PREPARING & CLEANING" stage by contacting customer support (+91 96560 55969) or via WhatsApp.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">2. Quality Claims & Refunds</h2>
            <p>
              Due to the perishable nature of fresh seafood and meat, any quality issues must be reported within 3 hours of delivery with photo proof. Verified refunds are credited within 24-48 hours.
            </p>
          </section>
        </div>
      </div>
    </StorefrontLayout>
  )
}
