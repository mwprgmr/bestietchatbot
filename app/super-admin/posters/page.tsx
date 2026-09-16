'use client'

import React, { useEffect, useState } from 'react'
import SuperAdminLayout from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react'

export interface HomepagePoster {
  id: string
  title: string
  subtitle?: string | null
  badge_text?: string | null
  image_url: string
  cta_text?: string | null
  cta_link?: string | null
  secondary_cta_text?: string | null
  secondary_cta_link?: string | null
  sort_order: number
  active: boolean
  created_at?: string
}

const DEFAULT_POSTERS: HomepagePoster[] = [
  {
    id: 'default-1',
    title: 'FRESH FROM OUR DOOR TO YOUR TABLE.',
    subtitle: 'Fresh ocean fish, backwater seafood, tender farm chicken, and Kerala goat meat — custom cleaned, cut, and delivered fresh to your door.',
    badge_text: 'CHEMICAL-FREE DAILY FRESH CATCH',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'SHOP FRESH NOW',
    cta_link: '/category/fish',
    secondary_cta_text: "TODAY'S DEALS",
    secondary_cta_link: '/offers',
    sort_order: 1,
    active: true,
  },
  {
    id: 'default-2',
    title: 'ANTIBIOTIC-FREE TENDER FARM CHICKEN',
    subtitle: 'Hygienically cut & 100% clean chicken parts. Whole, Curry Cut, Boneless Breast & Drumsticks delivered cold-packed.',
    badge_text: '100% SAFE & HYGIENIC',
    image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'ORDER CHICKEN',
    cta_link: '/category/chicken',
    secondary_cta_text: 'VIEW ALL CUTS',
    secondary_cta_link: '/category/chicken',
    sort_order: 2,
    active: true,
  },
  {
    id: 'default-3',
    title: 'PREMIUM SEER FISH & TIGER PRAWNS',
    subtitle: 'Daily morning harbor landings. Chemical-free Neymeen, Karimeen, Mathi, and Fresh Prawns cleaned to your preference.',
    badge_text: 'DAILY MORNING LANDINGS',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1600&q=80',
    cta_text: 'EXPLORE SEAFOOD',
    cta_link: '/category/fish',
    secondary_cta_text: 'FLASH OFFERS',
    secondary_cta_link: '/offers',
    sort_order: 3,
    active: true,
  },
]

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingPoster, setEditingPoster] = useState<HomepagePoster | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge_text: '',
    image_url: '',
    cta_text: 'SHOP FRESH NOW',
    cta_link: '/category/fish',
    secondary_cta_text: "TODAY'S DEALS",
    secondary_cta_link: '/offers',
    sort_order: 1,
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
      } else {
        setPosters(data)
      }
    } catch (_) {
      setPosters(DEFAULT_POSTERS)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingPoster(null)
    setFormData({
      title: '',
      subtitle: '',
      badge_text: 'CHEMICAL-FREE FRESH CATCH',
      image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
      cta_text: 'SHOP FRESH NOW',
      cta_link: '/category/fish',
      secondary_cta_text: "TODAY'S DEALS",
      secondary_cta_link: '/offers',
      sort_order: posters.length + 1,
      active: true,
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (poster: HomepagePoster) => {
    setEditingPoster(poster)
    setFormData({
      title: poster.title,
      subtitle: poster.subtitle || '',
      badge_text: poster.badge_text || '',
      image_url: poster.image_url,
      cta_text: poster.cta_text || 'SHOP FRESH NOW',
      cta_link: poster.cta_link || '/category/fish',
      secondary_cta_text: poster.secondary_cta_text || "TODAY'S DEALS",
      secondary_cta_link: poster.secondary_cta_link || '/offers',
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero poster?')) return
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
        // Update existing poster
        const { error } = await supabase
          .from('homepage_posters')
          .update({
            title: formData.title,
            subtitle: formData.subtitle,
            badge_text: formData.badge_text,
            image_url: formData.image_url,
            cta_text: formData.cta_text,
            cta_link: formData.cta_link,
            secondary_cta_text: formData.secondary_cta_text,
            secondary_cta_link: formData.secondary_cta_link,
            sort_order: Number(formData.sort_order),
            active: formData.active,
          })
          .eq('id', editingPoster.id)

        if (error) {
          // Local fallback update
          setPosters((prev) =>
            prev.map((p) =>
              p.id === editingPoster.id ? { ...p, ...formData } : p
            )
          )
        }
      } else {
        // Insert new poster
        const newObj = {
          title: formData.title,
          subtitle: formData.subtitle,
          badge_text: formData.badge_text,
          image_url: formData.image_url,
          cta_text: formData.cta_text,
          cta_link: formData.cta_link,
          secondary_cta_text: formData.secondary_cta_text,
          secondary_cta_link: formData.secondary_cta_link,
          sort_order: Number(formData.sort_order),
          active: formData.active,
        }

        const { data, error } = await supabase
          .from('homepage_posters')
          .insert(newObj)
          .select('*')

        if (!error && data && data.length > 0) {
          setPosters((prev) => [...prev, data[0]])
        } else {
          setPosters((prev) => [...prev, { id: `local-${Date.now()}`, ...newObj }])
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Homepage Hero Posters Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Add, update, or reorder promotional hero posters shown in the homepage banner slider.
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
            <span>ADD NEW POSTER</span>
          </button>
        </div>
      </div>

      {/* Posters List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-500">
          Loading Hero Posters...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster, index) => (
            <div
              key={poster.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                poster.active ? 'border-slate-200' : 'border-slate-300 opacity-60'
              }`}
            >
              {/* Poster Image Preview */}
              <div className="relative aspect-16/9 bg-slate-900 overflow-hidden group">
                <img
                  src={poster.image_url}
                  alt={poster.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] p-4 flex flex-col justify-between text-white">
                  <div>
                    {poster.badge_text && (
                      <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                        {poster.badge_text}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Order: #{poster.sort_order}
                    </span>
                  </div>
                </div>
              </div>

              {/* Poster Meta */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                    {poster.title}
                  </h3>
                  {poster.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {poster.subtitle}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {poster.cta_text}
                  </span>

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

              {/* Actions Footer */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenEditModal(poster)}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Poster</span>
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
          ))}
        </div>
      )}

      {/* Add / Edit Poster Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingPoster ? 'Edit Hero Poster' : 'Add New Hero Poster'}
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
                  Poster Title / Main Headline *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. FRESH FROM OUR DOOR TO YOUR TABLE."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Fresh ocean fish, chicken cuts, and mutton delivered to your doorstep."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Top Badge Tag Text
                  </label>
                  <input
                    type="text"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="CHEMICAL-FREE DAILY FRESH CATCH"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sort Order (Display Priority)
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Image URL (Unsplash or CDN) *
                </label>
                <input
                  type="url"
                  required
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Primary CTA Text
                  </label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="SHOP FRESH NOW"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    placeholder="/category/fish"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900"
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
                  <span>{editingPoster ? 'UPDATE POSTER' : 'CREATE POSTER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
