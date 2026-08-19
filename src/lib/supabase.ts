import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Patient, Appointment, ClinicalRecordEntry, DoctorProfile } from '../types';
import { DEFAULT_DOCTOR_PHOTO_URL } from '../mockData';

const env = (import.meta as any).env || {};

export const DEFAULT_SUPABASE_URL = 'https://ddbxpcplqsgtishpofff.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_V9EEuOywF53WfsJR0iBBMw_POH3bzHo';

export interface DatabaseConnectionInfo {
  mode: 'database' | 'local';
  label: string;
  source: 'env' | 'custom' | 'default' | 'local_storage';
  sourceLabel: string;
  url: string;
  maskedKey: string;
  isOnline: boolean;
  statusText: string;
  lastChecked?: string;
  error?: string;
}

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
  alert(`DB Error [${operation}]: ${techDetails.message} | Code: ${techDetails.code} | Details: ${techDetails.details}`);

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
  const customUrl = typeof window !== 'undefined' ? (localStorage.getItem('custom_supabase_url') || '').trim() : '';
  const customKey = typeof window !== 'undefined' ? (localStorage.getItem('custom_supabase_key') || '').trim() : '';

  // 1ª PRIORIDADE ABSOLUTA: Variáveis de ambiente (.env)
  const envUrl = (env.VITE_SUPABASE_URL || '').trim();
  const envKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

  // Verifica se o .env possui dados válidos e não placeholders
  const isEnvValid = Boolean(envUrl && envKey && !envUrl.includes('your-project') && !envKey.includes('your-anon-key'));

  let url = '';
  let key = '';
  let isCustom = false;

  if (isEnvValid) {
    // Sempre prioriza 100% o que estiver no .env
    url = envUrl;
    key = envKey;
    isCustom = false;
  } else if (customUrl && customKey && !customUrl.includes('your-project')) {
    // 2ª Prioridade: Configuração manual informada no navegador
    url = customUrl;
    key = customKey;
    isCustom = true;
  } else {
    // Fallback padrão se não houver .env nem custom
    url = DEFAULT_SUPABASE_URL;
    key = DEFAULT_SUPABASE_KEY;
    isCustom = false;
  }

  const isConfigured = Boolean(url && key && !url.includes('your-project'));

  return { url, key, isConfigured, isCustom, customUrl, customKey, envUrl, envKey };
}

export function createActiveSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      return createClient(url, key, {
        auth: {
          persistSession: false,
        },
        global: {
          fetch: (...args) => {
            const [input, init] = args;
            return fetch(input, {
              ...init,
              cache: 'no-store',
            });
          },
        },
      });
    } catch (e) {
      console.error('Error initializing Supabase client:', e);
      return null;
    }
  }
  return null;
}

let activeSupabaseClient: SupabaseClient | null = null;
export const getSupabase = (): SupabaseClient | null => {
  if (!activeSupabaseClient) {
    activeSupabaseClient = createActiveSupabaseClient();
  }
  return activeSupabaseClient;
};
export const getIsSupabaseConfigured = () => Boolean(getSupabaseCredentials().isConfigured);

export function getCurrentConnectionInfo(): DatabaseConnectionInfo {
  const creds = getSupabaseCredentials();
  const isOnline = creds.isConfigured;
  let source: DatabaseConnectionInfo['source'] = 'default';
  let sourceLabel = 'Padrão do Sistema';

  if (creds.envUrl && !creds.envUrl.includes('your-project') && !creds.isCustom) {
    source = 'env';
    sourceLabel = 'Arquivo .env (Servidor)';
  } else if (creds.isCustom) {
    source = 'custom';
    sourceLabel = 'Personalizado (Navegador)';
  } else if (!isOnline) {
    source = 'local_storage';
    sourceLabel = 'Armazenamento Local (Offline)';
  }

  const maskedKey = creds.key && creds.key.length > 12
    ? `${creds.key.substring(0, 10)}...${creds.key.substring(creds.key.length - 4)}`
    : (creds.key ? '••••••••' : 'Não definida');

  return {
    mode: isOnline ? 'database' : 'local',
    label: isOnline ? 'Banco de Dados (Supabase)' : 'Armazenamento Local (Offline)',
    source,
    sourceLabel,
    url: creds.url || 'Não configurado',
    maskedKey,
    isOnline,
    statusText: isOnline ? 'Conectado à Nuvem' : 'Operando Localmente (Offline)',
    lastChecked: typeof window !== 'undefined' ? new Date().toLocaleTimeString('pt-BR') : undefined,
  };
}

