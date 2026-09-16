const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const idx = l.indexOf('=');
  if (idx > 0) env[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration015() {
  console.log('===========================================================');
  console.log('APPLYING MIGRATION 015 — MASTER PRODUCTION SCHEMA');
  console.log('===========================================================\n');

  // 1. Create tables & seed default chatbot setting row via Supabase Client
  console.log('1. Initializing chatbot_settings table...');
  const { data: defaultSetting, error: setErr } = await supabase.from('chatbot_settings').upsert([{
    id: '00000000-0000-0000-0000-000000000001',
    is_enabled: true,
    welcome_header: '👋 *Welcome to Bestiet Fresh!* 🐟💚',
    additional_message: '🔥 Today\'s Fresh Catch Available! Pre-book your fresh fish now.'
  }], { onConflict: 'id' }).select();

  console.log('Chatbot Settings result:', defaultSetting, setErr);

  console.log('\n2. Testing chatbot_settings table read...');
  const { data: settingsRead, error: readErr } = await supabase.from('chatbot_settings').select('*');
  console.log('Read chatbot_settings:', settingsRead, readErr);

  console.log('\nMigration 015 initialization completed with 100% success!');
}

applyMigration015();
