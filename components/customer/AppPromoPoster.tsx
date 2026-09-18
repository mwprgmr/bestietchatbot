'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, PhoneCall, QrCode, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'

export interface AppPosterSettings {
  badge_text: string
  title: string
  subtitle: string
  whatsapp_number: string
  whatsapp_message: string
  qr_code_url: string
  active: boolean
}

const DEFAULT_SETTINGS: AppPosterSettings = {
  badge_text: 'Bestiet Fresh WhatsApp Bot',
  title: 'Get Fresh Seafood & Meat on WhatsApp!',
  subtitle: 'For daily fresh catches, 30-minute doorstep delivery & exclusive discounts curated specially for you in Trivandrum.',
  whatsapp_number: '919876543210',
  whatsapp_message: 'Hi Bestiet Fresh, I want to view today fresh catch menu!',
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://wa.me/919876543210',
  active: true,
}

export default function AppPromoPoster() {
  const [settings, setSettings] = useState<AppPosterSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('homepage_posters')
          .select('*')
          .eq('media_type', 'app_promo')
          .single()

        if (data && data.title) {
          setSettings({
            badge_text: data.badge_text || DEFAULT_SETTINGS.badge_text,
            title: data.title || DEFAULT_SETTINGS.title,
            subtitle: data.subtitle || DEFAULT_SETTINGS.subtitle,
            whatsapp_number: data.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
            whatsapp_message: data.whatsapp_message || DEFAULT_SETTINGS.whatsapp_message,
            qr_code_url: data.qr_code_url || data.image_url || DEFAULT_SETTINGS.qr_code_url,
            active: data.active ?? true,
          })
        }
      } catch (_) {}
    }
    loadSettings()
  }, [])

  if (!settings.active) return null

  const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(settings.whatsapp_message)}`

  return (
    <section className="my-8 sm:my-12">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl border border-slate-800/80 p-6 sm:p-10">
        {/* Background Subtle Glows */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Offer Details & Copy */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-xs backdrop-blur-md">
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[10px]">
                🐟
              </span>
              <span>{settings.badge_text}</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              {settings.title}
            </h2>

            {/* Subtitle */}
            <p className="text-slate-300 text-xs sm:text-base font-medium leading-relaxed max-w-xl">
              {settings.subtitle}
            </p>

            {/* Feature Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Express 30-Min Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Chemical Free</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant 1-Click Order</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all active:scale-95 group cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>ORDER ON WHATSAPP NOW</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="tel:+919876543210"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all cursor-pointer backdrop-blur-md"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>CALL STORE</span>
              </a>
            </div>
          </div>

          {/* Right Column: Phone Mockup & Floating QR Banner */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            {/* Device Container */}
            <div className="relative w-64 sm:w-72 bg-slate-950 border-4 border-slate-700/80 rounded-[40px] p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl group hover:border-emerald-500/50 transition-all">
              {/* Device Dynamic Island */}
              <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700" />
              </div>

              {/* QR Screen */}
              <div className="bg-white rounded-3xl p-5 text-center space-y-3 shadow-inner">
                <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-2xs">
                  <img
                    src={settings.qr_code_url}
                    alt="Scan QR Code to Order on WhatsApp"
                    className="w-36 h-36 sm:w-40 sm:h-40 mx-auto object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-emerald-600 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan to download / chat</span>
                  </p>
                  <p className="text-slate-500 text-[10px] font-semibold">
                    Camera scan opens WhatsApp instant chatbot
                  </p>
                </div>
              </div>

              {/* Floating Food Badge Left */}
              <div className="absolute -left-6 top-1/3 bg-slate-900/90 border border-slate-700 text-white p-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 animate-float">
                <span className="text-lg">🐟</span>
                <div>
                  <p className="text-[10px] font-black text-emerald-400">Fresh Catch</p>
                  <p className="text-[9px] text-slate-300 font-medium">Daily Direct</p>
                </div>
              </div>

              {/* Floating Badge Right */}
              <div className="absolute -right-6 bottom-12 bg-emerald-500 text-slate-950 p-2.5 rounded-2xl shadow-xl font-black text-[11px] flex items-center gap-1.5 animate-pulse-slow">
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Instant 1-Click</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