export async function pingSupabaseDatabase(): Promise<{
  online: boolean;
  latencyMs: number;
  message: string;
  source: string;
}> {
  const startTime = Date.now();
  const supabase = getSupabase();
  const info = getCurrentConnectionInfo();

  if (!supabase || !info.isOnline) {
    return {
      online: false,
      latencyMs: 0,
      message: 'Modo Local Ativo: Sem banco de dados em nuvem configurado.',
      source: info.sourceLabel,
    };
  }

  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    const latencyMs = Date.now() - startTime;
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation')) {
      return {
        online: false,
        latencyMs,
        message: `Falha na resposta do banco: ${error.message}`,
        source: info.sourceLabel,
      };
    }
    return {
      online: true,
      latencyMs,
      message: 'Conexão com o Supabase ativa e respondendo em tempo real.',
      source: info.sourceLabel,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      online: false,
      latencyMs,
      message: `Erro de rede ao comunicar com Supabase: ${err.message || err}`,
      source: info.sourceLabel,
    };
  }
}

export function setCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url.trim() && key.trim()) {
      localStorage.setItem('custom_supabase_url', url.trim());
      localStorage.setItem('custom_supabase_key', key.trim());
    } else {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_key');
    }
    
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

export const FUTURE_DATE_ERROR_MESSAGE = 'A data informada não pode ser maior que a data atual.';

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando o fuso horário local.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida se uma string de data representa uma data futura no calendário local.
 * Retorna true se a data for estritamente posterior a hoje.
 */
export function isFutureDate(dateStr?: string | null, referenceDate: Date = new Date()): boolean {
  if (!dateStr || !dateStr.trim()) return false;

  const cleanDateStr = dateStr.trim().split('T')[0];
  let year = NaN;
  let month = NaN;
  let day = NaN;

  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    }
  } else if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  if (year === currentYear && month === currentMonth && day > currentDay) return true;

  return false;
}

/**
 * Validação de data: garante que a data informada não seja maior que a data atual.
 */
export function validateDateNotFuture(dateStr?: string | null): { isValid: boolean; error?: string } {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: true };
  }
  if (isFutureDate(dateStr)) {
    return { isValid: false, error: FUTURE_DATE_ERROR_MESSAGE };
  }
  return { isValid: true };
}

// Convert camelCase Patient to DB row
export function mapPatientToDb(patient: Patient): any {
  if (patient.birthDate && isFutureDate(patient.birthDate)) {
    throw new Error(FUTURE_DATE_ERROR_MESSAGE);
  }
  if (patient.registrationDate && isFutureDate(patient.registrationDate)) {
    throw new Error(FUTURE_DATE_ERROR_MESSAGE);
  }
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
}

export function mapAppointmentToDb(app: Appointment): any {
  const isUnreg = app.pacienteNaoCadastrado || !app.patientId || app.patientId === 'unregistered';
  let finalNotes = app.notes || '';
  if (isUnreg && !finalNotes.includes('[Paciente Não Cadastrado]')) {
    finalNotes = finalNotes ? `${finalNotes}\n\n[Paciente Não Cadastrado]` : '[Paciente Não Cadastrado]';
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
    tooth_number: rec.toothNumber ?? null,
    clinical_notes: rec.clinicalNotes,
    prescriptions: rec.prescriptions || [],
    cost: rec.cost ?? null,
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
  const supabase = getSupabase();
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

/**
 * Consulta a contagem total de pacientes cadastrados diretamente no banco de dados Supabase.
 * Executa uma consulta SQL exata equivalente a: SELECT COUNT(*) FROM patients;
 */
export async function fetchTotalPatientsCount(): Promise<{
  success: boolean;
  count: number;
  error: any | null;
  isFromSupabase: boolean;
}> {
  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      count: 0,
      error: null,
      isFromSupabase: false,
    };
  }

  try {
    // Consulta exata utilizando GET com count exact e limit(1) para evitar bloqueios CORS de requisições HEAD em navegadores
    const { count, error } = await supabase
      .from('patients')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      console.warn('[fetchTotalPatientsCount] Erro ao consultar contagem no Supabase:', error);
      return {
        success: false,
        count: 0,
        error,
        isFromSupabase: true,
      };
    }

    return {
      success: true,
      count: typeof count === 'number' ? count : 0,
      error: null,
      isFromSupabase: true,
    };
  } catch (err: any) {
    console.warn('[fetchTotalPatientsCount] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      count: 0,
      error: err,
      isFromSupabase: true,
    };
  }
}

/**
 * Consulta a contagem de pacientes cadastrados no mês atual diretamente no banco de dados Supabase.
 * Executa uma consulta SQL equivalente a:
 * SELECT COUNT(*) FROM patients WHERE registration_date >= início_do_mês_atual AND registration_date < início_do_próximo_mês;
 */
