'use client'

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'

export default function PrivacyPage() {
  return (
    <StorefrontLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">PRIVACY POLICY</h1>
          <p className="text-xs text-slate-500">Last updated: September 2026 • Bestiet Fresh Trivandrum</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">1. Information We Collect</h2>
            <p>
              When you browse our storefront or place an order via website or WhatsApp, we collect details necessary to fulfill your delivery: your name, contact phone number, delivery address, geolocation (if permitted), and item preferences.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">2. How We Use Your Information</h2>
            <p>
              Your data is strictly used for order processing, assigning delivery slots, customer support notifications, and improving inventory stock management across our Trivandrum service branches.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-slate-900">3. Data Security & Payment Safety</h2>
            <p>
              We do not store credit card or payment credential information. All online payments are handled via encrypted payment gateway interfaces.
            </p>
          </section>
        </div>
      </div>
    </StorefrontLayout>
  )
}
