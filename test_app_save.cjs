const fs = require('fs');
let c = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');
c = c.replace(/if \(!patientObj\) return;/, 'if (!patientObj) {\n        console.error("Patient not found", selectedPatientId);\n        alert("Patient not found: " + selectedPatientId);\n        return;\n      }');
fs.writeFileSync('src/components/AppointmentsView.tsx', c);
