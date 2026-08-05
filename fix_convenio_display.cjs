const fs = require('fs');
let c = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');
c = c.replace(/Convênio: \{app\.convenioName \|\| 'Particular'\}/g, "Convênio: {app.convenioName || (app.convenioId ? conveniosList.find(c => c.codigo === app.convenioId)?.nome : '') || 'Particular'}");
fs.writeFileSync('src/components/AppointmentsView.tsx', c);
