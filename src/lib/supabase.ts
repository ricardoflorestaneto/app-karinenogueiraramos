import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Patient, Appointment, ClinicalRecordEntry, DoctorProfile } from '../types';
import { DEFAULT_DOCTOR_PHOTO_URL } from '../mockData';

const env = (import.meta as any).env || {};

export interface SupabaseErrorEventDetail {
  operation: string;
  error: any;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  timestamp: string;
}

// Centralized error notification dispatcher
export function notifySupabaseDatabaseError(operation: string, error: any) {
  const techDetails: SupabaseErrorEventDetail = {
    operation,
    error,
    message: error?.message || (typeof error === 'string' ? error : 'Erro desconhecido na comunicação com o banco de dados Supabase'),
    code: error?.code || 'N/A',
    details: error?.details || error?.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error)),
    timestamp: new Date().toISOString(),
  };

  console.error(`[SUPABASE DB ERROR - ${operation}]:`, error);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<SupabaseErrorEventDetail>('supabase-database-error', {
        detail: techDetails,
      })
    );
  }
}

// Utility wrapper to execute and validate any Supabase call
export async function executeSupabaseOperation<T>(
  operationName: string,
  operationFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ success: boolean; data: T | null; error: any }> {
  try {
    const res = await operationFn();
    if (res.error) {
      notifySupabaseDatabaseError(operationName, res.error);
      return { success: false, data: null, error: res.error };
    }
    return { success: true, data: res.data, error: null };
  } catch (err: any) {
    notifySupabaseDatabaseError(operationName, err);
    return { success: false, data: null, error: err };
  }
}

export function getSupabaseCredentials() {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : '';
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_key') : '';

  const url = customUrl || env.VITE_SUPABASE_URL || '';
  const key = customKey || env.VITE_SUPABASE_ANON_KEY || '';
  const isCustom = Boolean(customUrl && customKey);
  const isConfigured = Boolean(url && key && !url.includes('your-project'));

  return { url, key, isConfigured, isCustom, customUrl, customKey };
}

export function createActiveSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      return createClient(url, key);
    } catch (e) {
      console.error('Error initializing Supabase client:', e);
      return null;
    }
  }
  return null;
}

export let supabase: SupabaseClient | null = createActiveSupabaseClient();
export const isSupabaseConfigured = Boolean(getSupabaseCredentials().isConfigured);

export function setCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url.trim() && key.trim()) {
      localStorage.setItem('custom_supabase_url', url.trim());
      localStorage.setItem('custom_supabase_key', key.trim());
    } else {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_key');
    }
    supabase = createActiveSupabaseClient();
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url || !key) {
    return { success: false, message: 'URL e Chave Anônima são obrigatórias.' };
  }
  try {
    const tempClient = createClient(url.trim(), key.trim());
    const { error } = await tempClient.from('patients').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // Even if table doesn't exist, if auth succeeds it's connected
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return { success: true, message: 'Conexão estabelecida! (Nota: Execute as migrations para criar as tabelas)' };
      }
      return { success: false, message: `Erro na resposta do Supabase: ${error.message}` };
    }
    return { success: true, message: 'Conexão com o Supabase efetuada com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Falha ao conectar: ${err.message || 'Verifique a URL e a Chave'}` };
  }
}

// Convert snake_case Supabase Patient DB model to camelCase TypeScript model
export function mapPatientFromDb(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    rg: row.rg || '',
    birthDate: row.birth_date || '',
    age: row.age || 0,
    socialName: row.social_name || '',
    gender: row.gender || 'Feminino',
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email || '',
    instagram: row.instagram || '',
    facebook: row.facebook || '',
    address: row.address || '',
    cep: row.cep || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    registrationDate: row.registration_date || '',
    maritalStatus: row.marital_status || '',
    active: row.active ?? true,
    notes: row.notes || '',
    lastVisit: row.last_visit || '',
    avatarUrl: row.avatar_url,
    initials: row.initials || row.name?.slice(0, 2).toUpperCase() || 'PA',
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    medicalHistory: Array.isArray(row.medical_history) ? row.medical_history : [],
    convenioId: row.convenio_id,
    convenioName: row.convenio_name || (row.convenios ? row.convenios.nome : ''),
  };
}

// Convert camelCase Patient to DB row
export function mapPatientToDb(patient: Patient): any {
  return {
    id: patient.id,
    name: patient.name,
    cpf: patient.cpf,
    rg: patient.rg,
    birth_date: patient.birthDate,
    age: patient.age,
    social_name: patient.socialName,
    gender: patient.gender,
    phone: patient.phone,
    whatsapp: patient.whatsapp,
    email: patient.email,
    instagram: patient.instagram,
    facebook: patient.facebook,
    address: patient.address,
    cep: patient.cep,
    complement: patient.complement,
    neighborhood: patient.neighborhood,
    city: patient.city,
    state: patient.state,
    registration_date: patient.registrationDate,
    marital_status: patient.maritalStatus,
    active: patient.active,
    notes: patient.notes,
    last_visit: patient.lastVisit,
    avatar_url: patient.avatarUrl,
    initials: patient.initials,
    allergies: patient.allergies || [],
    medical_history: patient.medicalHistory || [],
    convenio_id: patient.convenioId,
  };
}

