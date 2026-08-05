const fs = require('fs');

let content = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// Add props
content = content.replace(
  /onViewPatientRecord: \(patientId: string\) => void;\n}/,
  "onViewPatientRecord: (patientId: string) => void;\n  initialNewAppointmentPatient?: import('../types').Patient | null;\n  onCloseNewAppointment?: () => void;\n}"
);

content = content.replace(
  /onViewPatientRecord,\n}\) => {/,
  "onViewPatientRecord,\n  initialNewAppointmentPatient,\n  onCloseNewAppointment,\n}) => {"
);

// Add useEffect
content = content.replace(
  /const \[selectedDate, setSelectedDate\] = useState/,
  "const handleCloseModal = () => {\n    setShowModal(false);\n    setEditingAppointment(null);\n    if (onCloseNewAppointment) {\n      onCloseNewAppointment();\n    }\n  };\n\n  import('react').then(({ useEffect }) => {\n    // dynamic import is weird, let's just insert it properly\n  });\n  const [selectedDate, setSelectedDate] = useState"
);

fs.writeFileSync('src/components/AppointmentsView.tsx', content, 'utf8');
