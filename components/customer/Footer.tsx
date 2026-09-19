'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Phone, Mail, MapPin, ShieldCheck, Heart, Clock, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_FOOTER_CATS = [
  { name: 'Fish & Seafood', slug: 'fish' },
  { name: 'Fresh Tender Chicken', slug: 'chicken' },
  { name: 'Tender Kerala Mutton', slug: 'mutton' },
  { name: 'Prawns & Crabs', slug: 'seafood' },
  { name: 'Ready to Cook Marinated Packs', slug: 'ready-to-cook' },
  { name: 'Fresh Family Combos', slug: 'combos' },
]

function FooterComponent() {
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>(DEFAULT_FOOTER_CATS)

  useEffect(() => {
    async function loadFooterCategories() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('homepage_categories')
          .select('name, slug')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0) {
          setCategories(data)
        }
      } catch (_) {}
    }
    loadFooterCategories()
  }, [])

  return (
    <footer className="bg-slate-950 text-slate-100 pt-12 pb-24 md:pb-12 border-t border-slate-800 gpu-layer">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Trust Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12 border-b border-slate-800">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <ShieldCheck className="w-6 h-6 text-[#39B54A] shrink-0" />
            <div>
              <div className="text-xs font-black text-white">100% Chemical-Free</div>
              <div className="text-[10px] text-slate-400 font-medium">Naturally preserved in ice</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Clock className="w-6 h-6 text-[#39B54A] shrink-0" />
            <div>
              <div className="text-xs font-black text-white">15-30 Min Express</div>
              <div className="text-[10px] text-slate-400 font-medium">Fast doorstep delivery</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Truck className="w-6 h-6 text-[#39B54A] shrink-0" />
            <div>
              <div className="text-xs font-black text-white">Cold-Chain Packed</div>
              <div className="text-[10px] text-slate-400 font-medium">Temperature controlled</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Heart className="w-6 h-6 text-[#39B54A] shrink-0" />
            <div>
              <div className="text-xs font-black text-white">Custom Meat Cut</div>
              <div className="text-[10px] text-slate-400 font-medium">Hygienic precision cuts</div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo-white.png" alt="Bestiet Fresh" className="h-14 sm:h-16 lg:h-18 w-auto object-contain" />
            </div>

            <p className="text-xs text-[#F8FAF8]/80 leading-relaxed">
              Bestiet Fresh delivers chemical-free ocean fish, backwater seafood, tender chicken, and fresh goat meat directly to your kitchen.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://wa.me/919656055969"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#39B54A] hover:bg-[#2EA03E] text-white font-extrabold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#39B54A] mb-4">
              Shop Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F8FAF8]/80 font-medium">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/category/${cat.slug}`} className="hover:text-[#39B54A] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#39B54A] mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F8FAF8]/80 font-medium">
              <li>
                <Link href="/orders" className="hover:text-[#39B54A] transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#39B54A] transition-colors">
                  My Orders History
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-[#39B54A] transition-colors">
                  Today's Offers & Discounts
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#39B54A] transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <a href="tel:+919656055969" className="hover:text-[#39B54A] transition-colors">
                  Help Line: +91 96560 55969
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Company & Legal */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#39B54A] mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F8FAF8]/80 font-medium">
              <li>
                <Link href="/about" className="hover:text-[#39B54A] transition-colors">
                  About Bestiet Fresh
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#39B54A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#39B54A] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-[#39B54A] transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="pt-8 border-t border-[#39B54A]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F8FAF8]/60">
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

const Footer = React.memo(FooterComponent)
export default Footer
