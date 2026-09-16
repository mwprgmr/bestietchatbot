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
} from 'lucide-react'

export interface HomepagePoster {
  id: string
  title?: string | null
  image_url: string
  media_type?: 'image' | 'video'
  cta_link?: string | null
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

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingPoster, setEditingPoster] = useState<HomepagePoster | null>(null)

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
      media_type: poster.media_type || (/\.(mp4|webm|mov|ogg)($|\?)/i.test(poster.image_url) ? 'video' : 'image'),
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
        // Update poster
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

        if (error) {
          setPosters((prev) =>
            prev.map((p) =>
              p.id === editingPoster.id ? { ...p, ...formData } : p
            )
          )
        }
      } else {
        // Create new poster
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
            <Film className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Posters & Media Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Add, update, or reorder homepage banner images and autoplay videos.
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
            <span>ADD NEW POSTER / VIDEO</span>
          </button>
        </div>
      </div>

      {/* Posters List */}
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
                {/* Poster Image / Video Preview */}
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

                  {/* Media Type Badge */}
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

                {/* Poster Meta */}
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

                {/* Actions Footer */}
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

      {/* Add / Edit Poster Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingPoster ? 'Edit Media Banner' : 'Add New Media Banner'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Media Type Selector */}
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