export async function fetchMonthlyPatientsCount(): Promise<{
  success: boolean;
  count: number;
  error: any | null;
  isFromSupabase: boolean;
  monthLabel: string;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 - 11

  // Início do mês atual: YYYY-MM-01
  const startOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  // Início do próximo mês: YYYY-MM-01
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonthYear = nextMonthDate.getFullYear();
  const nextMonthNum = nextMonthDate.getMonth() + 1;
  const startOfNextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

  // Rótulo formatado do mês de referência (ex: "Agosto de 2026")
  const rawMonthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const monthLabel = `${rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)} de ${currentYear}`;

  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      count: 0,
      error: null,
      isFromSupabase: false,
      monthLabel,
    };
  }

  try {
    const { count, error } = await supabase
      .from('patients')
      .select('id', { count: 'exact' })
      .gte('registration_date', startOfMonthStr)
      .lt('registration_date', startOfNextMonthStr)
      .limit(1);

    if (error) {
      console.warn('[fetchMonthlyPatientsCount] Erro ao consultar pacientes do mês no Supabase:', error);
      return {
        success: false,
        count: 0,
        error,
        isFromSupabase: true,
        monthLabel,
      };
    }

    return {
      success: true,
      count: typeof count === 'number' ? count : 0,
      error: null,
      isFromSupabase: true,
      monthLabel,
    };
  } catch (err: any) {
    console.warn('[fetchMonthlyPatientsCount] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      count: 0,
      error: err,
      isFromSupabase: true,
      monthLabel,
    };
  }
}

/**
 * Consulta a contagem de pacientes cadastrados no dia atual (hoje) diretamente no banco de dados Supabase.
 * Executa uma consulta SQL equivalente a:
 * SELECT COUNT(*) FROM patients WHERE registration_date >= início_do_dia_atual AND registration_date < início_do_próximo_dia;
 */
export async function fetchTodayPatientsCount(): Promise<{
  success: boolean;
  count: number;
  error: any | null;
  isFromSupabase: boolean;
  todayLabel: string;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Início do dia atual: YYYY-MM-DD
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  // Início do dia seguinte: YYYY-MM-DD
  const tomorrowDate = new Date(currentYear, currentMonth, currentDay + 1);
  const tomorrowYear = tomorrowDate.getFullYear();
  const tomorrowMonth = tomorrowDate.getMonth() + 1;
  const tomorrowDay = tomorrowDate.getDate();
  const tomorrowStr = `${tomorrowYear}-${String(tomorrowMonth).padStart(2, '0')}-${String(tomorrowDay).padStart(2, '0')}`;

  // Rótulo formatado da data de hoje (ex: "19 de agosto de 2026")
  const rawMonthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const todayLabel = `${currentDay} de ${rawMonthName} de ${currentYear}`;

  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      count: 0,
      error: null,
      isFromSupabase: false,
      todayLabel,
    };
  }

  try {
    const { count, error } = await supabase
      .from('patients')
      .select('id', { count: 'exact' })
      .gte('registration_date', todayStr)
      .lt('registration_date', tomorrowStr)
      .limit(1);

    if (error) {
      console.warn('[fetchTodayPatientsCount] Erro ao consultar pacientes de hoje no Supabase:', error);
      return {
        success: false,
        count: 0,
        error,
        isFromSupabase: true,
        todayLabel,
      };
    }

    return {
      success: true,
      count: typeof count === 'number' ? count : 0,
      error: null,
      isFromSupabase: true,
      todayLabel,
    };
  } catch (err: any) {
    console.warn('[fetchTodayPatientsCount] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      count: 0,
      error: err,
      isFromSupabase: true,
      todayLabel,
    };
  }
}

export interface MonthlyEvolutionItem {
  monthKey: string; // Ex: "2026-03"
  monthShortLabel: string; // Ex: "Mar/26"
  monthFullLabel: string; // Ex: "Março/2026"
  total: number;
  isCurrentMonth: boolean;
}

/**
 * Gera a grade com os últimos 6 meses cronológicos, incluindo o mês atual.
 */
export function generateLast6MonthsSlots(): MonthlyEvolutionItem[] {
  const slots: MonthlyEvolutionItem[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 - 11

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

    const rawShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const capitalizedShort = rawShort.charAt(0).toUpperCase() + rawShort.slice(1);
    const shortYear = String(y).slice(-2);
    const monthShortLabel = `${capitalizedShort}/${shortYear}`;

    const rawFull = d.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedFull = rawFull.charAt(0).toUpperCase() + rawFull.slice(1);
    const monthFullLabel = `${capitalizedFull}/${y}`;

    slots.push({
      monthKey,
      monthShortLabel,
      monthFullLabel,
      total: 0,
      isCurrentMonth: i === 0,
    });
  }

  return slots;
}

/**
 * Consulta a evolução de novos pacientes nos últimos 6 meses no Supabase.
 * Agrupa cronologicamente os pacientes cadastrados por mês, retornando 0 para meses sem cadastros.
 */
