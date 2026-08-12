import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*, product:products(*)')
      .eq('inventory_date', date)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_id, inventory_date, price_per_kg, opening_stock, low_stock_threshold } = body

    if (!product_id || !inventory_date || price_per_kg === undefined || opening_stock === undefined) {
      return NextResponse.json({ error: 'Missing required inventory fields' }, { status: 400 })
    }

    const price = parseFloat(price_per_kg)
    const stock = parseFloat(opening_stock)
    const threshold = parseFloat(low_stock_threshold || '2')

    const supabase = createAdminClient()

    // 1. Try direct admin client upsert
    let { data, error } = await supabase
      .from('inventory')
      .upsert(
        {
          product_id,
          inventory_date,
          price_per_kg: price,
          opening_stock: stock,
          available_stock: stock,
          sold_stock: 0,
          reserved_stock: 0,
          low_stock_threshold: threshold,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,inventory_date' }
      )
      .select()
      .single()

    if (error) {
      console.warn('[Admin API Inventory Upsert Fallback to RPC]:', error.message)
      // 2. Fallback to RPC SECURITY DEFINER function
      const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_inventory_sec', {
        p_product_id: product_id,
        p_inventory_date: inventory_date,
        p_price_per_kg: price,
        p_opening_stock: stock,
        p_low_stock_threshold: threshold,
      })

      if (rpcErr) {
        console.error('[Admin API Inventory RPC Error]:', rpcErr)
        throw error
      }
      return NextResponse.json(rpcData)
    }

    if (data) {
      await supabase.from('inventory_movements').insert([
        {
          inventory_id: data.id,
          product_id,
          movement_type: 'OPENING',
          quantity_change: stock,
          reason: `Opening stock set for ${inventory_date}`,
        },
      ])
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[Admin Inventory POST Error]:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
