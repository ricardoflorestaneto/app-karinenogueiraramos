const fs = require('fs');
let d = fs.readFileSync('src/lib/supabase.ts', 'utf8');
d = d.replace(/tooth_number: rec\.toothNumber,/g, "tooth_number: rec.toothNumber ?? null,");
d = d.replace(/cost: rec\.cost,/g, "cost: rec.cost ?? null,");
fs.writeFileSync('src/lib/supabase.ts', d);