export async function fetchPatientsEvolution6Months(): Promise<{
  success: boolean;
  data: MonthlyEvolutionItem[];
  error: any | null;
  isFromSupabase: boolean;
}> {
  const slots = generateLast6MonthsSlots();
  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      data: slots,
      error: null,
      isFromSupabase: false,
    };
  }

  try {
    const startOfPeriod = `${slots[0].monthKey}-01`;

    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfPeriod = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('patients')
      .select('id, registration_date')
      .gte('registration_date', startOfPeriod)
      .lt('registration_date', endOfPeriod);

    if (error) {
      console.warn('[fetchPatientsEvolution6Months] Erro ao consultar evolução no Supabase:', error);
      return {
        success: false,
        data: slots,
        error,
        isFromSupabase: true,
      };
    }

    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (row.registration_date) {
          const key = String(row.registration_date).slice(0, 7);
          const targetSlot = slots.find((s) => s.monthKey === key);
          if (targetSlot) {
            targetSlot.total += 1;
          }
        }
      });
    }

    return {
      success: true,
      data: slots,
      error: null,
      isFromSupabase: true,
    };
  } catch (err: any) {
    console.warn('[fetchPatientsEvolution6Months] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      data: slots,
      error: err,
      isFromSupabase: true,
    };
  }
}

export interface AgeGroupDistributionItem {
  id: 'criancas' | 'jovens' | 'adultos' | 'idosos';
  name: string; // "Crianças", "Jovens", "Adultos", "Idosos"
  rangeLabel: string; // "0 a 11 anos", "12 a 17 anos", "18 a 59 anos", "60 anos ou mais"
  total: number;
  percentage: number;
  percentageFormatted: string;
  color: string;
}

export interface PatientsAgeDistributionResult {
  success: boolean;
  data: AgeGroupDistributionItem[];
  totalValidPatients: number;
  totalWithoutBirthDate: number;
  error: any | null;
  isFromSupabase: boolean;
}

export interface DetailedAge {
  years: number;
  months: number;
  days: number;
  formatted: string; // Ex: "34 anos, 5 meses e 12 dias"
}

/**
 * Calcula a idade completa e detalhada em Anos, Meses e Dias a partir da data de nascimento.
 */
export function calculateDetailedAge(birthDateStr: string, referenceDate: Date = new Date()): DetailedAge {
  if (!birthDateStr || !birthDateStr.trim()) {
    return { years: 0, months: 0, days: 0, formatted: '' };
  }

  const cleanDateStr = birthDateStr.trim().split('T')[0];
  let birthYear = NaN;
  let birthMonth = NaN;
  let birthDay = NaN;

  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        birthYear = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthDay = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        birthDay = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthYear = parseInt(parts[2], 10);
      }
    }
  } else if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        birthYear = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthDay = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY
        birthDay = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthYear = parseInt(parts[2], 10);
      }
    }
  }

  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) {
    const d = new Date(birthDateStr);
    if (!isNaN(d.getTime())) {
      birthYear = d.getFullYear();
      birthMonth = d.getMonth();
      birthDay = d.getDate();
    } else {
      return { years: 0, months: 0, days: 0, formatted: '' };
    }
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  if (
    birthYear > currentYear ||
    (birthYear === currentYear && birthMonth > currentMonth) ||
    (birthYear === currentYear && birthMonth === currentMonth && birthDay > currentDay)
  ) {
    return { years: 0, months: 0, days: 0, formatted: 'Data futura' };
  }

  let years = currentYear - birthYear;
  let months = currentMonth - birthMonth;
  let days = currentDay - birthDay;

  if (days < 0) {
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    years = 0;
    months = 0;
    days = 0;
  }

  const yearLabel = years === 1 ? 'ano' : 'anos';
  const monthLabel = months === 1 ? 'mês' : 'meses';
  const dayLabel = days === 1 ? 'dia' : 'dias';

  const formatted = `${years} ${yearLabel}, ${months} ${monthLabel} e ${days} ${dayLabel}`;

  return { years, months, days, formatted };
}

/**
 * Calcula a idade exata com base na data de nascimento considerando anos bissextos e aniversários.
 */
