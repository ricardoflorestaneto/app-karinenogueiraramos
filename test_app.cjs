const fs = require('fs');
let c = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');
c = c.replace(/onAddAppointment\(appData\);/, 'console.log("Adding:", appData); onAddAppointment(appData);');
fs.writeFileSync('src/components/AppointmentsView.tsx', c);
