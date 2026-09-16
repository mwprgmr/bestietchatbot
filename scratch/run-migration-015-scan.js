const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/015_master_production_schema.sql'), 'utf8');

const pass = 'BestietFresh2026!';
const ref = 'rhqoonbhwsffwojvndnb';

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'ca-central-1',
  'me-south-1'
];

async function scanAndMigrate() {
  console.log('Scanning all Supabase AWS regions for project reference', ref);

  for (const r of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${r}.pooler.supabase.com`;
      const connStr = `postgres://postgres.${ref}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
      try {
        console.log(`Trying ${r}:${port}...`);
        const client = new Client({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 4000
        });
        await client.connect();
        console.log(`🎉🎉 SUCCESSFUL POOLER CONNECTION! Region=${r}, Port=${port}`);
        await client.query(sql);
        console.log('✅ MIGRATION 015 EXECUTED SUCCESSFULLY ON SUPABASE DATABASE!');
        await client.end();
        process.exit(0);
      } catch (e) {
        if (!e.message.includes('ENOTFOUND') && !e.message.includes('getaddrinfo') && !e.message.includes('not found')) {
          console.log(`Region ${r}:${port} message:`, e.message);
        }
      }
    }
  }
  console.log('Done scanning all regions.');
}

scanAndMigrate();