export function calculateAgeFromBirthDate(birthDateStr: string, referenceDate: Date = new Date()): number | null {
  if (!birthDateStr) return null;
  const cleanDateStr = birthDateStr.split('T')[0];
  const parts = cleanDateStr.split('-');

  if (parts.length === 3) {
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-based
    const birthDay = parseInt(parts[2], 10);

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;

    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    const currentDay = referenceDate.getDate();

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return null;
  let age = referenceDate.getFullYear() - d.getFullYear();
  const m = referenceDate.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Consulta a distribuição etária dos pacientes no Supabase.
 * Categoriza em Crianças (0-11), Jovens (12-17), Adultos (18-59) e Idosos (60+).
 */
export async function fetchPatientsAgeDistribution(): Promise<PatientsAgeDistributionResult> {
  const defaultGroups: AgeGroupDistributionItem[] = [
    { id: 'criancas', name: 'Crianças', rangeLabel: '0 a 11 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#006194' },
    { id: 'jovens', name: 'Jovens', rangeLabel: '12 a 17 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#00a389' },
    { id: 'adultos', name: 'Adultos', rangeLabel: '18 a 59 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#325da8' },
    { id: 'idosos', name: 'Idosos', rangeLabel: '60 anos ou mais', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#7b52ab' },
  ];

  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      data: defaultGroups,
      totalValidPatients: 0,
      totalWithoutBirthDate: 0,
      error: null,
      isFromSupabase: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, birth_date');

    if (error) {
      console.warn('[fetchPatientsAgeDistribution] Erro ao consultar faixas etárias no Supabase:', error);
      return {
        success: false,
        data: defaultGroups,
        totalValidPatients: 0,
        totalWithoutBirthDate: 0,
        error,
        isFromSupabase: true,
      };
    }

    let criancas = 0;
    let jovens = 0;
    let adultos = 0;
    let idosos = 0;
    let totalValid = 0;
    let totalWithoutBirthDate = 0;

    const now = new Date();

    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (!row.birth_date) {
          totalWithoutBirthDate++;
          return;
        }

        const age = calculateAgeFromBirthDate(String(row.birth_date), now);
        if (age === null) {
          totalWithoutBirthDate++;
          return;
        }

        totalValid++;
        if (age <= 11) {
          criancas++;
        } else if (age <= 17) {
          jovens++;
        } else if (age <= 59) {
          adultos++;
        } else {
          idosos++;
        }
      });
    }

    const formatPercent = (val: number, total: number) => {
      if (total === 0) return { pct: 0, formatted: '0,0%' };
      const pct = (val / total) * 100;
      return {
        pct: Number(pct.toFixed(1)),
        formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
      };
    };

    const cPct = formatPercent(criancas, totalValid);
    const jPct = formatPercent(jovens, totalValid);
    const aPct = formatPercent(adultos, totalValid);
    const iPct = formatPercent(idosos, totalValid);

    const resultData: AgeGroupDistributionItem[] = [
      { id: 'criancas', name: 'Crianças', rangeLabel: '0 a 11 anos', total: criancas, percentage: cPct.pct, percentageFormatted: cPct.formatted, color: '#006194' },
      { id: 'jovens', name: 'Jovens', rangeLabel: '12 a 17 anos', total: jovens, percentage: jPct.pct, percentageFormatted: jPct.formatted, color: '#00a389' },
      { id: 'adultos', name: 'Adultos', rangeLabel: '18 a 59 anos', total: adultos, percentage: aPct.pct, percentageFormatted: aPct.formatted, color: '#325da8' },
      { id: 'idosos', name: 'Idosos', rangeLabel: '60 anos ou mais', total: idosos, percentage: iPct.pct, percentageFormatted: iPct.formatted, color: '#7b52ab' },
    ];

    return {
      success: true,
      data: resultData,
      totalValidPatients: totalValid,
      totalWithoutBirthDate,
      error: null,
      isFromSupabase: true,
    };
  } catch (err: any) {
    console.warn('[fetchPatientsAgeDistribution] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      data: defaultGroups,
      totalValidPatients: 0,
      totalWithoutBirthDate: 0,
      error: err,
      isFromSupabase: true,
    };
  }
}

/**
 * Calcula a distribuição etária a partir dos dados locais/fallback.
 */
export function calculateLocalAgeDistribution(patients: Patient[]): PatientsAgeDistributionResult {
  let criancas = 0;
  let jovens = 0;
  let adultos = 0;
  let idosos = 0;
  let totalValid = 0;
  let totalWithoutBirthDate = 0;

  const now = new Date();

  patients.forEach((p) => {
    if (!p.birthDate) {
      totalWithoutBirthDate++;
      return;
    }
    const age = calculateAgeFromBirthDate(p.birthDate, now);
    if (age === null) {
      totalWithoutBirthDate++;
      return;
    }
    totalValid++;
    if (age <= 11) {
      criancas++;
    } else if (age <= 17) {
      jovens++;
    } else if (age <= 59) {
      adultos++;
    } else {
      idosos++;
    }
  });

  const formatPercent = (val: number, total: number) => {
    if (total === 0) return { pct: 0, formatted: '0,0%' };
    const pct = (val / total) * 100;
    return {
      pct: Number(pct.toFixed(1)),
      formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
    };
  };

  const cPct = formatPercent(criancas, totalValid);
  const jPct = formatPercent(jovens, totalValid);
  const aPct = formatPercent(adultos, totalValid);
  const iPct = formatPercent(idosos, totalValid);

  return {
    success: true,
    data: [
      { id: 'criancas', name: 'Crianças', rangeLabel: '0 a 11 anos', total: criancas, percentage: cPct.pct, percentageFormatted: cPct.formatted, color: '#006194' },
      { id: 'jovens', name: 'Jovens', rangeLabel: '12 a 17 anos', total: jovens, percentage: jPct.pct, percentageFormatted: jPct.formatted, color: '#00a389' },
      { id: 'adultos', name: 'Adultos', rangeLabel: '18 a 59 anos', total: adultos, percentage: aPct.pct, percentageFormatted: aPct.formatted, color: '#325da8' },
      { id: 'idosos', name: 'Idosos', rangeLabel: '60 anos ou mais', total: idosos, percentage: iPct.pct, percentageFormatted: iPct.formatted, color: '#7b52ab' },
    ],
    totalValidPatients: totalValid,
    totalWithoutBirthDate,
    error: null,
    isFromSupabase: false,
  };
}

