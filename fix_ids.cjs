const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(/const newId = \`pat-\$\{Date\.now\(\)\}\`;/, "const newId = crypto.randomUUID();");
c = c.replace(/const id = \`app-\$\{Date\.now\(\)\}\`;/, "const id = crypto.randomUUID();");
c = c.replace(/const id = \`rec-\$\{Date\.now\(\)\}\`;/, "const id = crypto.randomUUID();");
fs.writeFileSync('src/App.tsx', c);

let d = fs.readFileSync('src/lib/supabase.ts', 'utf8');
d = d.replace(/convenio_id: app\.convenioId,/g, "convenio_id: app.convenioId ?? null,");
d = d.replace(/value: app\.value,/g, "value: app.value ?? null,");
d = d.replace(/notes: app\.notes,/g, "notes: app.notes ?? null,");
fs.writeFileSync('src/lib/supabase.ts', d);
