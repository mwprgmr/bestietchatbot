const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function inspectDb() {
  const { data: branches, error: bErr } = await supabase.from('branches').select('*')
  console.log('Branches in DB:', branches, bErr)

  const { data: inv, error: iErr } = await supabase.from('inventory').select('id, product_id, branch_id, inventory_date, price_per_kg, available_stock')
  console.log('Total inventory records:', inv?.length, iErr)
  console.log('Inventory breakdown by branch_id:')
  const branchCounts = {}
  inv?.forEach(i => {
    const b = i.branch_id || 'NULL'
    branchCounts[b] = (branchCounts[b] || 0) + 1
  })
  console.log(branchCounts)
}

inspectDb()
