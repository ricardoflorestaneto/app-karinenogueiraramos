const fs = require('fs');
let d = fs.readFileSync('src/lib/supabase.ts', 'utf8');
d = d.replace(/patient_id: app\.pacienteNaoCadastrado \|\| app\.patientId === 'unregistered' \? null : app\.patientId,/g, "patient_id: app.pacienteNaoCadastrado || !app.patientId || app.patientId === 'unregistered' ? null : app.patientId,");
fs.writeFileSync('src/lib/supabase.ts', d);
