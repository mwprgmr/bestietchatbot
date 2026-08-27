import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function inspectBranchVarieties() {
  console.log('===========================================================')
  console.log('INSPECTING DYNAMIC BRANCH VARIETIES IN DATABASE')
  console.log('===========================================================')

  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val && !process.env[key]) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const today = new Date().toISOString().split('T')[0]

  const { data: branches } = await supabase.from('branches').select('*').eq('is_active', true)
  console.log('Active branches:', branches)

  const { data: allInv } = await supabase
    .from('inventory')
    .select('*, product:products(*), branch:branches(*)')
    .order('inventory_date', { ascending: false })

  console.log(`Total inventory records in DB: ${allInv?.length || 0}`)

  for (const b of (branches || [])) {
    console.log(`\n--- Branch: ${b.name} (${b.id}) ---`)
    const branchInv = (allInv || []).filter((i: any) => i.branch_id === b.id)

    // Deduplicate by product_id taking latest entry
    const map = new Map<string, any>()
    branchInv.forEach((i: any) => {
      if (!map.has(i.product_id)) {
        map.set(i.product_id, i)
      }
    })

    const uniqueProducts = Array.from(map.values())
    const activeProductsWithStock = uniqueProducts.filter(
      (i: any) => Number(i.available_stock ?? i.opening_stock ?? 0) > 0 && i.product?.active !== false
    )

    console.log(`Unique products with history: ${uniqueProducts.length}`)
    activeProductsWithStock.forEach((i: any) => {
      console.log(`  - ${i.product?.name}: ${i.available_stock} kg left (Date: ${i.inventory_date})`)
    })
    console.log(`Dynamic count for ${b.name}: ${activeProductsWithStock.length} fish varieties available today`)
  }
}

inspectBranchVarieties()
