export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'


const DEFAULT_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'
const DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocW9vbmJod3NmZndvanZuZG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk4NTUwNiwiZXhwIjoyMTAwNTYxNTA2fQ.kpOHtCV9jRBBtiQP_aTBh9DYzdoAfWpP77o1preof28'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branch_id') || 'b1111111-1111-1111-1111-111111111111'
    const productId = searchParams.get('id')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY
    )

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    let query = supabase.from('products').select('*')
    if (productId) {
      query = query.eq('id', productId)
    } else {
      query = query.eq('active', true).order('name', { ascending: true })
    }

    const { data: rawProducts, error: pErr } = await query

    if (pErr) {
      throw pErr
    }

    const { data: rawInventory, error: iErr } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId)
      .lte('inventory_date', todayStr)
      .order('inventory_date', { ascending: false })

    if (iErr) console.warn('Inventory fetch warning:', iErr.message)

    const mapped = (rawProducts || []).map((p) => {
      const todayInv = (rawInventory || []).find((i) => i.product_id === p.id && i.inventory_date === todayStr)
      const fallbackInv = (rawInventory || []).find((i) => i.product_id === p.id)
      const invMatch = todayInv || fallbackInv

      const price = invMatch?.price_per_kg ? Number(invMatch.price_per_kg) : (p.price_per_kg || 250)
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

    return NextResponse.json(
      { success: true, products: mapped, product: mapped[0] || null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (err: any) {
    console.error('API Products route error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
