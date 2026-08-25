import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function inspectAdminBranchAssignments() {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const { data: assignments, error: err1 } = await supabase.from('admin_branch_assignments').select('*')
  console.log('admin_branch_assignments:', assignments, err1)

  const { data: orders, error: err2 } = await supabase.from('orders').select('*').eq('order_number', 'BF-20260825-6583')
  console.log('Order BF-20260825-6583:', orders, err2)
}

inspectAdminBranchAssignments()
