import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage } from '../lib/whatsapp/state-machine'

async function verifyTrackAndPreviousOrders() {
  console.log('===========================================================')
  console.log('VERIFYING TRACK ORDER AND PREVIOUS ORDERS CHATBOT FLOWS')
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

  // Find a test customer who has existing orders
  const { data: testOrder } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const testPhone = testOrder?.customer?.phone || '919999999999'
  console.log(`Using test customer phone: ${testPhone} (Order #${testOrder?.order_number})`)

  // 1. Test Track Order Button Click
  console.log('\n--- Test Case 1: Tapping "Track Order" Button (btn_track_order) ---')
  const resTrack: any = await processWhatsAppMessage({
    from: testPhone,
    messageId: `msg_trk_${Date.now()}`,
    type: 'button_reply',
    buttonId: 'btn_track_order',
    text: '📦 Track Order',
  })

  const textTrack = typeof resTrack === 'string' ? resTrack : JSON.stringify(resTrack)
  console.log('Bot Response for Track Order:')
  console.log(textTrack)

  const isTrackSuccess = textTrack.includes('YOUR LIVE ORDERS TRACKING') && !textTrack.includes('Please select a branch to order from')
  console.log('Track Order Test Result:', isTrackSuccess ? '🎉 PASS (Track order items & status displayed!)' : '❌ FAIL (Went to branch menu or failed)')

  // 2. Test Previous Orders Button Click
  console.log('\n--- Test Case 2: Tapping "Previous Orders" Button (btn_previous_orders) ---')
  const resPrev: any = await processWhatsAppMessage({
    from: testPhone,
    messageId: `msg_prev_${Date.now()}`,
    type: 'button_reply',
    buttonId: 'btn_previous_orders',
    text: '🔄 Previous Orders',
  })

  const textPrev = typeof resPrev === 'string' ? resPrev : JSON.stringify(resPrev)
  console.log('Bot Response for Previous Orders:')
  console.log(textPrev)

  const isPrevSuccess = textPrev.includes('YOUR PREVIOUS ORDER HISTORY') && !textPrev.includes('Please select a branch to order from')
  console.log('Previous Orders Test Result:', isPrevSuccess ? '🎉 PASS (Order history displayed!)' : '❌ FAIL (Went to branch menu or failed)')

  console.log('\n===========================================================')
  console.log('OVERALL TRACK & PREVIOUS ORDERS RESULT:', (isTrackSuccess && isPrevSuccess) ? '🎉 PASS (ALL FIXED!)' : '❌ FAIL')
  console.log('===========================================================')
}

verifyTrackAndPreviousOrders()
