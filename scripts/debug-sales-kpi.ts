import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { format, isToday } from 'date-fns'

async function debugSalesKpi() {
  console.log('===========================================================')
  console.log('DEBUGGING TODAY SALES AND TOTAL FISH SOLD KPI')
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
  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'

  // Query all orders from database
  const { data: allOrders, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), order_items(*, product:products(*))')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return
  }

  console.log(`Total orders in DB: ${allOrders?.length || 0}`)

  const now = new Date()
  const todayFormatted = format(now, 'yyyy-MM-dd')
  const utcTodayStr = now.toISOString().split('T')[0]

  console.log(`Local Today: ${todayFormatted}, UTC Today: ${utcTodayStr}`)

  let marineTodaySales = 0
  let marineTodayOrders = 0
  let marineTodayKg = 0
  let marineTotalKgAllTime = 0

  let fortTodaySales = 0
  let fortTodayOrders = 0
  let fortTodayKg = 0

  allOrders?.forEach((o: any) => {
    const statusLower = (o.status || '').toLowerCase()
    const isCancelled = statusLower === 'cancelled'
    const oDate = new Date(o.created_at)
    const oLocalDay = format(oDate, 'yyyy-MM-dd')
    const isOrderToday = isToday(oDate) || oLocalDay === todayFormatted || o.created_at.startsWith(utcTodayStr)

    const amt = Number(o.total_amount ?? o.total ?? 0)
    const itemsList = o.items || o.order_items || []
    let orderKg = 0
    itemsList.forEach((i: any) => {
      orderKg += Number(i.quantity_kg ?? i.quantity ?? 0)
    })

    if (!isCancelled) {
      if (o.branch_id === MARINE_DRIVE_ID || !o.branch_id) {
        marineTotalKgAllTime += orderKg
        if (isOrderToday) {
          marineTodaySales += amt
          marineTodayOrders += 1
          marineTodayKg += orderKg
        }
      } else if (o.branch_id === FORT_KOCHI_ID) {
        if (isOrderToday) {
          fortTodaySales += amt
          fortTodayOrders += 1
          fortTodayKg += orderKg
        }
      }
    }

    console.log(`Order ${o.order_number}: Created ${o.created_at} | LocalDay: ${oLocalDay} | isToday: ${isOrderToday} | Branch: ${o.branch_id} | Status: ${o.status} | Amount: ₹${amt} | Kg: ${orderKg}kg`)
  })

  console.log('\n--- KPI CALCULATIONS SUMMARY ---')
  console.log(`Marine Drive Branch Today's Sales: ₹${marineTodaySales} (${marineTodayOrders} orders, ${marineTodayKg} kg fish)`)
  console.log(`Marine Drive All-Time Total Fish Sold: ${marineTotalKgAllTime} kg`)
  console.log(`Fort Kochi Branch Today's Sales: ₹${fortTodaySales} (${fortTodayOrders} orders, ${fortTodayKg} kg fish)`)
}

debugSalesKpi()
