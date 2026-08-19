import React, { useState } from 'react';
import { Patient } from '../types';
import {
  calculateDetailedAge,
  getLocalDateString,
  isFutureDate,
  FUTURE_DATE_ERROR_MESSAGE,
} from '../lib/supabase';

interface PatientFormViewProps {
  initialPatient?: Patient | null;
  onSave: (patientData: Omit<Patient, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const formatCep = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const PatientFormView: React.FC<PatientFormViewProps> = ({
  initialPatient,
  onSave,
  onCancel,
}) => {
  const todayDateStr = getLocalDateString();

  const [formData, setFormData] = useState({
    name: initialPatient?.name || '',
    cpf: initialPatient?.cpf ? formatCpf(initialPatient.cpf) : '',
    rg: initialPatient?.rg || '',
    birthDate: initialPatient?.birthDate || '',
    age: initialPatient?.age || (initialPatient?.birthDate ? calculateDetailedAge(initialPatient.birthDate).years : 0),
    socialName: initialPatient?.socialName || '',
    gender: initialPatient?.gender || 'Feminino',
    phone: initialPatient?.phone || '',
    whatsapp: initialPatient?.whatsapp || '',
    email: initialPatient?.email || '',
    instagram: initialPatient?.instagram || '',
    facebook: initialPatient?.facebook || '',
    address: initialPatient?.address || '',
    cep: initialPatient?.cep ? formatCep(initialPatient.cep) : '',
    complement: initialPatient?.complement || '',
    neighborhood: initialPatient?.neighborhood || '',
    city: initialPatient?.city || 'Fortaleza',
    state: initialPatient?.state || 'CE',
    registrationDate: initialPatient?.registrationDate || todayDateStr,
    maritalStatus: initialPatient?.maritalStatus || 'Solteiro(a)',
    active: initialPatient?.active ?? true,
    notes: initialPatient?.notes || '',
    allergiesText: initialPatient?.allergies ? initialPatient.allergies.join(', ') : '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorField, setErrorField] = useState('');
  const [dateError, setDateError] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');

  const isBirthDateFuture = Boolean(formData.birthDate && isFutureDate(formData.birthDate));
  const detailedAge = isBirthDateFuture
    ? { years: 0, months: 0, days: 0, formatted: 'Data futura inválida' }
    : calculateDetailedAge(formData.birthDate);

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    if (isFutureDate(dateVal)) {
      setDateError(FUTURE_DATE_ERROR_MESSAGE);
      setErrorField('birthDate');
      setFormData((prev) => ({
        ...prev,
        birthDate: dateVal,
        age: 0,
      }));
    } else {
      setDateError('');
      if (errorField === 'birthDate') setErrorField('');
      if (formErrorMessage === FUTURE_DATE_ERROR_MESSAGE) setFormErrorMessage('');
      const detailed = calculateDetailedAge(dateVal);
      setFormData((prev) => ({
        ...prev,
        birthDate: dateVal,
        age: detailed.years,
      }));
    }
  };

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const handleCepSearch = async (overrideCep?: string) => {
    const targetCep = overrideCep !== undefined ? overrideCep : formData.cep;
    const cleanCep = targetCep.replace(/\D/g, '');
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
      console.error('Erro ao buscar CEP:', err);
      setCepError('Erro ao buscar CEP na API');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (fullName.slice(0, 2) || 'PA').toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorField('name');
      setFormErrorMessage('Por favor, informe o nome do paciente.');
      return;
    }
    if (!formData.cpf.trim()) {
      setErrorField('cpf');
      setFormErrorMessage('Por favor, informe o CPF do paciente.');
      return;
    }
    if (formData.birthDate && isFutureDate(formData.birthDate)) {
      setErrorField('birthDate');
      setDateError(FUTURE_DATE_ERROR_MESSAGE);
      setFormErrorMessage(FUTURE_DATE_ERROR_MESSAGE);
      return;
    }
    if (formData.registrationDate && isFutureDate(formData.registrationDate)) {
      setErrorField('registrationDate');
      setFormErrorMessage(FUTURE_DATE_ERROR_MESSAGE);
      return;
    }

    setIsSaving(true);
    setErrorField('');
    setDateError('');
    setFormErrorMessage('');

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);

      const allergies = formData.allergiesText
        ? formData.allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const updatedPatient: Omit<Patient, 'id'> & { id?: string } = {
        id: initialPatient?.id,
        name: formData.name,
        cpf: formData.cpf,
        rg: formData.rg,
        birthDate: formData.birthDate,
        age: Number(formData.age),
        socialName: formData.socialName,
        gender: formData.gender as any,
        phone: formData.phone || '(11) 90000-0000',
        whatsapp: formData.whatsapp || formData.phone || '(11) 90000-0000',
        email: formData.email,
        instagram: formData.instagram,
        facebook: formData.facebook,
        address: formData.address,
        cep: formData.cep,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city || 'Fortaleza',
        state: formData.state || 'CE',
        registrationDate: formData.registrationDate,
        maritalStatus: formData.maritalStatus,
        active: formData.active,
        notes: formData.notes,
        lastVisit: initialPatient?.lastVisit || 'Hoje',
        initials: getInitials(formData.name),
        allergies,
        convenioId: initialPatient?.convenioId,
        convenioName: initialPatient?.convenioName,
      };

      setTimeout(() => {
        onSave(updatedPatient);
      }, 600);
    }, 1200);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full pb-32">
      {/* Top navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-[#e7eeff] text-[#3f4850] hover:text-[#006194] rounded-full transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Voltar ao Gerenciamento</span>
        </button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#006194] tracking-tight">
          {initialPatient ? 'Editar Paciente' : 'Cadastro de Paciente'}
        </h2>
        <p className="text-sm text-[#3f4850] mt-1">
          Preencha os dados abaixo para registrar ou editar o prontuário.
        </p>
      </div>

      {/* Alerta de Validação */}
      {formErrorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">error</span>
            <span className="text-sm font-semibold">{formErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormErrorMessage('')}
            className="text-[#ba1a1a] hover:opacity-80 cursor-pointer p-1"
            title="Fechar aviso"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <form id="patientForm" onSubmit={handleSubmit} className="space-y-6">
        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Dados Pessoais */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-[#d8e3fb] flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-[#e7eeff]">
              <span className="material-symbols-outlined text-[#006194]">person</span>
              <h3 className="font-semibold text-lg text-[#111c2d]">Dados Pessoais</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Nome do Paciente <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  className={`w-full bg-[#f0f3ff] border-b-2 ${
                    errorField === 'name' ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                  } focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    CPF <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={formData.cpf}
                    onChange={(e) => {
                      const formatted = formatCpf(e.target.value);
                      setFormData((prev) => ({ ...prev, cpf: formatted }));
                    }}
                    placeholder="000.000.000-00"
                    className={`w-full bg-[#f0f3ff] border-b-2 ${
                      errorField === 'cpf' ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                    } focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">RG</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="00.000.000-0"
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#3f4850]">
                      Data de Nascimento
                    </label>
                    <span className="text-[11px] text-[#707881]">
                      Máx: {todayDateStr.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <input
                    type="date"
                    max={todayDateStr}
                    value={formData.birthDate}
                    onChange={handleBirthDateChange}
                    className={`w-full bg-[#f0f3ff] border-b-2 ${
                      errorField === 'birthDate' || dateError || isBirthDateFuture
                        ? 'border-[#ba1a1a] bg-[#fff8f8]'
                        : 'border-[#bfc7d2]'
                    } focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all`}
                  />
                  {(errorField === 'birthDate' || dateError || isBirthDateFuture) && (
                    <p className="text-xs font-semibold text-[#ba1a1a] mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">error</span>
                      <span>{FUTURE_DATE_ERROR_MESSAGE}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#3f4850]">
                      Idade (Anos, Meses e Dias)
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006194] bg-[#e7eeff] px-2 py-0.5 rounded-md">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      Automático
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={detailedAge.formatted || (formData.age ? `${formData.age} ${formData.age === 1 ? 'ano' : 'anos'}` : '')}
                    placeholder="Preencha a data de nascimento"
                    title={detailedAge.formatted || (formData.age ? `${formData.age} anos` : '')}
                    className={`w-full bg-[#f0f3ff] border-b-2 ${
                      isBirthDateFuture ? 'border-[#ba1a1a] text-[#ba1a1a]' : 'border-[#bfc7d2] text-[#111c2d]'
                    } focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm transition-all font-medium select-all`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    Nome Social
                  </label>
                  <input
                    type="text"
                    value={formData.socialName}
                    onChange={(e) => setFormData({ ...formData, socialName: e.target.value })}
                    placeholder="Como prefere ser chamado"
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Sexo</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro/Não informado</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Endereço */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-[#d8e3fb] flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-[#e7eeff]">
              <span className="material-symbols-outlined text-[#006194]">location_on</span>
              <h3 className="font-semibold text-lg text-[#111c2d]">Endereço</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Endereço</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número"
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
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
                      className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all pr-8"
                    />
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={isLoadingCep}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#006194] hover:text-[#004b73] cursor-pointer disabled:opacity-50"
                      title="Buscar CEP"
                    >
                      {isLoadingCep ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      )}
                    </button>
                  </div>
                  {cepError && (
                    <span className="text-[11px] text-[#ba1a1a] mt-1 block">{cepError}</span>
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
                    placeholder="Apto, Bloco"
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
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
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Estado</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
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
          </section>

          {/* 3. Contatos */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-[#d8e3fb] flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-[#e7eeff]">
              <span className="material-symbols-outlined text-[#006194]">contact_phone</span>
              <h3 className="font-semibold text-lg text-[#111c2d]">Contatos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">Telefone</label>
                <div className="flex items-center bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus-within:border-[#006194] rounded-t-lg">
                  <span className="material-symbols-outlined text-[#707881] ml-3 text-[18px]">call</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-[#111c2d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">WhatsApp</label>
                <div className="flex items-center bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus-within:border-[#006194] rounded-t-lg">
                  <span className="material-symbols-outlined text-[#006c49] ml-3 text-[18px]">chat</span>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-[#111c2d]"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">E-mail</label>
                <div className="flex items-center bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus-within:border-[#006194] rounded-t-lg">
                  <span className="material-symbols-outlined text-[#707881] ml-3 text-[18px]">mail</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="paciente@exemplo.com"
                    className="w-full bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-[#111c2d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">Instagram</label>
                <div className="flex items-center bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus-within:border-[#006194] rounded-t-lg">
                  <span className="material-symbols-outlined text-[#707881] ml-3 text-[18px]">brand_awareness</span>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@usuario"
                    className="w-full bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-[#111c2d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">Facebook</label>
                <div className="flex items-center bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus-within:border-[#006194] rounded-t-lg">
                  <span className="material-symbols-outlined text-[#707881] ml-3 text-[18px]">public</span>
                  <input
                    type="text"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/..."
                    className="w-full bg-transparent border-none focus:outline-none px-3 py-3 text-sm text-[#111c2d]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4. Informações Gerais & Alergias */}
          <section className="bg-white p-6 rounded-2xl shadow-xs border border-[#d8e3fb] flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-[#e7eeff]">
              <span className="material-symbols-outlined text-[#006194]">info</span>
              <h3 className="font-semibold text-lg text-[#111c2d]">Informações Gerais</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    Data de Cadastro
                  </label>
                  <input
                    type="date"
                    max={todayDateStr}
                    readOnly
                    disabled
                    value={formData.registrationDate}
                    className="w-full bg-[#e7eeff] border-b-2 border-[#bfc7d2] rounded-t-lg px-4 py-3 text-sm text-[#707881] cursor-not-allowed transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Estado Civil</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
              </div>

              {/* Paciente Ativo Switch */}
              <div className="flex items-center justify-between p-4 bg-[#e7eeff] rounded-xl border border-[#d8e3fb]">
                <div>
                  <p className="font-semibold text-sm text-[#111c2d]">Paciente Ativo</p>
                  <p className="text-xs text-[#3f4850]">
                    Define se o prontuário está habilitado para consultas e retornos.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#bfc7d2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006194]" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Alergias Conocidas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.allergiesText}
                  onChange={(e) => setFormData({ ...formData, allergiesText: e.target.value })}
                  placeholder="Ex: Penicilina, Dipirona, Anestésico local"
                  className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Observações Clínicas / Anamnese
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Alergias, restrições médicas, bruxismo, observações da primeira consulta..."
                  className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg px-4 py-3 text-sm text-[#111c2d] transition-all"
                />
              </div>
            </div>
          </section>
        </div>
      </form>

      {/* Sticky Bottom Actions Bar */}
      <footer className="fixed bottom-0 right-0 left-0 md:left-64 bg-white/95 backdrop-blur-md border-t border-[#bfc7d2]/30 px-8 py-4 flex justify-end items-center gap-4 z-40 shadow-lg">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-[#3f4850] hover:bg-[#f0f3ff] transition-all cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="submit"
          form="patientForm"
          disabled={isSaving}
          className={`px-8 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
            saveSuccess
              ? 'bg-[#006c49]'
              : 'bg-[#006194] hover:bg-[#004b73] active:scale-[0.98]'
          }`}
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
              <span>Salvando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>Salvar Paciente</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
};
