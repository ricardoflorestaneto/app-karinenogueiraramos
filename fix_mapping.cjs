const fs = require('fs');
let c = fs.readFileSync('src/lib/supabase.ts', 'utf8');

const fromRegex = /export function mapAppointmentFromDb[\s\S]*?^}/m;
c = c.replace(fromRegex, `export function mapAppointmentFromDb(row: any): Appointment {
  const isUnreg = !row.patient_id;
  return {
    id: row.id,
    patientId: row.patient_id || 'unregistered',
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes || 45,
    procedure: row.procedure,
    status: row.status,
    notes: row.notes || '',
    value: Number(row.value || 0),
    convenioId: row.convenio_id,
    convenioName: '',
    pacienteNaoCadastrado: isUnreg,
    nomePacienteNaoCadastrado: isUnreg ? row.patient_name : '',
    telefonePacienteNaoCadastrado: isUnreg ? row.patient_phone : '',
  };
}`);

const toRegex = /export function mapAppointmentToDb[\s\S]*?^}/m;
c = c.replace(toRegex, `export function mapAppointmentToDb(app: Appointment): any {
  const isUnreg = app.pacienteNaoCadastrado || !app.patientId || app.patientId === 'unregistered';
  let finalNotes = app.notes || '';
  if (isUnreg && !finalNotes.includes('[Paciente Não Cadastrado]')) {
    finalNotes = finalNotes ? \`\${finalNotes}\\n\\n[Paciente Não Cadastrado]\` : '[Paciente Não Cadastrado]';
  }
  return {
    id: app.id,
    patient_id: isUnreg ? null : app.patientId,
    patient_name: app.patientName,
    patient_phone: app.patientPhone,
    date: app.date,
    time: app.time,
    duration_minutes: app.durationMinutes,
    procedure: app.procedure,
    status: app.status,
    notes: finalNotes || null,
    value: app.value ?? 0,
    convenio_id: app.convenioId ?? null,
  };
}`);

fs.writeFileSync('src/lib/supabase.ts', c);
