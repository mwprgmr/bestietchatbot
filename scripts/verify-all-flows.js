const fs = require('fs')
const path = require('path')

async function inspectDuplicates() {
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

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const { data: invs, error } = await supabase.from('inventory').select('id, branch_id, product_id, inventory_date')
  console.log('Total inventory records:', invs?.length, error)

  const map = {}
  invs?.forEach((i) => {
    const key = `${i.branch_id || 'NULL'}_${i.product_id}_${i.inventory_date}`
    map[key] = (map[key] || 0) + 1
  })

  console.log('Duplicate groups:', Object.entries(map).filter(([_, count]) => count > 1))
}

inspectDuplicates()
