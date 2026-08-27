import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const rawBranchId = searchParams.get('branch_id') || MARINE_DRIVE_ID
    const targetBranchId = rawBranchId === FORT_KOCHI_ID ? FORT_KOCHI_ID : MARINE_DRIVE_ID

    const supabase = createAdminClient()

    // 1. Query inventory strictly for targetBranchId and target date
    const { data: branchItems, error } = await supabase
      .from('inventory')
      .select('*, product:products(*), branch:branches(*)')
      .eq('inventory_date', date)
      .eq('branch_id', targetBranchId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (branchItems && branchItems.length > 0) {
      return NextResponse.json(branchItems)
    }

    // 2. If no entries exist for date, carry forward latest active stock <= date
    const { data: latestItems, error: latestErr } = await supabase
      .from('inventory')
      .select('*, product:products(*), branch:branches(*)')
      .eq('branch_id', targetBranchId)
      .lte('inventory_date', date)
      .order('inventory_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (latestErr) throw latestErr

    const productMap = new Map<string, any>()
    for (const item of (latestItems || [])) {
      const avail = Number(item.available_stock ?? item.opening_stock ?? 0)
      if (!productMap.has(item.product_id) && avail > 0) {
        productMap.set(item.product_id, item)
      }
    }

    const rolledForward: any[] = Array.from(productMap.values())

    // Auto-insert carry-forward records for the requested date
    const resultItems: any[] = []
    for (const item of rolledForward) {
      if (item.inventory_date !== date) {
        try {
          const avail = Number(item.available_stock ?? item.opening_stock ?? 0)
          const { data: created } = await supabase
            .from('inventory')
            .insert([
              {
                product_id: item.product_id,
                branch_id: targetBranchId,
                inventory_date: date,
                price_per_kg: item.price_per_kg,
                opening_stock: avail,
                available_stock: avail,
                available_stock_kg: avail,
                low_stock_threshold: item.low_stock_threshold || 2,
              },
            ])
            .select('*, product:products(*), branch:branches(*)')
            .single()

          if (created) {
            resultItems.push(created)
          } else {
            resultItems.push(item)
          }
        } catch (e) {
          resultItems.push(item)
        }
      } else {
        resultItems.push(item)
      }
    }

    return NextResponse.json(resultItems)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_id, branch_id, inventory_date, price_per_kg, opening_stock, low_stock_threshold } = body

    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'Please select a fish product.' }, { status: 400 })
    }

    if (!inventory_date) {
      return NextResponse.json({ error: 'Inventory date is required.' }, { status: 400 })
    }

    const price = parseFloat(price_per_kg)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Price per kg must be a positive number.' }, { status: 400 })
    }

    const stock = parseFloat(opening_stock)
    if (isNaN(stock) || stock < 0) {
      return NextResponse.json({ error: 'Opening stock cannot be negative.' }, { status: 400 })
    }

    const threshold = parseFloat(low_stock_threshold !== undefined && low_stock_threshold !== '' ? low_stock_threshold : '2')
    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json({ error: 'Low stock threshold cannot be negative.' }, { status: 400 })
    }

    const targetBranchId = branch_id === FORT_KOCHI_ID ? FORT_KOCHI_ID : MARINE_DRIVE_ID
    const supabase = createAdminClient()

    // 1. Check for existing inventory record strictly for (branch_id, product_id, inventory_date)
    const { data: existingList } = await supabase
      .from('inventory')
      .select('*, product:products(*)')
      .eq('product_id', product_id)
      .eq('inventory_date', inventory_date)
      .eq('branch_id', targetBranchId)
      .limit(1)

    const existing = existingList && existingList.length > 0 ? existingList[0] : null

    let data: any = null
    let error: any = null

    if (existing?.id) {
      const updatePayload: any = {
        branch_id: targetBranchId,
        price_per_kg: price,
        opening_stock: stock,
        available_stock: stock,
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      }

      let res = await supabase
        .from('inventory')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('*, product:products(*)')
        .single()

      data = res.data
      error = res.error
    } else {
      const insertPayload: any = {
        product_id,
        branch_id: targetBranchId,
        inventory_date,
        price_per_kg: price,
        opening_stock: stock,
        available_stock: stock,
        sold_stock: 0,
        reserved_stock: 0,
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      }

      let res = await supabase
        .from('inventory')
        .insert([insertPayload])
        .select('*, product:products(*)')
        .single()

      data = res.data
      error = res.error
    }

    if (error) {
      console.error('[Admin API Inventory Error]:', error.message)
      throw new Error(error.message || 'Failed to update branch inventory record')
    }

    if (data?.id) {
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
    return NextResponse.json({ error: err.message || 'Failed to process inventory update' }, { status: 400 })
  }
}