// ---------------------------------------------------------------------------
// Indicador 6: Pacientes por Sexo (Proporção Estatística Feminino x Masculino)
// ---------------------------------------------------------------------------

export interface GenderDistributionItem {
  id: 'feminino' | 'masculino';
  name: string;
  total: number;
  percentage: number;
  percentageFormatted: string;
  color: string;
}

export interface PatientsGenderDistributionResult {
  success: boolean;
  data: GenderDistributionItem[];
  totalValidPatients: number;
  totalWithoutGender: number;
  error: any | null;
  isFromSupabase: boolean;
}

/**
 * Normaliza qualquer valor armazenado na coluna de sexo para 'Feminino' ou 'Masculino'.
 * Suporta códigos (F, M), maiúsculas/minúsculas, termos em inglês ou variações.
 */
export function normalizeGender(val: any): 'Feminino' | 'Masculino' | null {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().toLowerCase();
  if (['f', 'feminino', 'fem', 'female', 'mulher'].includes(clean)) {
    return 'Feminino';
  }
  if (['m', 'masculino', 'masc', 'male', 'homem'].includes(clean)) {
    return 'Masculino';
  }
  return null;
}

/**
 * Consulta a distribuição por sexo dos pacientes diretamente no Supabase.
 * Retorna contagem absoluta e percentuais para Feminino e Masculino.
 */
export async function fetchPatientsGenderDistribution(): Promise<PatientsGenderDistributionResult> {
  const defaultItems: GenderDistributionItem[] = [
    { id: 'feminino', name: 'Feminino', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#e0245e' },
    { id: 'masculino', name: 'Masculino', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#006194' },
  ];

  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      data: defaultItems,
      totalValidPatients: 0,
      totalWithoutGender: 0,
      error: null,
      isFromSupabase: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, gender');

    if (error) {
      console.warn('[fetchPatientsGenderDistribution] Erro ao consultar sexo dos pacientes no Supabase:', error);
      return {
        success: false,
        data: defaultItems,
        totalValidPatients: 0,
        totalWithoutGender: 0,
        error,
        isFromSupabase: true,
      };
    }

    let feminino = 0;
    let masculino = 0;
    let totalValid = 0;
    let totalWithoutGender = 0;

    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        const norm = normalizeGender(row.gender);
        if (norm === 'Feminino') {
          feminino++;
          totalValid++;
        } else if (norm === 'Masculino') {
          masculino++;
          totalValid++;
        } else {
          totalWithoutGender++;
        }
      });
    }

    const formatPercent = (val: number, total: number) => {
      if (total === 0) return { pct: 0, formatted: '0,0%' };
      const pct = (val / total) * 100;
      return {
        pct: Number(pct.toFixed(1)),
        formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
      };
    };

    const fPct = formatPercent(feminino, totalValid);
    const mPct = formatPercent(masculino, totalValid);

    const resultData: GenderDistributionItem[] = [
      { id: 'feminino', name: 'Feminino', total: feminino, percentage: fPct.pct, percentageFormatted: fPct.formatted, color: '#e0245e' },
      { id: 'masculino', name: 'Masculino', total: masculino, percentage: mPct.pct, percentageFormatted: mPct.formatted, color: '#006194' },
    ];

    return {
      success: true,
      data: resultData,
      totalValidPatients: totalValid,
      totalWithoutGender,
      error: null,
      isFromSupabase: true,
    };
  } catch (err: any) {
    console.warn('[fetchPatientsGenderDistribution] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      data: defaultItems,
      totalValidPatients: 0,
      totalWithoutGender: 0,
      error: err,
      isFromSupabase: true,
    };
  }
}

/**
 * Calcula a distribuição por sexo a partir da lista local de pacientes em memória.
 */
export function calculateLocalGenderDistribution(patients: Patient[]): PatientsGenderDistributionResult {
  let feminino = 0;
  let masculino = 0;
  let totalValid = 0;
  let totalWithoutGender = 0;

  patients.forEach((p) => {
    const norm = normalizeGender(p.gender);
    if (norm === 'Feminino') {
      feminino++;
      totalValid++;
    } else if (norm === 'Masculino') {
      masculino++;
      totalValid++;
    } else {
      totalWithoutGender++;
    }
  });

  const formatPercent = (val: number, total: number) => {
    if (total === 0) return { pct: 0, formatted: '0,0%' };
    const pct = (val / total) * 100;
    return {
      pct: Number(pct.toFixed(1)),
      formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
    };
  };

  const fPct = formatPercent(feminino, totalValid);
  const mPct = formatPercent(masculino, totalValid);

  return {
    success: true,
    data: [
      { id: 'feminino', name: 'Feminino', total: feminino, percentage: fPct.pct, percentageFormatted: fPct.formatted, color: '#e0245e' },
      { id: 'masculino', name: 'Masculino', total: masculino, percentage: mPct.pct, percentageFormatted: mPct.formatted, color: '#006194' },
    ],
    totalValidPatients: totalValid,
    totalWithoutGender,
    error: null,
    isFromSupabase: false,
  };
}

