const fs = require('fs');

const appData = {
  id: 'app-123',
  patientId: 'pat-123',
  patientName: 'Test',
  patientPhone: '12345',
  date: '2026-08-01',
  time: '10:00',
  durationMinutes: 45,
  procedure: 'Consulta',
  status: 'Confirmado',
  notes: '',
  value: 100,
  convenioId: undefined,
  convenioName: '',
  pacienteNaoCadastrado: false,
};

let d = fs.readFileSync('src/lib/supabase.ts', 'utf8');
const mapFnCode = d.match(/export function mapAppointmentToDb[\s\S]*?^}/m)[0];
// Evaluate the function
const evalCode = `
${mapFnCode.replace('export ', '')}
console.log(mapAppointmentToDb(${JSON.stringify(appData)}));
`;
eval(evalCode);

