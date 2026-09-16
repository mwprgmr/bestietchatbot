'use client'

import React from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { ArrowRight, Sparkles, ShieldCheck, Truck, Utensils, HeartHandshake } from 'lucide-react'

export default function HomepageHero() {
  return (
    <div className="space-y-10 mb-10">
      {/* Food Commerce Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-[#101814] to-emerald-950 text-white p-6 sm:p-12 shadow-xl border border-slate-800">
        {/* Decorative Food Background Image with Blur Gradient */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80"
            alt="Fresh Fish & Meat Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chemical-Free Daily Fresh Catch</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
            FRESH FROM OUR DOOR <br />
            <span className="text-emerald-400">TO YOUR TABLE.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-lg leading-relaxed">
            Fresh ocean fish, backwater seafood, tender farm chicken, and Kerala goat meat — custom cleaned, cut, and delivered fresh to your door.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/category/fish"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 group"
            >
              <span>SHOP FRESH NOW</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/offers"
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-extrabold rounded-xl text-xs sm:text-sm backdrop-blur-xs border border-white/20 transition-all"
            >
              TODAY'S DEALS
            </Link>
          </div>
        </div>
      </div>

      {/* Category Shortcuts Navigation */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Explore Categories
          </h2>
          <Link href="/category/fish" className="text-xs font-bold text-emerald-700 hover:underline">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all text-center flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 group-hover:scale-105 transition-transform shrink-0">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-extrabold text-[#101814] group-hover:text-emerald-700 transition-colors line-clamp-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Bestiet Fresh Visual Strip */}
      <section className="bg-[#F7F8F5] rounded-3xl p-6 border border-slate-200/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">FRESHLY SOURCED</h3>
            <p className="text-[11px] text-slate-500">Directly from harbors & local farms</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">QUALITY CHECKED</h3>
            <p className="text-[11px] text-slate-500">100% chemical & ammonia free</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">CLEANED YOUR WAY</h3>
            <p className="text-[11px] text-slate-500">Curry Cut, Fry Cut, Fillet or Whole</p>
          </div>

          <div className="space-y-1.5 p-2">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-700 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">DOORSTEP DELIVERY</h3>
            <p className="text-[11px] text-slate-500">Morning & evening express slots</p>
          </div>
        </div>
      </section>

      {/* How It Works 3-Step Guide */}
      <section className="space-y-4">
        <div className="text-center max-w-md mx-auto">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
            Easy Ordering
          </span>
          <h2 className="text-xl font-black text-slate-900">HOW IT WORKS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-2 relative overflow-hidden">
            <span className="text-4xl font-black text-slate-100 absolute top-2 right-4 select-none">
              01
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center mx-auto relative z-10">
              1
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 relative z-10">
              Choose Fish & Meat
            </h3>
            <p className="text-xs text-slate-500 relative z-10">
              Pick your favourite ocean catch, chicken cuts, or mutton.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-2 relative overflow-hidden">
            <span className="text-4xl font-black text-slate-100 absolute top-2 right-4 select-none">
              02
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center mx-auto relative z-10">
              2
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 relative z-10">
              Select Cut & Weight
            </h3>
            <p className="text-xs text-slate-500 relative z-10">
              Choose weight option (500g, 1kg) and preferred cleaning style.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-2 relative overflow-hidden">
            <span className="text-4xl font-black text-slate-100 absolute top-2 right-4 select-none">
              03
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center mx-auto relative z-10">
              3
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 relative z-10">
              Delivered to Door
            </h3>
            <p className="text-xs text-slate-500 relative z-10">
              Fresh items delivered cold-packed right to your kitchen.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