// ---------------------------------------------------------------------------
// Indicador 7: Pacientes por Cidade / Bairro (Distribuição Geográfica)
// ---------------------------------------------------------------------------

export interface GeographicItem {
  id: string; // chave única normalizada
  label: string; // Ex: "Fortaleza/CE" ou "Centro"
  primaryName: string; // "Fortaleza" ou "Centro"
  secondaryName?: string; // "CE"
  total: number;
  percentage: number; // Ex: 45.5
  percentageFormatted: string; // Ex: "45,5%"
}

export interface PatientsGeographicDistributionResult {
  success: boolean;
  byCity: GeographicItem[];
  byNeighborhood: GeographicItem[];
  totalValidCityPatients: number;
  totalValidNeighborhoodPatients: number;
  totalWithoutCity: number;
  totalWithoutNeighborhood: number;
  error: any | null;
  isFromSupabase: boolean;
}

/**
 * Normaliza e capitaliza nomes próprios de cidades ou bairros.
 * Ex: "são paulo" -> "São Paulo", "ALDEOTA" -> "Aldeota", "caucaia " -> "Caucaia".
 * Preserva preposições em minúsculas (de, da, do, dos, das, e).
 */
export function formatLocationName(str: any): string {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const lowercaseWords = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', "d'"]);

  return trimmed
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowercaseWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Normaliza a UF para 2 letras maiúsculas.
 */
export function formatStateUf(uf: any): string {
  if (!uf || typeof uf !== 'string') return '';
  const clean = uf.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.length === 2) return clean;
  return clean || uf.trim().toUpperCase();
}

/**
 * Consulta a distribuição geográfica de pacientes (Cidade/UF e Bairro) no Supabase.
 */
