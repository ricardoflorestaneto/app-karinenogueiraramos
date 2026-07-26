import React, { useState } from 'react';
import { DoctorProfile } from '../types';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  setCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase';

interface SettingsViewProps {
  doctor: DoctorProfile;
  onSaveDoctor: (updatedDoctor: DoctorProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  doctor,
  onSaveDoctor,
}) => {
  const [formData, setFormData] = useState({
    name: doctor.name || '',
    role: doctor.role || '',
    cro: doctor.cro || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    clinicName: doctor.clinicName || '',
    avatarUrl: doctor.avatarUrl || '',
    address: doctor.address || '',
    cep: doctor.cep || '',
    complement: doctor.complement || '',
    neighborhood: doctor.neighborhood || '',
    city: doctor.city || 'São Paulo',
    state: doctor.state || 'SP',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // CEP lookup state for clinic address
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  function formatCep(value: string) {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
  }

  const handleCepSearch = async (overrideCep?: string) => {
    const targetCep = overrideCep !== undefined ? overrideCep : formData.cep;
    const cleanCep = (targetCep || '').replace(/\D/g, '');
    if (!cleanCep || cleanCep.length !== 8) {
      if (cleanCep.length > 0 && cleanCep.length !== 8) {
        setCepError('CEP deve conter 8 dígitos');
      }
      return;
    }

    setIsLoadingCep(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
      } else {
        setFormData((prev) => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf ? data.uf.toUpperCase() : prev.state,
          cep: data.cep ? formatCep(data.cep) : prev.cep,
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP do consultório:', err);
      setCepError('Erro ao buscar CEP na API');
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Password verification for Supabase Config and SQL Migration
  const REQUIRED_PASSWORD = 'tpHsmKMMTJiDYKRQFDV6';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetAction, setPasswordTargetAction] = useState<'supabase_config' | 'sql_modal'>('supabase_config');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Supabase connection configuration state
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const sqlMigrationCode = `-- Migration Completa do Banco de Dados Supabase
-- Sistema de Gestão Odontológica - Consultório Dra. Karine Nogueira Ramos
-- Copie e cole todo este script no SQL Editor do seu Dashboard Supabase

-- 1. Tabela de Convênios
CREATE TABLE IF NOT EXISTS public.convenios (
    codigo BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    status BOOLEAN DEFAULT true,
    data_cadastro TEXT NOT NULL,
    ultima_alteracao TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Pacientes
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    rg TEXT,
    birth_date TEXT,
    age INTEGER,
    social_name TEXT,
    gender TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT,
    instagram TEXT,
    facebook TEXT,
    address TEXT,
    cep TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    registration_date TEXT,
    marital_status TEXT,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    last_visit TEXT,
    avatar_url TEXT,
    initials TEXT,
    allergies JSONB DEFAULT '[]'::jsonb,
    medical_history JSONB DEFAULT '[]'::jsonb,
    convenio_id BIGINT REFERENCES public.convenios(codigo) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Consultas / Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    procedure TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmado',
    notes TEXT,
    value NUMERIC(10, 2) DEFAULT 0.00,
    convenio_id BIGINT REFERENCES public.convenios(codigo) ON DELETE SET NULL,
    paciente_nao_cadastrado BOOLEAN DEFAULT false,
    nome_paciente_nao_cadastrado TEXT,
    telefone_paciente_nao_cadastrado TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Prontuários / Registros Clínicos
CREATE TABLE IF NOT EXISTS public.clinical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    dentist_name TEXT NOT NULL,
    procedure_done TEXT NOT NULL,
    tooth_number INTEGER,
    clinical_notes TEXT NOT NULL,
    prescriptions JSONB DEFAULT '[]'::jsonb,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Perfil do Profissional / Doutor
CREATE TABLE IF NOT EXISTS public.doctor_profile (
    id TEXT PRIMARY KEY DEFAULT 'main_doctor',
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    cro TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    clinic_name TEXT NOT NULL,
    avatar_url TEXT,
    address TEXT,
    cep TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.doctor_profile ADD COLUMN IF NOT EXISTS state TEXT;

-- 6. Tabela de Procedimentos Odontológicos
CREATE TABLE IF NOT EXISTS public.procedimentos (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuração de Permissões RLS (Row Level Security)
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público Read/Write
DROP POLICY IF EXISTS "Allow public read and write on convenios" ON public.convenios;
CREATE POLICY "Allow public read and write on convenios" ON public.convenios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on patients" ON public.patients;
CREATE POLICY "Allow public read and write on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on appointments" ON public.appointments;
CREATE POLICY "Allow public read and write on appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on clinical_records" ON public.clinical_records;
CREATE POLICY "Allow public read and write on clinical_records" ON public.clinical_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on doctor_profile" ON public.doctor_profile;
CREATE POLICY "Allow public read and write on doctor_profile" ON public.doctor_profile FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on procedimentos" ON public.procedimentos;
CREATE POLICY "Allow public read and write on procedimentos" ON public.procedimentos FOR ALL USING (true) WITH CHECK (true);

-- Carga Inicial dos Procedimentos Odontológicos
INSERT INTO public.procedimentos (id, nome) VALUES
  (1, 'Avaliação Odontológica / Consulta Inicial'),
  (2, 'Profilaxia e Limpeza Dental'),
  (3, 'Clareamento Dental a Laser'),
  (4, 'Restauração em Resina Composta'),
  (5, 'Tratamento de Canal (Endodontia)'),
  (6, 'Exodontia (Extração Dental)'),
  (7, 'Prótese Fixa / Coroa Total'),
  (8, 'Implante Dentário'),
  (9, 'Instalação / Manutenção Ortodôntica'),
  (10, 'Aplicação Tópica de Flúor'),
  (11, 'Raspagem e Alisamento Radicular'),
  (12, 'Prova de Lentes de Contato Dental'),
  (13, 'Selante Odontológico')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

SELECT setval('procedimentos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.procedimentos));
`;

  const handleVerifyPasswordAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === REQUIRED_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');

      if (passwordTargetAction === 'sql_modal') {
        setShowSqlModal(true);
      } else {
        const creds = getSupabaseCredentials();
        setCustomSupabaseUrl(creds.customUrl || creds.url || '');
        setCustomSupabaseKey(creds.customKey || creds.key || '');
        setSupabaseTestStatus(null);
        setShowSupabaseModal(true);
      }
    } else {
      setPasswordError('Senha de acesso incorreta. Verifique e tente novamente.');
    }
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    const result = await testSupabaseConnection(customSupabaseUrl, customSupabaseKey);
    setSupabaseTestStatus(result);
    setIsTestingSupabase(false);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSupabaseCredentials(customSupabaseUrl, customSupabaseKey);
    alert('Configurações do Supabase salvas com sucesso! A aplicação será atualizada.');
    window.location.reload();
  };

  const handleClearSupabaseConfig = () => {
    if (confirm('Deseja restaurar as credenciais padrão do sistema?')) {
      setCustomSupabaseCredentials('', '');
      alert('Credenciais personalizadas removidas.');
      window.location.reload();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDoctor(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleBackup = () => {
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full space-y-6 pb-24">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#111c2d] tracking-tight">
          Configurações do Consultório
        </h2>
        <p className="text-sm text-[#3f4850] mt-1">
          Gerencie o perfil profissional, dados do estabelecimento e integrações de banco de dados.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-[#6cf8bb]/30 border border-[#006c49]/40 rounded-xl text-[#005236] text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Profile Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-6">
          <h3 className="font-semibold text-lg text-[#111c2d] pb-2 border-b border-[#e7eeff] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006194]">badge</span>
            Perfil do Profissional Responsável
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-[#f0f3ff] rounded-2xl border border-[#d8e3fb]">
              <img
                src={formData.avatarUrl}
                alt={formData.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#006194] shadow-xs"
              />
              <div>
                <p className="font-bold text-sm text-[#111c2d]">{formData.name}</p>
                <p className="text-xs text-[#006194]">{formData.cro}</p>
                <p className="text-[11px] text-[#707881] mt-0.5">Cirurgiã-Dentista Responsável</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                Nome do Profissional
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Registro CRO
                </label>
                <input
                  type="text"
                  required
                  value={formData.cro}
                  onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Especialidade / Título
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                Nome do Consultório / Clínica
              </label>
              <input
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
              />
            </div>

            {/* Endereço do Consultório (reutilizando o mesmo padrão de cadastro de paciente) */}
            <div className="pt-4 border-t border-[#e7eeff] space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#006194]">location_on</span>
                <h4 className="font-semibold text-base text-[#111c2d]">Endereço do Consultório</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Endereço</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, sala"
                    className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cep}
                      maxLength={9}
                      onChange={(e) => {
                        setCepError('');
                        const formatted = formatCep(e.target.value);
                        setFormData((prev) => ({ ...prev, cep: formatted }));
                        if (formatted.replace(/\D/g, '').length === 8) {
                          handleCepSearch(formatted);
                        }
                      }}
                      onBlur={() => handleCepSearch()}
                      placeholder="00000-000"
                      className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => handleCepSearch()}
                      disabled={isLoadingCep}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#006194] hover:text-[#004b73] cursor-pointer disabled:opacity-50"
                      title="Buscar CEP no ViaCEP"
                    >
                      {isLoadingCep ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      )}
                    </button>
                  </div>
                  {cepError && (
                    <span className="text-[11px] text-[#ba1a1a] mt-1 block font-medium">{cepError}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Complemento</label>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, Sala, Bloco"
                    className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                    className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Estado</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-xl text-sm text-[#111c2d] transition-all"
                  >
                    <option value="AC">Acre (AC)</option>
                    <option value="AL">Alagoas (AL)</option>
                    <option value="AP">Amapá (AP)</option>
                    <option value="AM">Amazonas (AM)</option>
                    <option value="BA">Bahia (BA)</option>
                    <option value="CE">Ceará (CE)</option>
                    <option value="DF">Distrito Federal (DF)</option>
                    <option value="ES">Espírito Santo (ES)</option>
                    <option value="GO">Goiás (GO)</option>
                    <option value="MA">Maranhão (MA)</option>
                    <option value="MT">Mato Grosso (MT)</option>
                    <option value="MS">Mato Grosso do Sul (MS)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                    <option value="PA">Pará (PA)</option>
                    <option value="PB">Paraíba (PB)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="PE">Pernambuco (PE)</option>
                    <option value="PI">Piauí (PI)</option>
                    <option value="RJ">Rio de Janeiro (RJ)</option>
                    <option value="RN">Rio Grande do Norte (RN)</option>
                    <option value="RS">Rio Grande do Sul (RS)</option>
                    <option value="RO">Rondônia (RO)</option>
                    <option value="RR">Roraima (RR)</option>
                    <option value="SC">Santa Catarina (SC)</option>
                    <option value="SP">São Paulo (SP)</option>
                    <option value="SE">Sergipe (SE)</option>
                    <option value="TO">Tocantins (TO)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-[#006194] text-white font-semibold rounded-xl text-sm hover:bg-[#004b73] transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Database & LGPD Security */}
        <div className="space-y-6">
          {/* Supabase Integration Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006194]">database</span>
                Banco de Dados Supabase
              </h3>
              {isSupabaseConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#6cf8bb]/40 text-[#00714d] text-xs font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00714d]"></span> Conectado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> Local / Mod. Nuvem
                </span>
              )}
            </div>

            <p className="text-xs text-[#3f4850] leading-relaxed">
              Integrado com cliente Supabase com sincronização em tempo real para Pacientes, Prontuários e Consultas.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setPasswordTargetAction('supabase_config');
                  setPasswordInput('');
                  setPasswordError('');
                  setShowPasswordModal(true);
                }}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004b73] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                Configurar Conexão (Acesso Restrito)
              </button>

              <button
                onClick={() => {
                  setPasswordTargetAction('sql_modal');
                  setPasswordInput('');
                  setPasswordError('');
                  setShowPasswordModal(true);
                }}
                className="w-full py-2.5 bg-[#e7eeff] hover:bg-[#dee8ff] text-[#006194] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                Ver SQL de Migration (Acesso Restrito)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-4">
            <h3 className="font-semibold text-base text-[#111c2d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006c49]">shield</span>
              Conformidade LGPD
            </h3>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Os dados clínicos e prontuários estão salvos com criptografia e em conformidade com as exigências do CFO (Conselho Federal de Odontologia).
            </p>

            <div className="p-3 bg-[#f0f3ff] rounded-xl text-xs space-y-1">
              <p className="font-semibold text-[#111c2d]">Status da Criptografia:</p>
              <p className="text-[#006c49] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Ativa - AES-256 Bit
              </p>
            </div>

            <button
              onClick={handleBackup}
              className="w-full py-2.5 bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#006194] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              Gerar Backup de Prontuários
            </button>

            {backupSuccess && (
              <p className="text-xs text-[#006c49] font-medium text-center animate-fade-in">
                ✓ Backup de prontuários concluído com sucesso!
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-3">
            <h3 className="font-semibold text-base text-[#111c2d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006194]">info</span>
              Informações do Sistema
            </h3>
            <div className="text-xs space-y-1.5 text-[#3f4850]">
              <p>
                <strong>Versão:</strong> 2.4.0 Clinical Precision + Supabase
              </p>
              <p>
                <strong>Licença:</strong> Dra. Karine Nogueira Ramos
              </p>
              <p>
                <strong>Suporte Técnico:</strong> (85) 988076961
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal SQL Migration */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <h3 className="font-bold text-lg text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006194]">data_object</span>
                Código de Migration para Supabase SQL Editor
              </h3>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-[#707881] hover:text-[#111c2d]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3f4850] mb-3">
              Copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel do Supabase para criar as tabelas (<code className="bg-slate-100 px-1 py-0.5 rounded">patients</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">appointments</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">clinical_records</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">doctor_profile</code>) e políticas de RLS. O arquivo também está salvo em <code className="bg-slate-100 px-1 py-0.5 rounded">/supabase/migrations/20260723000000_initial_schema.sql</code>.
            </p>

            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto max-h-80 font-mono leading-relaxed">
              {sqlMigrationCode}
            </pre>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlMigrationCode);
                  alert('Código SQL copiado para a área de transferência!');
                }}
                className="px-4 py-2 bg-[#006194] text-white rounded-xl text-xs font-semibold hover:bg-[#004b73] transition-colors cursor-pointer"
              >
                Copiar SQL
              </button>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autenticação / Senha para Acesso Restrito */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff] mb-4">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined text-[24px]">lock</span>
                <h3 className="font-bold text-base text-[#111c2d]">Acesso Restrito</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-[#707881] hover:text-[#111c2d] text-sm cursor-pointer p-1 rounded-lg hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleVerifyPasswordAndProceed} className="space-y-4">
              <p className="text-xs text-[#3f4850] leading-relaxed">
                {passwordTargetAction === 'sql_modal'
                  ? 'Informe a senha de acesso para visualizar a Migration SQL:'
                  : 'Informe a senha de acesso para configurar a conexão com o Banco de Dados Supabase:'}
              </p>

              <div>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Senha de acesso"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  className={`w-full p-2.5 bg-[#f0f3ff] border ${
                    passwordError ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                  } rounded-xl text-sm font-medium text-[#111c2d] focus:outline-none focus:border-[#006194] transition-all`}
                />
                {passwordError && (
                  <p className="text-xs font-semibold text-[#ba1a1a] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">error</span>
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#006194] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#004b73] cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuração de Conexão Supabase */}
      {showSupabaseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e7eeff] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined text-[24px]">database</span>
                <h3 className="font-bold text-base text-[#111c2d]">Conexão Banco de Dados Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="text-[#707881] hover:text-[#111c2d] p-1 rounded-lg hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-[#e7eeff]/60 border border-[#006194]/20 rounded-xl text-xs text-[#004b73] leading-relaxed flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
              <div>
                <strong>Onde encontrar e como salvar?</strong>
                <p className="mt-0.5">
                  Informe a URL do seu Projeto Supabase e a Chave Anônima Pública (Anon Key). Os dados ficam armazenados de forma criptografada e segura no seu navegador.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  URL do Projeto Supabase <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://seu-projeto.supabase.co"
                  value={customSupabaseUrl}
                  onChange={(e) => {
                    setCustomSupabaseUrl(e.target.value);
                    setSupabaseTestStatus(null);
                  }}
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Chave Anônima Pública (Anon Key) <span className="text-[#ba1a1a]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={customSupabaseKey}
                  onChange={(e) => {
                    setCustomSupabaseKey(e.target.value);
                    setSupabaseTestStatus(null);
                  }}
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-xs font-mono text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>

              {supabaseTestStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    supabaseTestStatus.success
                      ? 'bg-[#e8f8f0] text-[#006c49] border border-[#006c49]/30'
                      : 'bg-[#ffdad6] text-[#93000a] border border-[#ffdad6]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {supabaseTestStatus.success ? 'check_circle' : 'error'}
                  </span>
                  <span>{supabaseTestStatus.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e7eeff]">
                <button
                  type="button"
                  onClick={handleClearSupabaseConfig}
                  className="px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl transition-colors cursor-pointer"
                >
                  Restaurar Padrão
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={isTestingSupabase}
                    className="px-3.5 py-2 bg-[#f0f3ff] text-[#006194] hover:bg-[#dee8ff] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">network_check</span>
                    <span>{isTestingSupabase ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#006194] text-white hover:bg-[#004b73] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Salvar e Conectar</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
