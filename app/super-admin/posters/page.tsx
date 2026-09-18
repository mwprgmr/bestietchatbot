'use client'

import React, { useEffect, useState } from 'react'
import SuperAdminLayout from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  RefreshCw,
  ExternalLink,
  Film,
  Smartphone,
  MessageSquare,
  QrCode,
  Sparkles,
} from 'lucide-react'

export interface HomepagePoster {
  id: string
  title?: string | null
  subtitle?: string | null
  badge_text?: string | null
  image_url: string
  media_type?: 'image' | 'video' | 'app_promo'
  cta_link?: string | null
  whatsapp_number?: string | null
  whatsapp_message?: string | null
  qr_code_url?: string | null
  sort_order: number
  active: boolean
  created_at?: string
}

const DEFAULT_POSTERS: HomepagePoster[] = [
  {
    id: 'default-1',
    title: 'Fresh Catch Video Showcase',
    image_url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-fish-and-seafood-in-a-market-display-42861-large.mp4',
    media_type: 'video',
    cta_link: '/category/fish',
    sort_order: 1,
    active: true,
  },
  {
    id: 'default-2',
    title: 'Fresh Seafood Selection',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
    media_type: 'image',
    cta_link: '/category/fish',
    sort_order: 2,
    active: true,
  },
  {
    id: 'default-3',
    title: 'Tender Farm Chicken Banner',
    image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
    media_type: 'image',
    cta_link: '/category/chicken',
    sort_order: 3,
    active: true,
  },
]

const DEFAULT_APP_PROMO: HomepagePoster = {
  id: 'app-promo-banner',
  title: 'Get Fresh Seafood & Meat on WhatsApp!',
  subtitle: 'For daily fresh catches, 30-minute doorstep delivery & exclusive discounts curated specially for you in Trivandrum.',
  badge_text: 'Bestiet Fresh WhatsApp Bot',
  image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://wa.me/919876543210',
  media_type: 'app_promo',
  cta_link: 'https://wa.me/919876543210',
  whatsapp_number: '919876543210',
  whatsapp_message: 'Hi Bestiet Fresh, I want to view today fresh catch menu!',
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://wa.me/919876543210',
  sort_order: 99,
  active: true,
}

export default function PostersPage() {
  return (
    <SuperAdminLayout>
      <PostersManager />
    </SuperAdminLayout>
  )
}

