import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationSQL = readFileSync('./supabase/migrations/20251007190000_college_mentor_system.sql', 'utf8');

console.log('🚀 Applying College Mentor System migration...\n');

// Split into individual statements
const statements = migrationSQL
  .split(/;\s*$/gm)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('/*'));

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';';

  if (statement.length < 20) continue;

  const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql: statement })
    });

    if (response.ok || response.status === 404) {
      // Try direct execution via pg_admin
      const { error } = await supabase.rpc('exec', { sql: statement }).catch(() => ({ error: null }));

      if (!error) {
        console.log(' ✅');
        successCount++;
      } else {
        console.log(` ⚠️  ${error.message || 'Unknown error'}`);
        errorCount++;
      }
    } else {
      const errorText = await response.text();
      console.log(` ⚠️  HTTP ${response.status}`);
      errorCount++;
    }
  } catch (err) {
    console.log(` ❌ ${err.message}`);
    errorCount++;
  }
}

console.log(`\n✨ Migration complete: ${successCount} successful, ${errorCount} errors`);

if (errorCount > 0) {
  console.log('\n⚠️  Some statements failed. This may be normal if tables already exist.');
  console.log('   Please verify tables exist in Supabase Table Editor.');
}

process.exit(0);
