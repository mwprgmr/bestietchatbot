import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
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
    const { name, description, category, unit, image_url, active, created_by } = body

    if (!name) {
      return NextResponse.json({ error: 'Fish name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const payload: any = {
      name: name.trim(),
      description: description?.trim() || null,
      category: category || 'Fish',
      unit: unit || 'kg',
      image_url: image_url?.trim() || null,
      active: active !== undefined ? active : true,
      updated_at: new Date().toISOString(),
    }

    if (created_by) {
      payload.created_by = created_by
    }

    // Try direct insert with admin client
    let { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.warn('[Admin API Product Insert Fallback to RPC]:', error.message)
      // Fallback to RPC SECURITY DEFINER function
      const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_product_sec', {
        p_id: null,
        p_name: payload.name,
        p_description: payload.description,
        p_category: payload.category,
        p_unit: payload.unit,
        p_image_url: payload.image_url,
        p_active: payload.active,
        p_created_by: payload.created_by || null,
      })

      if (rpcErr) throw error // Throw original error if RPC also fails
      data = rpcData
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[Admin Products POST Error]:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, description, category, unit, image_url, active, created_by } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const payload: any = {
      name: name.trim(),
      description: description?.trim() || null,
      category: category || 'Fish',
      unit: unit || 'kg',
      image_url: image_url?.trim() || null,
      active: active !== undefined ? active : true,
      updated_at: new Date().toISOString(),
    }

    if (created_by) {
      payload.created_by = created_by
    }

    let { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.warn('[Admin API Product Update Fallback to RPC]:', error.message)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_product_sec', {
        p_id: id,
        p_name: payload.name,
        p_description: payload.description,
        p_category: payload.category,
        p_unit: payload.unit,
        p_image_url: payload.image_url,
        p_active: payload.active,
        p_created_by: payload.created_by || null,
      })

      if (rpcErr) throw error
      data = rpcData
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[Admin Products PUT Error]:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      console.warn('[Admin API Product Delete Fallback to RPC]:', error.message)
      const { error: rpcErr } = await supabase.rpc('delete_product_sec', { p_id: id })
      if (rpcErr) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Admin Products DELETE Error]:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