export async function fetchPatientsGeographicDistribution(): Promise<PatientsGeographicDistributionResult> {
  const isConfigured = getIsSupabaseConfigured();
  const supabase = getSupabase();

  if (!isConfigured || !supabase) {
    return {
      success: true,
      byCity: [],
      byNeighborhood: [],
      totalValidCityPatients: 0,
      totalValidNeighborhoodPatients: 0,
      totalWithoutCity: 0,
      totalWithoutNeighborhood: 0,
      error: null,
      isFromSupabase: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, city, state, neighborhood');

    if (error) {
      console.warn('[fetchPatientsGeographicDistribution] Erro ao consultar cidades e bairros no Supabase:', error);
      return {
        success: false,
        byCity: [],
        byNeighborhood: [],
        totalValidCityPatients: 0,
        totalValidNeighborhoodPatients: 0,
        totalWithoutCity: 0,
        totalWithoutNeighborhood: 0,
        error,
        isFromSupabase: true,
      };
    }

    const cityMap = new Map<string, { label: string; primary: string; secondary: string; count: number }>();
    const neighborhoodMap = new Map<string, { label: string; primary: string; count: number }>();

    let totalValidCity = 0;
    let totalWithoutCity = 0;
    let totalValidNeighborhood = 0;
    let totalWithoutNeighborhood = 0;

    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        // Processa Cidade/UF
        const rawCity = row.city || row.cidade;
        const rawState = row.state || row.estado;
        const normCity = formatLocationName(rawCity);
        const normState = formatStateUf(rawState);

        if (normCity) {
          totalValidCity++;
          const cityLabel = normState ? `${normCity}/${normState}` : normCity;
          const cityKey = `${normCity.toLowerCase()}__${normState.toLowerCase()}`;

          const existing = cityMap.get(cityKey);
          if (existing) {
            existing.count += 1;
          } else {
            cityMap.set(cityKey, {
              label: cityLabel,
              primary: normCity,
              secondary: normState,
              count: 1,
            });
          }
        } else {
          totalWithoutCity++;
        }

        // Processa Bairro
        const rawNeighborhood = row.neighborhood || row.bairro;
        const normNeighborhood = formatLocationName(rawNeighborhood);

        if (normNeighborhood) {
          totalValidNeighborhood++;
          const nKey = normNeighborhood.toLowerCase();
          const existing = neighborhoodMap.get(nKey);
          if (existing) {
            existing.count += 1;
          } else {
            neighborhoodMap.set(nKey, {
              label: normNeighborhood,
              primary: normNeighborhood,
              count: 1,
            });
          }
        } else {
          totalWithoutNeighborhood++;
        }
      });
    }

    const formatPercent = (val: number, total: number) => {
      if (total === 0) return { pct: 0, formatted: '0,0%' };
      const pct = (val / total) * 100;
      return {
        pct: Number(pct.toFixed(1)),
        formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
      };
    };

    // Ordena Cidades por quantidade decrescente
    const byCity: GeographicItem[] = Array.from(cityMap.entries())
      .map(([id, item]) => {
        const p = formatPercent(item.count, totalValidCity);
        return {
          id,
          label: item.label,
          primaryName: item.primary,
          secondaryName: item.secondary,
          total: item.count,
          percentage: p.pct,
          percentageFormatted: p.formatted,
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

    // Ordena Bairros por quantidade decrescente
    const byNeighborhood: GeographicItem[] = Array.from(neighborhoodMap.entries())
      .map(([id, item]) => {
        const p = formatPercent(item.count, totalValidNeighborhood);
        return {
          id,
          label: item.label,
          primaryName: item.primary,
          total: item.count,
          percentage: p.pct,
          percentageFormatted: p.formatted,
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

    return {
      success: true,
      byCity,
      byNeighborhood,
      totalValidCityPatients: totalValidCity,
      totalValidNeighborhoodPatients: totalValidNeighborhood,
      totalWithoutCity,
      totalWithoutNeighborhood,
      error: null,
      isFromSupabase: true,
    };
  } catch (err: any) {
    console.warn('[fetchPatientsGeographicDistribution] Falha de rede ao consultar Supabase:', err);
    return {
      success: false,
      byCity: [],
      byNeighborhood: [],
      totalValidCityPatients: 0,
      totalValidNeighborhoodPatients: 0,
      totalWithoutCity: 0,
      totalWithoutNeighborhood: 0,
      error: err,
      isFromSupabase: true,
    };
  }
}

/**
 * Agrupa cidade/estado e bairro a partir da lista local de pacientes em memória.
 */
export function calculateLocalGeographicDistribution(patients: Patient[]): PatientsGeographicDistributionResult {
  const cityMap = new Map<string, { label: string; primary: string; secondary: string; count: number }>();
  const neighborhoodMap = new Map<string, { label: string; primary: string; count: number }>();

  let totalValidCity = 0;
  let totalWithoutCity = 0;
  let totalValidNeighborhood = 0;
  let totalWithoutNeighborhood = 0;

  patients.forEach((p) => {
    // Cidade/UF
    const normCity = formatLocationName(p.city);
    const normState = formatStateUf(p.state);

    if (normCity) {
      totalValidCity++;
      const cityLabel = normState ? `${normCity}/${normState}` : normCity;
      const cityKey = `${normCity.toLowerCase()}__${normState.toLowerCase()}`;

      const existing = cityMap.get(cityKey);
      if (existing) {
        existing.count += 1;
      } else {
        cityMap.set(cityKey, {
          label: cityLabel,
          primary: normCity,
          secondary: normState,
          count: 1,
        });
      }
    } else {
      totalWithoutCity++;
    }

    // Bairro
    const normNeighborhood = formatLocationName(p.neighborhood);
    if (normNeighborhood) {
      totalValidNeighborhood++;
      const nKey = normNeighborhood.toLowerCase();
      const existing = neighborhoodMap.get(nKey);
      if (existing) {
        existing.count += 1;
      } else {
        neighborhoodMap.set(nKey, {
          label: normNeighborhood,
          primary: normNeighborhood,
          count: 1,
        });
      }
    } else {
      totalWithoutNeighborhood++;
    }
  });

  const formatPercent = (val: number, total: number) => {
    if (total === 0) return { pct: 0, formatted: '0,0%' };
    const pct = (val / total) * 100;
    return {
      pct: Number(pct.toFixed(1)),
      formatted: pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
    };
  };

  const byCity: GeographicItem[] = Array.from(cityMap.entries())
    .map(([id, item]) => {
      const p = formatPercent(item.count, totalValidCity);
      return {
        id,
        label: item.label,
        primaryName: item.primary,
        secondaryName: item.secondary,
        total: item.count,
        percentage: p.pct,
        percentageFormatted: p.formatted,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const byNeighborhood: GeographicItem[] = Array.from(neighborhoodMap.entries())
    .map(([id, item]) => {
      const p = formatPercent(item.count, totalValidNeighborhood);
      return {
        id,
        label: item.label,
        primaryName: item.primary,
        total: item.count,
        percentage: p.pct,
        percentageFormatted: p.formatted,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return {
    success: true,
    byCity,
    byNeighborhood,
    totalValidCityPatients: totalValidCity,
    totalValidNeighborhoodPatients: totalValidNeighborhood,
    totalWithoutCity,
    totalWithoutNeighborhood,
    error: null,
    isFromSupabase: false,
  };
}







