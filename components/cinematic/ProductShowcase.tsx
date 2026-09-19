'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check, ShoppingBag, ShieldCheck } from 'lucide-react'
import { useCustomer } from '@/lib/context/CustomerContext'

interface ShowcaseCategory {
  id: string
  name: string
  tagline: string
  description: string
  color: string
  accentGlow: string
  slug: string
  image: string
  highlights: string[]
}

const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: 'cat-fish',
    name: 'FRESH FISH',
    tagline: 'Ocean & Backwater Daily Catch',
    description: 'Fresh Neymeen (Kingfish), Ayala (Mackerel), Mathi (Sardine), Karimeen (Pearl Spot), and Pink Perch sourced directly from Kerala harbor landings.',
    color: '#7FBA44',
    accentGlow: 'rgba(127, 186, 68, 0.25)',
    slug: 'fish',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1200&q=80',
    highlights: ['100% Ammonia & Chemical Free', 'Custom Slice, Curry Cut or Whole Cleaned', 'Packed with Pure Ice Gel Cold-Chain'],
  },
  {
    id: 'cat-prawns',
    name: 'PRAWNS',
    tagline: 'Tender Jumbo & Tiger Prawns',
    description: 'Juicy, sweet ocean and estuary prawns deveined, peeled, or whole with head-on for rich seafood curries and fries.',
    color: '#2DD4BF',
    accentGlow: 'rgba(45, 212, 191, 0.25)',
    slug: 'seafood',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Deveined & Tail-On Ready', 'No Added Preservatives', 'Immediate Ice Box Dispatch'],
  },
  {
    id: 'cat-seafood',
    name: 'SEAFOOD',
    tagline: 'Crabs, Squid & Exotic Shellfish',
    description: 'Fresh blue sea crabs, mud crabs, squid rings, and lobster landed daily by local artisanal fishermen.',
    color: '#06707B',
    accentGlow: 'rgba(6, 112, 123, 0.25)',
    slug: 'seafood',
    image: 'https://images.unsplash.com/photo-1545696563-af8f6ec2295a?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Cleaned Crab Claws & Shells', 'Squid Rings Cut Prepped', 'Rich Natural Flavor & Texture'],
  },
  {
    id: 'cat-meat',
    name: 'FRESH MEAT',
    tagline: 'Tender Chicken & Goat Mutton',
    description: 'Farm-freshAntibiotic-free tender chicken and fresh young goat mutton precision cut right before delivery.',
    color: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    slug: 'chicken',
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Antibiotic & Hormone Free', 'Handcrafted Biryani & Curry Cuts', 'Hygienic Temperature Controlled Prepping'],
  },
]

export default function ProductShowcase() {
  const { selectedBranch } = useCustomer()
  const [activeTab, setActiveTab] = useState<ShowcaseCategory>(SHOWCASE_CATEGORIES[0])
  const [hoveredTab, setHoveredTab] = useState<ShowcaseCategory | null>(null)

  const currentTab = hoveredTab || activeTab

  return (
    <section id="showcase" className="relative bg-[#070A12] text-white py-20 px-4 overflow-hidden border-t border-slate-800/60">
      {/* Dynamic Background Glow Effect based on Active / Hovered Category */}
      <div
        className="absolute inset-0 transition-colors duration-700 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(circle at 70% 50%, ${currentTab.accentGlow} 0%, transparent 60%)`,
        }}
      />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-[#7FBA44]/30 text-[11px] font-black uppercase tracking-widest text-[#7FBA44] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>FRESH CATALOG PREVIEW</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              EXPLORE OUR FRESH SELECTION
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Fulfilling fresh catch orders from{' '}
              <strong className="text-white font-bold">{selectedBranch?.name || 'Kazhakkoottam Main Branch'}</strong>
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#7FBA44] hover:text-[#2DD4BF] transition-colors"
          >
            <span>VIEW ALL INVENTORY</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Interactive Category Tabs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SHOWCASE_CATEGORIES.map((cat) => {
            const isSelected = activeTab.id === cat.id
            const isHovered = hoveredTab?.id === cat.id

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat)}
                onMouseEnter={() => setHoveredTab(cat)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`p-5 rounded-3xl text-left transition-all relative overflow-hidden border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-[#7FBA44] shadow-xl shadow-[#7FBA44]/15 scale-[1.02]'
                    : isHovered
                    ? 'bg-slate-900/80 border-slate-700 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                {/* Active Tab Highlight Indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryGlow"
                    className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#7FBA44] to-[#2DD4BF]"
                  />
                )}

                <span className="text-[10px] font-black uppercase tracking-widest block opacity-70 mb-1" style={{ color: cat.color }}>
                  CATEGORY
                </span>
                <h3 className={`text-base sm:text-lg font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {cat.name}
                </h3>
                <p className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
                  {cat.tagline}
                </p>
              </button>
            )
          })}
        </div>

        {/* Dynamic Category Showcase Spotlight Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-950/90 rounded-3xl border border-slate-800/80 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden"
          >
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#7FBA44] block mb-1">
                  {activeTab.tagline}
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                  {activeTab.name}
                </h3>
                <p className="text-sm text-slate-300 font-medium leading-relaxed mt-3">
                  {activeTab.description}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-2.5 pt-2">
                {activeTab.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-[#7FBA44]/20 text-[#7FBA44] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* CTA Action */}
              <div className="pt-4 flex items-center gap-4">
                <Link
                  href={`/category/${activeTab.slug}`}
                  className="px-7 py-3.5 bg-[#7FBA44] hover:bg-[#71A83A] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] inline-flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 fill-slate-950" />
                  <span>SHOP {activeTab.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Image Frame */}
            <div className="lg:col-span-6 relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl group">
                <img
                  src={activeTab.image}
                  alt={activeTab.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Soft Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Corner Quality Badge */}
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#7FBA44]" />
                    <span className="font-bold">Guaranteed Fresh Daily Catch</span>
                  </div>
                  <span className="text-[10px] font-black text-[#2DD4BF] uppercase">EXPRESS READY</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
