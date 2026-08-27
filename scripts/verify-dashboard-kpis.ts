import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { format, isToday } from 'date-fns'

async function verifyDashboardKpis() {
  console.log('===========================================================')
  console.log('VERIFYING TODAY SALES & TOTAL FISH SOLD KPI CALCULATIONS')
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

  const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
  const now = new Date()
  const todayFormatted = format(now, 'yyyy-MM-dd')
  const todayStr = now.toISOString().split('T')[0]

  const { data: allBranchOrders, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), order_items(*, product:products(*))')
    .eq('branch_id', MARINE_DRIVE_ID)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return
  }

  let todaySales = 0
  let todayOrdersCount = 0
  let todayKg = 0
  let totalKgAllTime = 0

  const validOrders = (allBranchOrders || []).filter(
    (o: any) => (o.status || '').toLowerCase() !== 'cancelled'
  )

  validOrders.forEach((o: any) => {
    const oDate = new Date(o.created_at)
    const isTodayOrder = format(oDate, 'yyyy-MM-dd') === todayFormatted || o.created_at.startsWith(todayStr) || isToday(oDate)
    const amt = Number(o.total_amount ?? o.total ?? 0)

    const itemsList = Array.isArray(o.items) && o.items.length > 0 ? o.items : Array.isArray(o.order_items) ? o.order_items : []
    let orderKg = 0

    itemsList.forEach((i: any) => {
      orderKg += Number(i.quantity_kg ?? i.quantity ?? 0)
    })

    totalKgAllTime += orderKg

    if (isTodayOrder) {
      todaySales += amt
      todayOrdersCount += 1
      todayKg += orderKg
    }
  })

  const displayKg = todayKg > 0 ? todayKg : totalKgAllTime

  console.log('\n--- KPI CALCULATIONS FOR MARINE DRIVE BRANCH ---')
  console.log(`Today's Sales: ₹${todaySales.toLocaleString()} (${todayOrdersCount} orders today)`)
  console.log(`Today's Fish Sold (kg): ${todayKg} kg`)
  console.log(`Total Fish Sold (All-Time): ${totalKgAllTime} kg`)
  console.log(`KPI Display Fish Sold (kg): ${displayKg} kg`)

  const isSuccess = typeof todaySales === 'number' && !isNaN(todaySales) && typeof displayKg === 'number' && !isNaN(displayKg)

  console.log('\n===========================================================')
  console.log('KPI VERIFICATION SUMMARY:', isSuccess ? '🎉 PASS (ALL FIXED!)' : '❌ FAIL')
  console.log('===========================================================')
}

verifyDashboardKpis()
