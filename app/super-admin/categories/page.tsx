'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES as DEFAULT_CATEGORIES, CategoryInfo } from '@/lib/data/ecommerce-data'
import {
  Grid,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Save,
  X,
  RefreshCw,
} from 'lucide-react'

export interface ManagedCategory extends CategoryInfo {
  sort_order: number
  active: boolean
}

export default function SuperAdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<ManagedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Edit / Add Modal state
  const [editingCategory, setEditingCategory] = useState<ManagedCategory | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState<{
    id: string
    name: string
    slug: string
    description: string
    image: string
    itemCount: number
    sort_order: number
    active: boolean
  }>({
    id: '',
    name: '',
    slug: '',
    description: '',
    image: '',
    itemCount: 0,
    sort_order: 1,
    active: true,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('homepage_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!error && data && data.length > 0) {
        const mapped: ManagedCategory[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          image: c.image,
          itemCount: c.item_count || 0,
          sort_order: c.sort_order || 0,
          active: c.active !== false,
        }))
        setCategories(mapped)
      } else {
        // Fallback to default categories
        const initial: ManagedCategory[] = DEFAULT_CATEGORIES.map((c, idx) => ({
          ...c,
          sort_order: idx + 1,
          active: true,
        }))
        setCategories(initial)
      }
    } catch (err) {
      console.error('Error loading categories:', err)
      setCategories(DEFAULT_CATEGORIES.map((c, idx) => ({ ...c, sort_order: idx + 1, active: true })))
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDefaults = async () => {
    if (!confirm('This will seed/restore standard default categories into Supabase. Proceed?')) return
    setSaving(true)
    try {
      const payload = DEFAULT_CATEGORIES.map((c, idx) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        item_count: c.itemCount,
        sort_order: idx + 1,
        active: true,
        updated_at: new Date().toISOString(),
      }))

      await supabase.from('homepage_categories').upsert(payload, { onConflict: 'id' })
      setFeedback({ type: 'success', message: 'Default categories seeded successfully!' })
      await loadCategories()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to seed categories' })
    } finally {
      setSaving(false)
    }
  }

  const openAddModal = () => {
    const nextOrder = categories.length + 1
    setFormData({
      id: `cat-${Date.now()}`,
      name: '',
      slug: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
      itemCount: 0,
      sort_order: nextOrder,
      active: true,
    })
    setEditingCategory(null)
    setIsAddModalOpen(true)
  }

  const openEditModal = (cat: ManagedCategory) => {
    setEditingCategory(cat)
    setFormData({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      itemCount: cat.itemCount,
      sort_order: cat.sort_order,
      active: cat.active,
    })
    setIsAddModalOpen(true)
  }

  const handleNameChange = (nameVal: string) => {
    const generatedSlug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: editingCategory ? prev.slug : generatedSlug,
    }))
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.image.trim()) {
      setFeedback({ type: 'error', message: 'Category Name and Image URL are required.' })
      return
    }

    setSaving(true)
    setFeedback(null)

    const payload = {
      id: formData.id,
      name: formData.name.trim(),
      slug: formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: formData.description.trim(),
      image: formData.image.trim(),
      item_count: Number(formData.itemCount) || 0,
      sort_order: Number(formData.sort_order) || 1,
      active: formData.active,
      updated_at: new Date().toISOString(),
    }

    try {
      // Upsert into Supabase homepage_categories
      const { error } = await supabase.from('homepage_categories').upsert(payload)

      if (error && !error.message.includes('relation')) {
        console.warn('Supabase categories upsert warning:', error.message)
      }

      // Update local state
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === payload.id)
        let updated: ManagedCategory[]
        if (exists) {
          updated = prev.map((c) =>
            c.id === payload.id
              ? {
                  id: payload.id,
                  name: payload.name,
                  slug: payload.slug,
                  description: payload.description,
                  image: payload.image,
                  itemCount: payload.item_count,
                  sort_order: payload.sort_order,
                  active: payload.active,
                }
              : c
          )
        } else {
          updated = [
            ...prev,
            {
              id: payload.id,
              name: payload.name,
              slug: payload.slug,
              description: payload.description,
              image: payload.image,
              itemCount: payload.item_count,
              sort_order: payload.sort_order,
              active: payload.active,
            },
          ]
        }
        return updated.sort((a, b) => a.sort_order - b.sort_order)
      })

      setFeedback({
        type: 'success',
        message: `Category "${payload.name}" saved successfully!`,
      })
      setIsAddModalOpen(false)
    } catch (err: any) {
      console.error('Save error:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to save category.' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (cat: ManagedCategory) => {
    const updatedActive = !cat.active
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, active: updatedActive } : c))
    )

    try {
      await supabase.from('homepage_categories').update({ active: updatedActive }).eq('id', cat.id)
    } catch (_) {}
  }

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return

    setCategories((prev) => prev.filter((c) => c.id !== catId))

    try {
      await supabase.from('homepage_categories').delete().eq('id', catId)
      setFeedback({ type: 'success', message: `Category "${catName}" deleted.` })
    } catch (_) {}
  }

  const activeCount = categories.filter((c) => c.active).length

  return (
    <SuperAdminLayout>
      <div className="space-y-6 text-slate-900">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Grid className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Categories Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add, edit, reorder, and manage storefront categories in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleSeedDefaults}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Defaults</span>
            </button>
            <button
              onClick={loadCategories}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Categories
            </span>
            <div className="text-2xl font-black text-slate-900">{categories.length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Storefront Categories
            </span>
            <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Storefront Display Mode
            </span>
            <div className="text-sm font-black text-slate-800 flex items-center gap-1.5 pt-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Round Plate Slider</span>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Category Items List ({categories.length})</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Use Edit to change sort order or details
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 uppercase">Loading categories...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Category Image & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-slate-100 shrink-0 shadow-xs relative">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">{cat.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          /{cat.slug}
                        </span>
                        {!cat.active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">
                        {cat.description || 'No description added.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                        cat.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={cat.active ? 'Hide from Storefront' : 'Show on Storefront'}
                    >
                      {cat.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{cat.active ? 'Active' : 'Disabled'}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 text-emerald-600" />
                <span>{editingCategory ? 'Edit Category' : 'Add New Category'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Crab & Lobster"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL Slug (Auto-generated) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">/category/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="crab-lobster"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Image URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Image Preview */}
              {formData.image && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-700">Live Preview</span>
                    <p className="text-xs font-extrabold text-slate-900">{formData.name || 'Category Name'}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief summary shown on category page..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Show on Storefront</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
