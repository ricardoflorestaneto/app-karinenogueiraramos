const fs = require('fs');
let d = fs.readFileSync('src/lib/supabase.ts', 'utf8');
d = d.replace(/convenio_id: app\.convenioId \?\? null,/g, "convenio_id: app.convenioId ?? null,\n    convenio_name: app.convenioName ?? null,");
fs.writeFileSync('src/lib/supabase.ts', d);
