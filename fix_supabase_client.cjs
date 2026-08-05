const fs = require('fs');

let c = fs.readFileSync('src/lib/supabase.ts', 'utf8');

c = c.replace(/export const getSupabase = \(\): SupabaseClient \| null => createActiveSupabaseClient\(\);/,
`let activeSupabaseClient: SupabaseClient | null = null;
export const getSupabase = (): SupabaseClient | null => {
  if (!activeSupabaseClient) {
    activeSupabaseClient = createActiveSupabaseClient();
  }
  return activeSupabaseClient;
};`);

fs.writeFileSync('src/lib/supabase.ts', c);
