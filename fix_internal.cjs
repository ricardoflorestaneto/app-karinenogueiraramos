const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

// The file still uses `supabase` inside `setCustomSupabaseCredentials` and `fetchSupabaseData`
content = content.replace(/supabase = createActiveSupabaseClient\(\);/, '');
content = content.replace(/if \(\!supabase\) return null;/, 'const supabase = getSupabase();\n  if (!supabase) return null;');
content = content.replace(/export function getSupabaseCredentials/, 'export function getSupabaseCredentials');

fs.writeFileSync('src/lib/supabase.ts', content, 'utf8');