// Map Appointment
export function mapAppointmentFromDb(row: any): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes || 45,
    procedure: row.procedure,
    status: row.status,
    notes: row.notes,
    value: Number(row.value || 0),
    convenioId: row.convenio_id,
    convenioName: row.convenio_name || (row.convenios ? row.convenios.nome : ''),
    pacienteNaoCadastrado: Boolean(row.paciente_nao_cadastrado),
    nomePacienteNaoCadastrado: row.nome_paciente_nao_cadastrado || '',
    telefonePacienteNaoCadastrado: row.telefone_paciente_nao_cadastrado || '',
  };
}

export function mapAppointmentToDb(app: Appointment): any {
  return {
    id: app.id,
    patient_id: app.pacienteNaoCadastrado || app.patientId === 'unregistered' ? null : app.patientId,
    patient_name: app.patientName,
    patient_phone: app.patientPhone,
    date: app.date,
    time: app.time,
    duration_minutes: app.durationMinutes,
    procedure: app.procedure,
    status: app.status,
    notes: app.notes,
    value: app.value,
    convenio_id: app.convenioId,
    paciente_nao_cadastrado: app.pacienteNaoCadastrado ?? false,
    nome_paciente_nao_cadastrado: app.nomePacienteNaoCadastrado || null,
    telefone_paciente_nao_cadastrado: app.telefonePacienteNaoCadastrado || null,
  };
}

// Map Clinical Record
export function mapClinicalRecordFromDb(row: any): ClinicalRecordEntry {
  return {
    id: row.id,
    patientId: row.patient_id,
    date: row.date,
    dentistName: row.dentist_name,
    procedureDone: row.procedure_done,
    toothNumber: row.tooth_number,
    clinicalNotes: row.clinical_notes,
    prescriptions: Array.isArray(row.prescriptions) ? row.prescriptions : [],
    cost: Number(row.cost || 0),
  };
}

export function mapClinicalRecordToDb(rec: ClinicalRecordEntry): any {
  return {
    id: rec.id,
    patient_id: rec.patientId,
    date: rec.date,
    dentist_name: rec.dentistName,
    procedure_done: rec.procedureDone,
    tooth_number: rec.toothNumber,
    clinical_notes: rec.clinicalNotes,
    prescriptions: rec.prescriptions || [],
    cost: rec.cost,
  };
}

export function getSupabaseBucketPhotoUrl(bucketName: string = 'fotodrakarine', fileName: string = 'karineweb.jpg'): string {
  const { url, isConfigured } = getSupabaseCredentials();
  if (url && isConfigured) {
    const cleanUrl = url.replace(/\/$/, '');
    return `${cleanUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
  }
  return '';
}

// Fetch all data from Supabase if configured
export async function fetchSupabaseData() {
  if (!supabase) return null;

  try {
    const [patientsRes, appointmentsRes, recordsRes, doctorRes] = await Promise.all([
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('created_at', { ascending: false }),
      supabase.from('clinical_records').select('*').order('created_at', { ascending: false }),
      supabase.from('doctor_profile').select('*').eq('id', 'main_doctor').single(),
    ]);

    if (patientsRes.error && patientsRes.error.code !== 'PGRST116') {
      notifySupabaseDatabaseError('Consulta de Pacientes (patients)', patientsRes.error);
    }
    if (appointmentsRes.error && appointmentsRes.error.code !== 'PGRST116') {
      notifySupabaseDatabaseError('Consulta de Agendamentos (appointments)', appointmentsRes.error);
    }
    if (recordsRes.error && recordsRes.error.code !== 'PGRST116') {
      notifySupabaseDatabaseError('Consulta de Prontuários (clinical_records)', recordsRes.error);
    }
    if (doctorRes.error && doctorRes.error.code !== 'PGRST116' && !doctorRes.error.message?.includes('0 rows')) {
      notifySupabaseDatabaseError('Consulta de Perfil Médico (doctor_profile)', doctorRes.error);
    }

    const doctorPhotoUrl = doctorRes.data?.profile_picture_url || doctorRes.data?.avatar_url || DEFAULT_DOCTOR_PHOTO_URL;

    return {
      patients: patientsRes.data ? patientsRes.data.map(mapPatientFromDb) : null,
      appointments: appointmentsRes.data ? appointmentsRes.data.map(mapAppointmentFromDb) : null,
      records: recordsRes.data ? recordsRes.data.map(mapClinicalRecordFromDb) : null,
      doctor: doctorRes.data
        ? ({
            name: doctorRes.data.name,
            role: doctorRes.data.role,
            cro: doctorRes.data.cro,
            email: doctorRes.data.email,
            phone: doctorRes.data.phone,
            clinicName: doctorRes.data.clinic_name,
            avatarUrl: doctorPhotoUrl,
            profile_picture_url: doctorPhotoUrl,
            address: doctorRes.data.address || '',
            cep: doctorRes.data.cep || '',
            complement: doctorRes.data.complement || '',
            neighborhood: doctorRes.data.neighborhood || '',
            city: doctorRes.data.city || '',
            state: doctorRes.data.state || '',
          } as DoctorProfile)
        : null,
    };
  } catch (err) {
    notifySupabaseDatabaseError('Carga Inicial dos Dados do Sistema', err);
    return null;
  }
}
