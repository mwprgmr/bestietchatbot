const dns = require('dns')
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const pass = 'BestietFresh2026!'
const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/017_super_admin_users_table.sql'), 'utf8')

async function runMigration() {
  const targets = [
    { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: 'postgres.rhqoonbhwsffwojvndnb' },
    { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 5432, user: 'postgres.rhqoonbhwsffwojvndnb' },
    { host: 'db.rhqoonbhwsffwojvndnb.supabase.co', port: 5432, user: 'postgres' }
  ]

  for (const t of targets) {
    console.log(`Connecting to ${t.host}:${t.port} as ${t.user}...`)
    try {
      const addrs = await new Promise((res) => dns.resolve4(t.host, (err, a) => res(a || [])))
      const hostOrIp = addrs.length > 0 ? addrs[0] : t.host
      const client = new Client({
        host: hostOrIp,
        port: t.port,
        user: t.user,
        password: pass,
        database: 'postgres',
        ssl: { rejectUnauthorized: false, servername: t.host },
        connectionTimeoutMillis: 5000
      })

      await client.connect()
      console.log('🎉 DIRECT PG CONNECTION SUCCESSFUL!')
      await client.query(sql)
      console.log('✅ MIGRATION 017 EXECUTED SUCCESSFULLY ON SUPABASE!')
      await client.end()
      return
    } catch (err) {
      console.log(`Failed ${t.host}:${t.port}: ${err.message}`)
    }
  }
}

runMigration()
