const fs = require('fs');
let c = fs.readFileSync('src/lib/supabase.ts', 'utf8');
c = c.replace(/console\.error\(\`\\[SUPABASE DB ERROR - \$\{operation\}\\]:\`, error\);/, 
  "console.error(`[SUPABASE DB ERROR - ${operation}]:`, error);\n  if (typeof window !== 'undefined') window.alert(`DB Error [${operation}]: ${techDetails.message} | Code: ${techDetails.code} | Details: ${techDetails.details}`);");
fs.writeFileSync('src/lib/supabase.ts', c);
