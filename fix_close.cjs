const fs = require('fs');

// Fix AppointmentsView.tsx
let c = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

c = c.replace(/onCloseNewAppointment\?: \(\) => void;/, 'onCloseNewAppointment?: (saved: boolean) => void;');

c = c.replace(/const handleCloseModal = \(\) => \{\n    setShowModal\(false\);\n    setEditingAppointment\(null\);\n    if \(onCloseNewAppointment\) \{\n      onCloseNewAppointment\(\);\n    \}\n  \};/, 
`const handleCloseModal = (saved: boolean = false) => {
    setShowModal(false);
    setEditingAppointment(null);
    if (onCloseNewAppointment) {
      onCloseNewAppointment(saved);
    }
  };`);

c = c.replace(/handleCloseModal\(\);\n  \};\n\n  const handleConfirmDelete = \(\) => \{/, 
`handleCloseModal(true);\n  };\n\n  const handleConfirmDelete = () => {`);

c = c.replace(/onClick=\{handleCloseModal\}/g, 'onClick={() => handleCloseModal(false)}');

fs.writeFileSync('src/components/AppointmentsView.tsx', c);

// Fix App.tsx
let appC = fs.readFileSync('src/App.tsx', 'utf8');
appC = appC.replace(/onCloseNewAppointment=\{.*?\}\}/s, 
`onCloseNewAppointment={(saved) => {
                if (newAppointmentPatient) {
                  setNewAppointmentPatient(null);
                  if (!saved) {
                    setActiveTab(previousTab);
                  }
                }
              }}`);

fs.writeFileSync('src/App.tsx', appC);
