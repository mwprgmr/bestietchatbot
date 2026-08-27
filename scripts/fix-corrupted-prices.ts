import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function fixCorruptedPrices() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('Cleaning up corrupted inventory price_per_kg...')

  // 1. Update any row where price_per_kg >= 1000
  const { data: badRows } = await supabase.from('inventory').select('*').gte('price_per_kg', 1000)
  console.log('Found corrupted price rows:', badRows?.length)

  if (badRows && badRows.length > 0) {
    for (const row of badRows) {
      const { data: prod } = await supabase.from('products').select('price_per_unit').eq('id', row.product_id).single()
      const fallbackPrice = prod?.price_per_unit || 220
      console.log(`Fixing row ${row.id} (${row.price_per_kg} -> ${fallbackPrice})...`)
      await supabase.from('inventory').update({ price_per_kg: fallbackPrice }).eq('id', row.id)
    }
  }

  console.log('✅ Corrupted inventory prices cleaned!')
}

fixCorruptedPrices()