function PostersManager() {
  const supabase = createClient()

  const [posters, setPosters] = useState<HomepagePoster[]>([])
  const [appPromo, setAppPromo] = useState<HomepagePoster>(DEFAULT_APP_PROMO)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal state for regular posters
  const [showModal, setShowModal] = useState(false)
  const [editingPoster, setEditingPoster] = useState<HomepagePoster | null>(null)

  // Modal state for App Promo poster
  const [showAppPromoModal, setShowAppPromoModal] = useState(false)

  const [formData, setFormData] = useState<{
    title: string
    image_url: string
    media_type: 'image' | 'video'
    cta_link: string
    sort_order: number
    active: boolean
  }>({
    title: '',
    image_url: '',
    media_type: 'image',
    cta_link: '/category/fish',
    sort_order: 1,
    active: true,
  })

  const [appPromoFormData, setAppPromoFormData] = useState({
    title: DEFAULT_APP_PROMO.title || '',
    subtitle: DEFAULT_APP_PROMO.subtitle || '',
    badge_text: DEFAULT_APP_PROMO.badge_text || '',
    whatsapp_number: DEFAULT_APP_PROMO.whatsapp_number || '',
    whatsapp_message: DEFAULT_APP_PROMO.whatsapp_message || '',
    qr_code_url: DEFAULT_APP_PROMO.qr_code_url || '',
    active: true,
  })

  useEffect(() => {
    loadPosters()
  }, [])

  const loadPosters = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('homepage_posters')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error || !data || data.length === 0) {
        setPosters(DEFAULT_POSTERS)
        setAppPromo(DEFAULT_APP_PROMO)
      } else {
        const promoItem = data.find((p) => p.media_type === 'app_promo' || p.id === 'app-promo-banner')
        const regularItems = data.filter((p) => p.media_type !== 'app_promo' && p.id !== 'app-promo-banner')

        setPosters(regularItems.length > 0 ? regularItems : DEFAULT_POSTERS)
        if (promoItem) {
          setAppPromo(promoItem)
          setAppPromoFormData({
            title: promoItem.title || DEFAULT_APP_PROMO.title || '',
            subtitle: promoItem.subtitle || DEFAULT_APP_PROMO.subtitle || '',
            badge_text: promoItem.badge_text || DEFAULT_APP_PROMO.badge_text || '',
            whatsapp_number: promoItem.whatsapp_number || DEFAULT_APP_PROMO.whatsapp_number || '',
            whatsapp_message: promoItem.whatsapp_message || DEFAULT_APP_PROMO.whatsapp_message || '',
            qr_code_url: promoItem.qr_code_url || promoItem.image_url || DEFAULT_APP_PROMO.qr_code_url || '',
            active: promoItem.active ?? true,
          })
        }
      }
    } catch (_) {
      setPosters(DEFAULT_POSTERS)
      setAppPromo(DEFAULT_APP_PROMO)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingPoster(null)
    setFormData({
      title: 'New Banner Poster',
      image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
      media_type: 'image',
      cta_link: '/category/fish',
      sort_order: posters.length + 1,
      active: true,
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (poster: HomepagePoster) => {
    setEditingPoster(poster)
    setFormData({
      title: poster.title || 'Banner Poster',
      image_url: poster.image_url,
      media_type: poster.media_type === 'video' ? 'video' : 'image',
      cta_link: poster.cta_link || '/category/fish',
      sort_order: poster.sort_order || 1,
      active: poster.active ?? true,
    })
    setShowModal(true)
  }

  const handleToggleActive = async (poster: HomepagePoster) => {
    const updatedStatus = !poster.active
    setPosters((prev) =>
      prev.map((p) => (p.id === poster.id ? { ...p, active: updatedStatus } : p))
    )

    try {
      await supabase
        .from('homepage_posters')
        .update({ active: updatedStatus })
        .eq('id', poster.id)
    } catch (_) {}
  }

  const handleToggleAppPromoActive = async () => {
    const updatedStatus = !appPromo.active
    setAppPromo((prev) => ({ ...prev, active: updatedStatus }))

    try {
      await supabase
        .from('homepage_posters')
        .update({ active: updatedStatus })
        .eq('id', appPromo.id)
    } catch (_) {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this poster?')) return
    setPosters((prev) => prev.filter((p) => p.id !== id))

    try {
      await supabase.from('homepage_posters').delete().eq('id', id)
    } catch (_) {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingPoster) {
        const { error } = await supabase
          .from('homepage_posters')
          .update({
            title: formData.title,
            image_url: formData.image_url,
            media_type: formData.media_type,
            cta_link: formData.cta_link,
            sort_order: Number(formData.sort_order),
            active: formData.active,
          })
          .eq('id', editingPoster.id)

        if (!error) {
          setPosters((prev) =>
            prev.map((p) => (p.id === editingPoster.id ? { ...p, ...formData } : p))
          )
        }
      } else {
        const newObj = {
          title: formData.title,
          image_url: formData.image_url,
          media_type: formData.media_type,
          cta_link: formData.cta_link,
          sort_order: Number(formData.sort_order),
          active: formData.active,
        }

        const { data, error } = await supabase
          .from('homepage_posters')
          .insert(newObj)
          .select('*')

        if (!error && data && data.length > 0) {
          setPosters((prev) => [...prev, data[0]])
        }
      }

      setShowModal(false)
      loadPosters()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAppPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const updatedItem: HomepagePoster = {
      id: 'app-promo-banner',
      title: appPromoFormData.title,
      subtitle: appPromoFormData.subtitle,
      badge_text: appPromoFormData.badge_text,
      image_url: appPromoFormData.qr_code_url,
      media_type: 'app_promo',
      cta_link: `https://wa.me/${appPromoFormData.whatsapp_number}`,
      whatsapp_number: appPromoFormData.whatsapp_number,
      whatsapp_message: appPromoFormData.whatsapp_message,
      qr_code_url: appPromoFormData.qr_code_url,
      sort_order: 99,
      active: appPromoFormData.active,
    }

    try {
      const { error } = await supabase
        .from('homepage_posters')
        .upsert(updatedItem, { onConflict: 'id' })

      if (!error) {
        setAppPromo(updatedItem)
      } else {
        setAppPromo(updatedItem)
      }
      setShowAppPromoModal(false)
    } catch (err) {
      console.error('Save App Promo error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Posters & App Banner Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage top carousel media banners and the Swiggy-style App/WhatsApp promotional poster section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPosters}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Refresh Posters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD NEW CAROUSEL BANNER</span>
          </button>
        </div>
      </div>

      {/* 1. APP & WHATSAPP PROMO POSTER MANAGER SECTION */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>App & WhatsApp Promo Poster Section</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Swiggy Style
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Displays on storefront homepage after Today's Fresh Picks section.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAppPromoActive}
              className={`px-3 py-1.5 rounded-full font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                appPromo.active
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {appPromo.active ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4" />}
              <span>{appPromo.active ? 'SECTION ACTIVE' : 'SECTION HIDDEN'}</span>
            </button>

            <button
              onClick={() => setShowAppPromoModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>EDIT PROMO POSTER</span>
            </button>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              <span>🐟</span>
              <span>{appPromo.badge_text}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {appPromo.title}
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {appPromo.subtitle}
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-emerald-400 font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Number: +{appPromo.whatsapp_number}</span>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white text-slate-900 rounded-2xl space-y-2">
            <img
              src={appPromo.qr_code_url || appPromo.image_url}
              alt="QR Code Preview"
              className="w-28 h-28 object-contain"
            />
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Live QR Code Preview
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP CAROUSEL BANNER POSTERS */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Film className="w-5 h-5 text-emerald-600" />
          <span>Top Homepage Carousel Media Banners</span>
        </h2>

        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-500">
            Loading Media Banners...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((poster) => {
              const isVideo = poster.media_type === 'video' ||
                (poster.image_url && /\.(mp4|webm|mov|ogg)($|\?)/i.test(poster.image_url))

              return (
                <div
                  key={poster.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                    poster.active ? 'border-slate-200' : 'border-slate-300 opacity-60'
                  }`}
                >
                  <div className="relative aspect-16/7 bg-slate-900 overflow-hidden group">
                    {isVideo ? (
                      <video
                        src={poster.image_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <img
                        src={poster.image_url}
                        alt={poster.title || 'Poster'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                      {isVideo ? (
                        <>
                          <VideoIcon className="w-3 h-3 text-emerald-400" /> VIDEO
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3 h-3 text-blue-400" /> IMAGE
                        </>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Order: #{poster.sort_order}
                    </div>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {poster.title || 'Banner Poster'}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold mt-1">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{poster.cta_link || '/category/fish'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-400">STATUS</span>
                      <button
                        onClick={() => handleToggleActive(poster)}
                        className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                          poster.active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {poster.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ACTIVE
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-500" /> INACTIVE
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenEditModal(poster)}
                      className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(poster.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit App & WhatsApp Promo Poster Modal */}
      {showAppPromoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <span>Edit Swiggy-Style App Promo Banner</span>
              </h2>
              <button
                onClick={() => setShowAppPromoModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppPromo} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Top Badge Label Text *
                </label>
                <input
                  type="text"
                  required
                  value={appPromoFormData.badge_text}
                  onChange={(e) => setAppPromoFormData({ ...appPromoFormData, badge_text: e.target.value })}
                  placeholder="e.g. Bestiet Fresh WhatsApp Bot"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Headline Title *
                </label>
                <input
                  type="text"
                  required
                  value={appPromoFormData.title}
                  onChange={(e) => setAppPromoFormData({ ...appPromoFormData, title: e.target.value })}
                  placeholder="e.g. Get Fresh Seafood & Meat on WhatsApp!"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subtitle Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={appPromoFormData.subtitle}
                  onChange={(e) => setAppPromoFormData({ ...appPromoFormData, subtitle: e.target.value })}
                  placeholder="For daily fresh catches, 30-minute doorstep delivery..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={appPromoFormData.whatsapp_number}
                    onChange={(e) => setAppPromoFormData({ ...appPromoFormData, whatsapp_number: e.target.value })}
                    placeholder="919876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    QR Code Image URL
                  </label>
                  <input
                    type="url"
                    value={appPromoFormData.qr_code_url}
                    onChange={(e) => setAppPromoFormData({ ...appPromoFormData, qr_code_url: e.target.value })}
                    placeholder="https://api.qrserver.com/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default WhatsApp Message Text
                </label>
                <input
                  type="text"
                  value={appPromoFormData.whatsapp_message}
                  onChange={(e) => setAppPromoFormData({ ...appPromoFormData, whatsapp_message: e.target.value })}
                  placeholder="Hi Bestiet Fresh, I want to view today fresh catch menu!"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="promoActiveCheck"
                  checked={appPromoFormData.active}
                  onChange={(e) => setAppPromoFormData({ ...appPromoFormData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="promoActiveCheck" className="font-bold text-slate-800 cursor-pointer">
                  Active (Visible on Storefront Homepage after Fresh Picks)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAppPromoModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>SAVE PROMO BANNER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Regular Carousel Poster Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingPoster ? 'Edit Carousel Banner' : 'Add New Carousel Banner'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Banner Media Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, media_type: 'image' })}
                    className={`py-2 px-3 rounded-xl font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.media_type === 'image'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Image Banner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, media_type: 'video' })}
                    className={`py-2 px-3 rounded-xl font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formData.media_type === 'video'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Video (MP4 / WebM)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Poster Label / Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Fresh Catch Video Showcase"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {formData.media_type === 'video' ? 'Video File URL (MP4 / WebM) *' : 'Image URL (JPG / PNG / WebP) *'}
                </label>
                <input
                  type="url"
                  required
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder={formData.media_type === 'video' ? 'https://assets.mixkit.co/videos/...' : 'https://images.unsplash.com/...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Click Link / Route
                  </label>
                  <input
                    type="text"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    placeholder="/category/fish"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activeCheck" className="font-bold text-slate-800 cursor-pointer">
                  Active (Visible on Storefront Homepage)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingPoster ? 'UPDATE BANNER' : 'CREATE BANNER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
