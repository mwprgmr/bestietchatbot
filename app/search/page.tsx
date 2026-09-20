'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import ProductCard, { ProductProps } from '@/components/customer/ProductCard'
import { Search, ArrowLeft, AlertCircle, ShoppingBag, X } from 'lucide-react'
import Link from 'next/link'

function SearchContent() {
  const searchParams = useSearchParams()
  const qParam = searchParams ? searchParams.get('q') || '' : ''
  const { selectedBranch } = useCustomer()

  const [query, setQuery] = useState<string>(qParam)
  const [products, setProducts] = useState<ProductProps[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Sync state when URL q param changes
  useEffect(() => {
    setQuery(qParam || '')
  }, [qParam])

  useEffect(() => {
    let isMounted = true

    async function executeSearch() {
      const trimmedQuery = (query || '').trim()
      if (!trimmedQuery) {
        if (isMounted) {
          setProducts([])
          setSearchError(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setSearchError(null)

      try {
        const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'
        let mapped: ProductProps[] = []

        try {
          const res = await fetch(`/api/products?branch_id=${targetBranchId}&q=${encodeURIComponent(trimmedQuery)}&t=${Date.now()}`, {
            cache: 'no-store',
          })
          const apiData = await res.json()
          if (apiData?.success && Array.isArray(apiData.products)) {
            mapped = apiData.products
          }
        } catch (apiErr) {
          console.warn('API search products fetch warning, falling back to client:', apiErr)
        }

        if (mapped.length === 0) {
          const supabase = createClient()
          const searchTerm = trimmedQuery.toLowerCase()

          // Fetch active products
          const { data: rawProducts, error: pErr } = await supabase
            .from('products')
            .select('*')
            .eq('active', true)

          if (pErr) {
            console.error('[SEARCH_ERROR] Products fetch error:', pErr.message)
            if (isMounted) {
              setSearchError('Something went wrong while searching. Please try again.')
              setProducts([])
            }
            return
          }

          // Fetch branch inventory
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
          const { data: rawInventory, error: iErr } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch_id', targetBranchId)
            .lte('inventory_date', todayStr)
            .order('inventory_date', { ascending: false })

          if (iErr) {
            console.warn('[SEARCH_WARNING] Inventory fetch warning:', iErr.message)
          }

          const safeProducts = Array.isArray(rawProducts) ? rawProducts : []
          const safeInventory = Array.isArray(rawInventory) ? rawInventory : []

          // Filter by name, category, or description safely
          const filtered = safeProducts.filter((p) => {
            if (!p) return false
            const nameMatch = (p.name || '').toLowerCase().includes(searchTerm)
            const catMatch = (p.category || '').toLowerCase().includes(searchTerm)
            const descMatch = (p.description || '').toLowerCase().includes(searchTerm)
            return nameMatch || catMatch || descMatch
          })

          // Map safely with fallbacks
          mapped = filtered.map((p) => {
            const invMatch = safeInventory.find((i) => i && i.product_id === p.id && i.inventory_date === todayStr)

            const rawPrice = invMatch?.price_per_kg ?? p.price_per_kg ?? 450
            const price = typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0 ? Number(rawPrice) : 450
            const stock = invMatch && invMatch.available_stock !== undefined && invMatch.available_stock !== null
              ? Math.max(0, Number(invMatch.available_stock))
              : 0

            return {
              id: p.id || `prod-${Math.random()}`,
              name: p.name || 'Fresh Product',
              description: p.description || '',
              category: p.category || 'Fish',
              unit: p.unit || 'kg',
              price_per_kg: price,
              original_price_per_kg: Math.round(price * 1.25),
              available_stock: stock,
              image_url: p.image_url || null,
            }
          })
        }

        // Strict sorting: IN STOCK (available_stock > 0) ALWAYS FIRST, OUT OF STOCK ALWAYS LAST
        mapped.sort((a, b) => {
          const aStock = a.available_stock > 0 ? 1 : 0
          const bStock = b.available_stock > 0 ? 1 : 0
          if (aStock !== bStock) return bStock - aStock
          return a.name.localeCompare(b.name)
        })

        if (isMounted) {
          setProducts(mapped)
        }
      } catch (err: any) {
        console.error('Search error:', err)
        if (isMounted) setSearchError('An unexpected error occurred.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    executeSearch()

    return () => {
      isMounted = false
    }
  }, [query, selectedBranch])

  const branchDisplayName = selectedBranch?.name

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#7FBA44] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Storefront</span>
      </Link>

      {/* Search Input Box (Capsule Pill Design) */}
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4">
        <h1 className="text-xl font-black text-[#0F172A] uppercase">SEARCH FRESH PRODUCTS</h1>

        <div className="relative flex items-center bg-slate-50 focus-within:bg-white border border-slate-200 rounded-full p-1 pl-4 transition-all focus-within:border-[#7FBA44] focus-within:ring-2 focus-within:ring-[#7FBA44]/20 shadow-2xs">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type fish or meat name e.g. Neymeen, Ayala, Prawns, Chicken, Mutton..."
            className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm font-semibold px-3 py-2"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="shrink-0 bg-[#7FBA44] hover:bg-[#71A83A] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-extrabold text-[#0F172A]/50 uppercase tracking-wider shrink-0">
            Popular Searches:
          </span>
          {['Neymeen', 'Ayala', 'Mathi', 'Prawns', 'Chicken', 'Mutton', 'Karimeen', 'Salmon'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="px-3.5 py-1.5 bg-[#E2E8F0]/60 hover:bg-[#7FBA44] hover:text-white text-[#0F172A] font-bold rounded-full text-xs transition-colors border border-transparent shrink-0 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results / States */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#7FBA44] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">
            Searching fresh inventory...
          </p>
        </div>
      ) : searchError ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-red-200 text-red-700 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          <h3 className="text-base font-extrabold text-slate-900">{searchError}</h3>
          <button
            onClick={() => setQuery(query)}
            className="px-4 py-2 bg-[#7FBA44] text-white font-bold text-xs rounded-xl hover:bg-[#71A83A] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : !query.trim() ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] text-[#0F172A]/70 space-y-2">
          <ShoppingBag className="w-8 h-8 mx-auto text-[#7FBA44]" />
          <h3 className="text-base font-extrabold text-[#0F172A]">Search for fresh fish, meat & seafood</h3>
          <p className="text-xs">Type a keyword above or select one of the popular search tags.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] text-[#0F172A]/70 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-[#7FBA44]" />
          <h3 className="text-base font-extrabold text-[#0F172A]">No products found for "{query}"</h3>
          <p className="text-xs">Try searching for alternative names like Neymeen, Chicken, or Prawns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#0F172A]/70">
            Found {products.length} product(s) for "{query}" {branchDisplayName ? `in ${branchDisplayName}` : ''}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <StorefrontLayout>
      <Suspense fallback={<div className="py-12 text-center text-xs font-bold text-[#0F172A]/70 uppercase">Loading search page...</div>}>
        <SearchContent />
      </Suspense>
    </StorefrontLayout>
  )
}
