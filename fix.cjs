const fs = require('fs');
let c = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');
c = c.replace(/useEffect\(\(\) => \{\n    if \(initialNewAppointmentPatient\) \{\n      handleOpenNewModal\(\);\n      setSelectedPatientId\(initialNewAppointmentPatient\.id\);\n    \}\n  \}, \[initialNewAppointmentPatient\]\);/, 
`useEffect(() => {
    if (initialNewAppointmentPatient) {
      handleOpenNewModal();
      setSelectedPatientId(initialNewAppointmentPatient.id);
      if (initialNewAppointmentPatient.convenioId) {
        setConvenioId(initialNewAppointmentPatient.convenioId);
      }
    }
  }, [initialNewAppointmentPatient]);`);
fs.writeFileSync('src/components/AppointmentsView.tsx', c);
