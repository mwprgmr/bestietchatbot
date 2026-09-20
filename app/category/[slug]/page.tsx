'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/context/CustomerContext'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import ProductCard, { ProductProps } from '@/components/customer/ProductCard'
import { CATEGORIES } from '@/lib/data/ecommerce-data'
import { Filter, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function CategoryPage() {
  const params = useParams()
  const slug = (params?.slug as string) || 'fish'
  const { selectedBranch } = useCustomer()

  const [products, setProducts] = useState<ProductProps[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCut, setFilterCut] = useState<string>('ALL')

  const initialCat = CATEGORIES.find((c) => c.slug === slug) || {
    name: slug.toUpperCase(),
    description: `Fresh ${slug} products cleaned and delivered to your doorstep.`,
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80',
    slug,
  }

  const [categoryObj, setCategoryObj] = useState<{
    name: string
    description: string
    image: string
    slug: string
  }>(initialCat)

  useEffect(() => {
    async function loadCategoryProducts() {
      setLoading(true)
      try {
        const supabase = createClient()

        // 1. Fetch category details from homepage_categories
        let catName = ''
        const { data: dbCat } = await supabase
          .from('homepage_categories')
          .select('*')
          .eq('slug', slug)
          .single()

        if (dbCat) {
          catName = dbCat.name
          setCategoryObj({
            name: dbCat.name,
            description: dbCat.description || '',
            image: dbCat.image,
            slug: dbCat.slug,
          })
        } else {
          const defaultCat = CATEGORIES.find((c) => c.slug === slug)
          if (defaultCat) {
            catName = defaultCat.name
            setCategoryObj(defaultCat)
          }
        }

        // 2. Fetch products via secure /api/products API
        const targetBranchId = selectedBranch?.id || 'b1111111-1111-1111-1111-111111111111'
        let mapped: ProductProps[] = []
        try {
          const res = await fetch(`/api/products?branch_id=${targetBranchId}&category=${slug}&t=${Date.now()}`, {
            cache: 'no-store',
          })
          const apiData = await res.json()
          if (apiData?.success && Array.isArray(apiData.products)) {
            mapped = apiData.products
          }
        } catch (apiErr) {
          console.warn('API category products fetch warning, falling back to client:', apiErr)
        }

        // Fallback to client query if API returned empty
        if (mapped.length === 0) {
          let queryCategory = catName || slug
          if (slug === 'fish') queryCategory = 'Fish'
          else if (slug === 'chicken') queryCategory = 'Chicken'
          else if (slug === 'mutton') queryCategory = 'Mutton'
          else if (slug === 'seafood') queryCategory = 'Seafood'
          else if (slug === 'ready-to-cook') queryCategory = 'Ready to Cook'
          else if (slug === 'combos') queryCategory = 'Combos'

          const { data: rawProducts } = await supabase
            .from('products')
            .select('*')
            .or(`category.ilike.%${queryCategory}%,category.ilike.%${slug}%`)
            .eq('active', true)

          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
          const { data: rawInventory } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch_id', targetBranchId)
            .lte('inventory_date', todayStr)
            .order('inventory_date', { ascending: false })

          mapped = (rawProducts || []).map((p) => {
            const invMatch = (rawInventory || []).find((i) => i.product_id === p.id && i.inventory_date === todayStr)

            const price = invMatch?.price_per_kg ? Number(invMatch.price_per_kg) : (p.price_per_kg || 450)
            const stock = invMatch && invMatch.available_stock !== undefined && invMatch.available_stock !== null
              ? Math.max(0, Number(invMatch.available_stock))
              : 0

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
        }

        // Strict sorting: IN STOCK (available_stock > 0) ALWAYS FIRST, OUT OF STOCK ALWAYS LAST
        mapped.sort((a, b) => {
          const aStock = a.available_stock > 0 ? 1 : 0
          const bStock = b.available_stock > 0 ? 1 : 0
          if (aStock !== bStock) return bStock - aStock
          return a.name.localeCompare(b.name)
        })

        setProducts(mapped)
      } catch (err) {
        console.error('Category products load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCategoryProducts()
  }, [slug, selectedBranch?.id])

  return (
    <StorefrontLayout>
      <div className="space-y-6">
        {/* Back Link & Header Banner */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]/70 hover:text-[#7FBA44] transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </Link>

          <div className="relative rounded-3xl overflow-hidden bg-[#0F172A] text-white p-6 sm:p-8 border border-[#7FBA44]/30 shadow-md">
            <div className="relative z-10 max-w-xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7FBA44]">
                Fresh Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                {categoryObj.name}
              </h1>
              <p className="text-xs text-[#E2E8F0]/80">{categoryObj.description}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-[#0F172A]/70 flex items-center gap-1 mr-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#7FBA44]" /> Filter:
          </span>
          {['ALL', 'Cleaned', 'Curry Cut', 'Boneless', 'In Stock Only'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterCut(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterCut === f
                  ? 'bg-[#7FBA44] text-white shadow-xs'
                  : 'bg-[#FFFFFF] text-[#0F172A] border border-[#E2E8F0] hover:border-[#7FBA44]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#7FBA44] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#0F172A]/70 uppercase">Loading {categoryObj.name}...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] rounded-3xl border border-[#E2E8F0] text-[#0F172A]/70 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-[#7FBA44]" />
            <h3 className="text-sm font-extrabold text-[#0F172A]">No products found in this category</h3>
            <p className="text-xs">Try selecting another branch or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {products
              .filter((p) => {
                if (filterCut === 'In Stock Only') return p.available_stock > 0
                return true
              })
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
