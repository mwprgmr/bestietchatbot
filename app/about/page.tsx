'use client'

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { ShieldCheck, Truck, Utensils, Award, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <StorefrontLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Our Story
          </span>
          <h1 className="text-3xl font-black text-slate-900">ABOUT BESTIET FRESH</h1>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            "Your Fresh Friend At The Door" — Bringing daily chemical-free ocean catch and tender meats straight from Kerala harbors & local farms to your home.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-900">The Bestiet Fresh Promise</h2>
            <p>
              Founded in Trivandrum, Bestiet Fresh was created to fix the traditional fish buying experience. Instead of dealing with unhygienic markets or chemically preserved seafood, Bestiet Fresh sources wild-caught ocean fish and pasture-raised meats daily.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">Why Customers Trust Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Chemical-Free Guarantee
                </div>
                <p className="text-[11px] text-slate-500">Zero formalin, ammonia, or artificial preservatives.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-600" /> Custom Cuts & Cleaning
                </div>
                <p className="text-[11px] text-slate-500">Whole, Curry Cut, Fry Cut, Fillet, or Boneless.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" /> Cold-Chain Delivery
                </div>
                <p className="text-[11px] text-slate-500">Chilled insulated ice-box delivery right to your door.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-600" /> Local Service Branches
                </div>
                <p className="text-[11px] text-slate-500">Active branches in Manvila Kazhakkoottam & Peroorkada.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </StorefrontLayout>
  )
}
