'use client'

import React from 'react'
import Link from 'next/link'
import { Phone, Mail, MapPin, ShieldCheck, Heart, Clock, Truck } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#101814] text-slate-300 pt-16 pb-24 md:pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Brand Value Props Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-white">Daily Doorstep Delivery</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Express morning & evening slots</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-white">100% Fresh Catch Guarantee</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Chemical-free & wild caught</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-white">Cleaned Your Way</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Whole, Curry Cut, Fillet or Fry Cut</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-white">WhatsApp & Online Order</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant order processing</p>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-white">
                <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">BESTIET FRESH</h3>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Your Fresh Friend At The Door
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bestiet Fresh delivers chemical-free ocean fish, backwater seafood, tender chicken, and fresh goat meat directly to your kitchen.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://wa.me/919656055969"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-4">
              Shop Categories
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/category/fish" className="hover:text-emerald-400 transition-colors">
                  Fish & Seafood
                </Link>
              </li>
              <li>
                <Link href="/category/chicken" className="hover:text-emerald-400 transition-colors">
                  Fresh Tender Chicken
                </Link>
              </li>
              <li>
                <Link href="/category/mutton" className="hover:text-emerald-400 transition-colors">
                  Tender Kerala Mutton
                </Link>
              </li>
              <li>
                <Link href="/category/seafood" className="hover:text-emerald-400 transition-colors">
                  Prawns & Crabs
                </Link>
              </li>
              <li>
                <Link href="/category/ready-to-cook" className="hover:text-emerald-400 transition-colors">
                  Ready to Cook Marinated Packs
                </Link>
              </li>
              <li>
                <Link href="/category/combos" className="hover:text-emerald-400 transition-colors">
                  Fresh Family Combos
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/orders" className="hover:text-emerald-400 transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-emerald-400 transition-colors">
                  My Orders History
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-emerald-400 transition-colors">
                  Today's Offers & Discounts
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <a href="tel:+919656055969" className="hover:text-emerald-400 transition-colors">
                  Help Line: +91 96560 55969
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Company & Legal */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Bestiet Fresh
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-emerald-400 transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BESTIET FRESH. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Powered by Bestiet Fresh E-Commerce Engine</span>
            <span>•</span>
            <span>Trivandrum, Kerala</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
