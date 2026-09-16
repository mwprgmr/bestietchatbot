const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testAllRegions() {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/015_master_production_schema.sql'), 'utf8');

  const regions = [
    'ap-south-1',
    'us-east-1',
    'us-west-1',
    'eu-central-1',
    'ap-southeast-1',
    'ap-northeast-1',
    'sa-east-1'
  ];

  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    console.log(`Trying ${host}...`);
    const client = new Client({
      host,
      port: 6543,
      user: 'postgres.rhqoonbhwsffwojvndnb',
      password: 'BestietFresh2026!',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`🎉 CONNECTED TO POOLER IN ${r}! Executing migration 015...`);
      await client.query(sql);
      console.log('✅ Migration 015 executed successfully!');
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed ${r}:`, err.message);
    }
  }
}

testAllRegions();
