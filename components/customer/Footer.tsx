'use client'

import React from 'react'
import Link from 'next/link'
import { Phone, Mail, MapPin, ShieldCheck, Heart, Clock, Truck } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#232B1E] text-[#EEEEEE] pt-16 pb-24 md:pb-12 border-t border-[#8B9A6E]/30">
      <div className="max-w-7xl mx-auto px-4">


        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Bestiet Fresh" className="h-10 w-auto object-contain bg-white p-1 rounded-xl" />
              <span className="font-black text-lg tracking-tight text-white uppercase">
                BESTIET <span className="text-[#8B9A6E]">FRESH</span>
              </span>
            </div>

            <p className="text-xs text-[#EEEEEE]/80 leading-relaxed">
              Bestiet Fresh delivers chemical-free ocean fish, backwater seafood, tender chicken, and fresh goat meat directly to your kitchen.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://wa.me/919656055969"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#8B9A6E] hover:bg-[#7A895D] text-white font-extrabold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8B9A6E] mb-4">
              Shop Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-[#EEEEEE]/80 font-medium">
              <li>
                <Link href="/category/fish" className="hover:text-[#8B9A6E] transition-colors">
                  Fish & Seafood
                </Link>
              </li>
              <li>
                <Link href="/category/chicken" className="hover:text-[#8B9A6E] transition-colors">
                  Fresh Tender Chicken
                </Link>
              </li>
              <li>
                <Link href="/category/mutton" className="hover:text-[#8B9A6E] transition-colors">
                  Tender Kerala Mutton
                </Link>
              </li>
              <li>
                <Link href="/category/seafood" className="hover:text-[#8B9A6E] transition-colors">
                  Prawns & Crabs
                </Link>
              </li>
              <li>
                <Link href="/category/ready-to-cook" className="hover:text-[#8B9A6E] transition-colors">
                  Ready to Cook Marinated Packs
                </Link>
              </li>
              <li>
                <Link href="/category/combos" className="hover:text-[#8B9A6E] transition-colors">
                  Fresh Family Combos
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8B9A6E] mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs text-[#EEEEEE]/80 font-medium">
              <li>
                <Link href="/orders" className="hover:text-[#8B9A6E] transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#8B9A6E] transition-colors">
                  My Orders History
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-[#8B9A6E] transition-colors">
                  Today's Offers & Discounts
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#8B9A6E] transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <a href="tel:+919656055969" className="hover:text-[#8B9A6E] transition-colors">
                  Help Line: +91 96560 55969
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Company & Legal */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8B9A6E] mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-[#EEEEEE]/80 font-medium">
              <li>
                <Link href="/about" className="hover:text-[#8B9A6E] transition-colors">
                  About Bestiet Fresh
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#8B9A6E] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#8B9A6E] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-[#8B9A6E] transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="pt-8 border-t border-[#8B9A6E]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EEEEEE]/60">
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
