const { Client } = require('pg');

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
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'ca-central-1'
];

async function scanAndInspect() {
  console.log('Scanning Supabase pooler regions to inspect RPC definitions...');

  for (const r of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${r}.pooler.supabase.com`;
      const connStr = `postgres://postgres.${ref}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
      try {
        const client = new Client({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        });
        await client.connect();
        console.log(`🎉 SUCCESSFUL POOLER CONNECTION! Region=${r}, Port=${port}`);

        const res = await client.query(`
          SELECT proname, prosrc, pg_get_functiondef(oid) as funcdef
          FROM pg_proc 
          WHERE proname IN ('get_store_business_settings', 'update_store_business_settings');
        `);

        res.rows.forEach(row => {
          console.log(`\n========================================`);
          console.log(`=== FUNCTION: ${row.proname} ===`);
          console.log(`========================================\n`);
          console.log(row.funcdef);
        });

        await client.end();
        process.exit(0);
      } catch (e) {
        if (!e.message.includes('ENOTFOUND') && !e.message.includes('getaddrinfo') && !e.message.includes('not found') && !e.message.includes('timeout')) {
          console.log(`Region ${r}:${port} message:`, e.message);
        }
      }
    }
  }
  console.log('Done scanning.');
}

scanAndInspect();
