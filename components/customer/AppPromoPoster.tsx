'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Fish, ShoppingBag, Sprout, Apple } from 'lucide-react'

export interface AppPosterSettings {
  title: string
  subtitle: string
  play_store_url: string
  app_store_url: string
  qr_code_url: string
  active: boolean
}

const DEFAULT_SETTINGS: AppPosterSettings = {
  title: 'For better experience, download the bestietfresh app now',
  subtitle: 'Get daily fresh catches, 30-minute doorstep delivery & exclusive discounts.',
  play_store_url: 'https://play.google.com/store',
  app_store_url: 'https://apps.apple.com',
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://bestietchatbot.vercel.app',
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
            title: data.title || DEFAULT_SETTINGS.title,
            subtitle: data.subtitle || DEFAULT_SETTINGS.subtitle,
            play_store_url: data.cta_link || DEFAULT_SETTINGS.play_store_url,
            app_store_url: data.whatsapp_number ? `https://${data.whatsapp_number}` : DEFAULT_SETTINGS.app_store_url,
            qr_code_url: data.qr_code_url || data.image_url || DEFAULT_SETTINGS.qr_code_url,
            active: data.active ?? true,
          })
        }
      } catch (_) {}
    }
    loadSettings()
  }, [])

  if (!settings.active) return null

  return (
    <section className="my-6 sm:my-10">
      {/* 1. MOBILE RESPONSIVE RECTANGLE BANNER VIEW (Matches Photo 2 on Mobile Screens) */}
      <div className="block md:hidden bg-[#F2F4F8] border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center my-2">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-snug mb-5 px-2">
          {settings.title}
        </h3>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Google Play Store Badge */}
          <a
            href={settings.play_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M3.6 1.8A1.8 1.8 0 0 0 3 3.1v17.8a1.8 1.8 0 0 0 .6 1.3l.1.1 10-10v-.3l-10-10z" fill="#00D2FF"/>
              <path d="M17.4 15.9l-3.7-3.7v-.3l3.7-3.7.1.1 4.4 2.5c1.3.7 1.3 1.9 0 2.6l-4.5 2.5z" fill="#FFD700"/>
              <path d="M13.7 12.2L3.6 22.3c.4.4 1.1.5 1.8.1l12-6.8-3.7-3.4z" fill="#FF3A44"/>
              <path d="M13.7 11.8l3.7-3.4L5.4 1.6C4.7 1.2 4 1.3 3.6 1.7l10.1 10.1z" fill="#00E676"/>
            </svg>
            <div className="text-left">
              <p className="text-[8px] uppercase font-bold tracking-wider text-slate-300 leading-none">
                GET IT ON
              </p>
              <p className="text-xs font-black text-white leading-tight font-sans">
                Google Play
              </p>
            </div>
          </a>

          {/* Apple App Store Badge */}
          <a
            href={settings.app_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0 fill-current text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.34c.67-.82 1.13-1.96.99-3.1-.97.04-2.17.65-2.87 1.47-.63.73-1.18 1.9-.1 3.02 1.08.08 2.21-.57 2.98-1.39z"/>
            </svg>
            <div className="text-left">
              <p className="text-[8px] font-medium tracking-wider text-slate-300 leading-none">
                Available on the
              </p>
              <p className="text-xs font-black text-white leading-tight font-sans">
                App Store
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* 2. DESKTOP FULL BANNER VIEW */}
      <div className="hidden md:block relative rounded-[32px] overflow-hidden bg-[#F2F4F8] border border-slate-200/80 p-8 lg:p-12 shadow-sm">
        <div className="grid grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Official Brand Logo Image, Title & App Store Badges */}
          <div className="col-span-7 space-y-6 text-left">
            
            {/* Official Logo Image */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Bestiet Fresh Logo"
                className="h-14 sm:h-16 lg:h-20 w-auto object-contain"
              />
            </div>

            {/* Headline Title */}
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#1E293B] tracking-tight leading-snug max-w-xl">
              {settings.title}
            </h2>

            {/* Subtitle / Description */}
            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
              {settings.subtitle}
            </p>

            {/* App Store Badges (Google Play & Apple App Store) */}
            <div className="flex items-center gap-4 pt-2">
              <a
                href={settings.play_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black hover:bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              >
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.6 1.8A1.8 1.8 0 0 0 3 3.1v17.8a1.8 1.8 0 0 0 .6 1.3l.1.1 10-10v-.3l-10-10z" fill="#00D2FF"/>
                  <path d="M17.4 15.9l-3.7-3.7v-.3l3.7-3.7.1.1 4.4 2.5c1.3.7 1.3 1.9 0 2.6l-4.5 2.5z" fill="#FFD700"/>
                  <path d="M13.7 12.2L3.6 22.3c.4.4 1.1.5 1.8.1l12-6.8-3.7-3.4z" fill="#FF3A44"/>
                  <path d="M13.7 11.8l3.7-3.4L5.4 1.6C4.7 1.2 4 1.3 3.6 1.7l10.1 10.1z" fill="#00E676"/>
                </svg>
                <div className="text-left">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-slate-300 leading-none">
                    GET IT ON
                  </p>
                  <p className="text-sm font-extrabold text-white leading-tight font-sans">
                    Google Play
                  </p>
                </div>
              </a>

              <a
                href={settings.app_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black hover:bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              >
                <svg className="w-6 h-6 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.34c.67-.82 1.13-1.96.99-3.1-.97.04-2.17.65-2.87 1.47-.63.73-1.18 1.9-.1 3.02 1.08.08 2.21-.57 2.98-1.39z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[9px] font-medium tracking-wider text-slate-300 leading-none">
                    Available on the
                  </p>
                  <p className="text-sm font-extrabold text-white leading-tight font-sans">
                    App Store
                  </p>
                </div>
              </a>
            </div>

          </div>

          {/* Right Side: Smartphone Mockup & Floating Green Icons */}
          <div className="col-span-5 flex justify-end relative py-4">
            <div className="relative w-64 bg-white rounded-[36px] p-4 border-4 border-slate-200/80 shadow-xl text-center space-y-3 z-10">
              <div className="w-16 h-3.5 bg-slate-100 rounded-full mx-auto" />

              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs inline-block">
                  <img
                    src={settings.qr_code_url}
                    alt="Scan QR Code to download BestietFresh app"
                    className="w-36 h-36 mx-auto object-contain"
                  />
                </div>

                <p className="text-xs font-semibold text-slate-600 tracking-tight pt-1">
                  Scan to download
                </p>
              </div>
            </div>

            {/* Floating Green Icons */}
            <div className="absolute top-2 left-8 bg-white border border-[#7FBA44]/20 p-2.5 rounded-2xl shadow-sm text-[#7FBA44] animate-float z-20">
              <Apple className="w-6 h-6 stroke-[1.75]" />
            </div>

            <div className="absolute top-4 right-4 bg-white border border-[#7FBA44]/20 p-2.5 rounded-2xl shadow-sm text-[#7FBA44] animate-float z-20">
              <ShoppingBag className="w-6 h-6 stroke-[1.75]" />
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 -right-6 bg-white border border-[#7FBA44]/20 p-2.5 rounded-2xl shadow-sm text-[#7FBA44] animate-pulse-slow z-20">
              <Fish className="w-6 h-6 stroke-[1.75]" />
            </div>

            <div className="absolute bottom-6 left-6 bg-white border border-[#7FBA44]/20 p-2.5 rounded-2xl shadow-sm text-[#7FBA44] animate-float z-20">
              <Sprout className="w-6 h-6 stroke-[1.75]" />
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
