'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types/database'
import {
  Fish,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Tag,
  Scale,
  Sparkles
} from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Fish',
    unit: 'kg',
    image_url: '',
    active: true,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Try server API route first
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data || [])
        return
      }

      // 2. Fallback to direct client query
      const { data, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setProducts(data || [])
    } catch (err: any) {
      console.error('[Admin Products Fetch Error]:', err)
      setError(err.message || 'Failed to load products from database.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (product?: Product) => {
    setError(null)
    setSuccessMsg(null)
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category || 'Fish',
        unit: product.unit || 'kg',
        image_url: product.image_url || '',
        active: product.active,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        category: 'Fish',
        unit: 'kg',
        image_url: '',
        active: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Obtain authenticated user info
      const { data: { user } } = await supabase.auth.getUser()

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category: formData.category || 'Fish',
        unit: formData.unit || 'kg',
        image_url: formData.image_url?.trim() || null,
        active: formData.active,
      }

      if (!editingProduct) {
        if (user?.id) {
          payload.created_by = user.id
        }
      } else {
        payload.id = editingProduct.id
        if (editingProduct.created_by) {
          payload.created_by = editingProduct.created_by
        }
      }

      // 1. Try server API route (bypasses browser RLS issues securely)
      const apiUrl = '/api/admin/products'
      const apiMethod = editingProduct ? 'PUT' : 'POST'

      const apiRes = await fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (apiRes.ok) {
        setSuccessMsg(editingProduct ? 'Fish product updated successfully!' : 'New fish product added successfully!')
        setIsModalOpen(false)
        fetchProducts()
        return
      }

      const apiErrData = await apiRes.json().catch(() => ({}))
      console.warn('[Admin API Route Save Error, attempting fallback]:', apiErrData)

      // 2. Fallback to RPC SECURITY DEFINER function or direct client insert
      const { error: rpcErr } = await supabase.rpc('upsert_product_sec', {
        p_id: editingProduct ? editingProduct.id : null,
        p_name: payload.name,
        p_description: payload.description,
        p_category: payload.category,
        p_unit: payload.unit,
        p_image_url: payload.image_url,
        p_active: payload.active,
        p_created_by: payload.created_by || user?.id || null,
      })

      if (rpcErr) {
        console.error('[Admin Product RPC Save Error]:', rpcErr)

        if (editingProduct) {
          const { error: directErr } = await supabase
            .from('products')
            .update(payload)
            .eq('id', editingProduct.id)

          if (directErr) {
            console.error('[Admin Product Direct Update Error]:', directErr)
            throw directErr
          }
        } else {
          const { error: directErr } = await supabase.from('products').insert([payload])

          if (directErr) {
            console.error('[Admin Product Direct Insert Error]:', directErr)
            throw directErr
          }
        }
      }

      setSuccessMsg(editingProduct ? 'Fish product updated successfully!' : 'New fish product added successfully!')
      setIsModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      console.error('[Product Save Failure]:', err)
      setError(err.message || 'Failed to save product.')
      // Entered form data is preserved in state so user doesn't lose input
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          active: !product.active,
          created_by: product.created_by,
        }),
      })

      if (res.ok) {
        fetchProducts()
        return
      }

      const { error } = await supabase
        .from('products')
        .update({ active: !product.active, updated_at: new Date().toISOString() })
        .eq('id', product.id)

      if (error) throw error
      fetchProducts()
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return

    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSuccessMsg(`Deleted product ${product.name}`)
        fetchProducts()
        return
      }

      const { error: rpcErr } = await supabase.rpc('delete_product_sec', { p_id: product.id })
      if (rpcErr) {
        const { error: directErr } = await supabase.from('products').delete().eq('id', product.id)
        if (directErr) throw directErr
      }
      setSuccessMsg(`Deleted product ${product.name}`)
      fetchProducts()
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL'
      ? true
      : statusFilter === 'ACTIVE'
      ? p.active
      : !p.active
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Fish className="w-7 h-7 text-emerald-600" />
            Fish Catalogue Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage master fresh fish catalogue available for daily inventory selection.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Fish</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Status Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fish name or category..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Fish' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading fish catalogue...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Fish className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No fish products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search ? 'No products match your search query.' : 'Add your first fish product to start managing daily inventory.'}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fish Product</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fish Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Unit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <Fish className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                            {product.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {product.category || 'Fish'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Scale className="w-3 h-3 text-slate-400" />
                        Per {product.unit || 'kg'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          product.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {product.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                          title="Edit Fish"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete Fish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Fish className="w-5 h-5 text-emerald-600" />
                {editingProduct ? 'Edit Fish Product' : 'Add New Fish Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ayala, Karimeen, Prawns"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Fish">Fish</option>
                    <option value="Shellfish">Shellfish</option>
                    <option value="Crustacean">Crustacean</option>
                    <option value="Specialty">Specialty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="piece">piece</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fresh daily catch details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-xs border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-700">
                  Active (Available for adding to daily stock)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Fish' : 'Add Fish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
