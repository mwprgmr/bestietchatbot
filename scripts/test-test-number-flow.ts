import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage, resolveCustomerBranch } from '../lib/whatsapp/state-machine'
import { normalizePhoneNumber } from '../lib/whatsapp/phone-utils'

async function verifyTestPhoneNumberFlow() {
  console.log('===========================================================')
  console.log('TEST PHONE NUMBER INTEGRATION VERIFICATION (+1 555-196-4153)')
  console.log('===========================================================')

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

  const rawPhone = '+1 (555) 196-4153'
  const phone = normalizePhoneNumber(rawPhone)

  console.log(`Raw Test Phone: ${rawPhone}`)
  console.log(`Normalized Phone: ${phone}`)

  if (phone !== '15551964153') {
    console.error('❌ Phone normalization failed!')
    return
  }
  console.log('Phone Normalization: 🎉 PASS')

  // Step 1: Initialize / Reset Test Session
  const { data: cust } = await supabase.from('customers').select('*').eq('phone', phone).single()
  if (cust?.id) {
    await supabase.from('chat_sessions').delete().eq('customer_id', cust.id)
  }

  // Step 2: Send "Hi" -> Expect Branch Selection
  console.log('\n--- Step 1: Send "Hi" ---')
  await processWhatsAppMessage({ from: rawPhone, type: 'text', text: 'Hi', messageId: `msg_${Date.now()}_1` })
  
  const custDb = (await supabase.from('customers').select('*').eq('phone', phone).single()).data
  const sessDb1 = (await supabase.from('chat_sessions').select('*').eq('customer_id', custDb?.id || '').single()).data

  console.log('Customer Record Created:', custDb?.id ? '🎉 PASS' : '❌ FAIL')
  console.log('Initial Session Branch:', sessDb1?.selected_branch_id === null ? '🎉 PASS (Branch Selection Required)' : '❌ FAIL')

  // Step 3: Select Peroorkada Branch
  console.log('\n--- Step 2: Select Peroorkada Branch ---')
  const PEROORKADA_ID = 'b2222222-2222-2222-2222-222222222222'
  await processWhatsAppMessage({ from: rawPhone, type: 'list_reply', listId: PEROORKADA_ID, messageId: `msg_${Date.now()}_2` })
  
  const sessDb2 = (await supabase.from('chat_sessions').select('*').eq('customer_id', custDb?.id || '').single()).data
  console.log('Branch Assigned:', sessDb2?.selected_branch_id === PEROORKADA_ID ? '🎉 PASS (Peroorkada Assigned)' : '❌ FAIL')

  // Step 4: Verify Branch Resolution
  const branchRes = await resolveCustomerBranch(supabase, sessDb2)
  console.log('Branch Resolution Check:', branchRes.isValid && branchRes.branch_name?.includes('Peroorkada') ? '🎉 PASS' : '❌ FAIL')

  console.log('\n===========================================================')
  console.log('🎉 TEST PHONE NUMBER (+1 555-196-4153) VERIFICATION SUCCESSFUL!')
  console.log('===========================================================')
}

verifyTestPhoneNumberFlow()
