export type PatientStatus = 'Ativo' | 'Inativo';

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  age?: number;
  socialName?: string;
  gender?: 'Feminino' | 'Masculino' | 'Outro';
  phone: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  facebook?: string;
  address: string;
  cep: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  registrationDate: string;
  maritalStatus?: string;
  active: boolean;
  notes: string;
  lastVisit: string;
  avatarUrl?: string;
  initials: string;
  allergies?: string[];
  medicalHistory?: string[];
  convenioId?: number;
  convenioName?: string;
}

export type ToothProcedureType = 'Nenhum' | 'Restauração' | 'Canal' | 'Extração' | 'Limpeza' | 'Coroa' | 'Implante' | 'Aparelho';

export interface ToothCondition {
  toothNumber: number; // 11-18, 21-28, 31-38, 41-48
  status: 'Saudável' | 'Em Tratamento' | 'Tratado' | 'Ausente' | 'Atenção';
  procedure?: ToothProcedureType;
  notes?: string;
  dateUpdated?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  procedure: string;
  status: 'Confirmado' | 'Aguardando' | 'Em Atendimento' | 'Concluído' | 'Cancelado';
  notes?: string;
  value?: number;
  convenioId?: number;
  convenioName?: string;
  pacienteNaoCadastrado?: boolean;
  nomePacienteNaoCadastrado?: string;
  telefonePacienteNaoCadastrado?: string;
}

export interface ClinicalRecordEntry {
  id: string;
  patientId: string;
  date: string;
  dentistName: string;
  procedureDone: string;
  toothNumber?: number;
  clinicalNotes: string;
  prescriptions?: string[];
  cost?: number;
}

export interface DoctorProfile {
  name: string;
  role: string;
  cro: string;
  email: string;
  phone: string;
  clinicName: string;
  avatarUrl: string;
  address?: string;
  cep?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Convenio {
  codigo?: number;
  nome: string;
  status: boolean; // true = Ativo, false = Inativo
  dataCadastro: string;
  ultimaAlteracao: string;
}

export interface Procedimento {
  id?: number;
  nome: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'patients' | 'new-patient' | 'edit-patient' | 'prontuario' | 'appointments' | 'settings' | 'convenios' | 'procedimentos';
