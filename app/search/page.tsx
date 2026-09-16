'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import ProductCard, { ProductProps } from '@/components/customer/ProductCard'
import { Search, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function SearchContent() {
  const searchParams = useSearchParams()
  const qParam = searchParams?.get('q') || ''
  const { selectedBranch } = useCustomer()

  const [query, setQuery] = useState(qParam)
  const [products, setProducts] = useState<ProductProps[]>([])
  const [loading, setLoading] = useState(false)

  // Sync query state when URL param changes
  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    async function executeSearch() {
      if (!query.trim()) {
        setProducts([])
        return
      }
      setLoading(true)
      try {
        const supabase = createClient()
        const searchTerm = query.trim().toLowerCase()

        const { data: rawProducts } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)

        const branchId = selectedBranch?.id || ''
        const { data: rawInventory } = await supabase
          .from('inventory')
          .select('*')
          .eq('branch_id', branchId)

        const filtered = (rawProducts || []).filter((p) => {
          const nameMatch = (p.name || '').toLowerCase().includes(searchTerm)
          const catMatch = (p.category || '').toLowerCase().includes(searchTerm)
          const descMatch = (p.description || '').toLowerCase().includes(searchTerm)
          return nameMatch || catMatch || descMatch
        })

        const mapped: ProductProps[] = filtered.map((p) => {
          const invMatch = (rawInventory || []).find((i) => i.product_id === p.id)
          const price = invMatch?.price_per_kg ? Number(invMatch.price_per_kg) : 450
          const stock = invMatch?.available_stock !== undefined ? Number(invMatch.available_stock) : 20

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category || 'Fish',
            unit: p.unit || 'kg',
            price_per_kg: price,
            original_price_per_kg: Math.round(price * 1.25),
            available_stock: stock,
            image_url: p.image_url,
          }
        })

        setProducts(mapped)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    executeSearch()
  }, [query, selectedBranch?.id])

  const branchDisplayName = selectedBranch?.name ? selectedBranch.name.replace(' Branch', '') : ''

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#232B1E]/70 hover:text-[#8B9A6E] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Storefront</span>
      </Link>

      {/* Search Input Box */}
      <div className="bg-white p-6 rounded-3xl border border-[#EEEEEE] shadow-xs space-y-4">
        <h1 className="text-xl font-black text-[#232B1E]">SEARCH FRESH PRODUCTS</h1>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type fish or meat name e.g. Neymeen, Ayala, Prawns, Chicken, Mutton..."
            className="w-full pl-11 pr-4 py-3 bg-[#F7F2EB] border border-[#EEEEEE] rounded-2xl text-sm font-semibold text-[#232B1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9A6E] shadow-inner"
          />
          <Search className="w-5 h-5 text-[#232B1E]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-extrabold text-[#232B1E]/50 uppercase tracking-wider shrink-0">
            Popular Searches:
          </span>
          {['Neymeen', 'Ayala', 'Mathi', 'Prawns', 'Chicken', 'Mutton', 'Karimeen', 'Salmon'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="px-3 py-1 bg-[#EEEEEE] hover:bg-[#8B9A6E]/20 hover:text-[#232B1E] text-[#232B1E] font-bold rounded-full text-xs transition-colors border border-[#EEEEEE] shrink-0 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#8B9A6E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#232B1E]/70">Searching fresh inventory...</p>
        </div>
      ) : query && products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EEEEEE] text-[#232B1E]/70 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-[#8B9A6E]" />
          <h3 className="text-base font-extrabold text-[#232B1E]">No products found for "{query}"</h3>
          <p className="text-xs">Try searching for alternative names like Neymeen, Chicken, or Prawns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {query && (
            <p className="text-xs font-bold text-[#232B1E]/70">
              Found {products.length} product(s) for "{query}" {branchDisplayName ? `in ${branchDisplayName}` : ''}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <Suspense fallback={<div className="py-10 text-center text-xs text-[#232B1E]/70">Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </StorefrontLayout>
  )
}
