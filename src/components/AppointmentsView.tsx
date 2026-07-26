import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Patient, Convenio } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseCredentials,
  setCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase';

interface AppointmentsViewProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Appointment['status']) => void;
  onViewPatientRecord: (patientId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  patients,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onUpdateStatus,
  onViewPatientRecord,
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-07-23');
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);

  // Password verification for restricted actions
  const REQUIRED_NEW_APPOINTMENT_PASSWORD = 'tpHsmKMMTJiDYKRQFDV6';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetAction, setPasswordTargetAction] = useState<'new_appointment' | 'supabase_config'>('new_appointment');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Supabase connection configuration state
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Appointment form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isUnregisteredPatient, setIsUnregisteredPatient] = useState(false);
  const [unregisteredName, setUnregisteredName] = useState('');
  const [unregisteredPhone, setUnregisteredPhone] = useState('');
  const [unregisteredNameError, setUnregisteredNameError] = useState('');
  const [unregisteredPhoneError, setUnregisteredPhoneError] = useState('');
  const [statusErrorMessage, setStatusErrorMessage] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(selectedDate);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [procedure, setProcedure] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('Confirmado');
  const [convenioId, setConvenioId] = useState<number | undefined>(undefined);
  const [convenioErrorMessage, setConvenioErrorMessage] = useState('');
  const [conveniosList, setConveniosList] = useState<Convenio[]>([]);
  const [procedimentosList, setProcedimentosList] = useState<string[]>([]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return digits
        .replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadConveniosAndProcedimentos = async () => {
      // Load convenios
      const savedConv = localStorage.getItem('dra_karine_convenios');
      let convList: Convenio[] = savedConv ? JSON.parse(savedConv) : [
        { codigo: 1, nome: 'Unimed', status: true, dataCadastro: '', ultimaAlteracao: '' },
        { codigo: 2, nome: 'Bradesco Saúde', status: true, dataCadastro: '', ultimaAlteracao: '' },
        { codigo: 3, nome: 'Amil', status: true, dataCadastro: '', ultimaAlteracao: '' },
        { codigo: 4, nome: 'SulAmérica', status: false, dataCadastro: '', ultimaAlteracao: '' },
        { codigo: 5, nome: 'Porto Seguro Saúde', status: true, dataCadastro: '', ultimaAlteracao: '' },
      ];

      // Load procedimentos
      const savedProc = localStorage.getItem('dra_karine_procedimentos');
      let procNames: string[] = savedProc
        ? JSON.parse(savedProc).map((p: any) => p.nome)
        : [
            'Avaliação Odontológica / Consulta Inicial',
            'Profilaxia e Limpeza Dental',
            'Clareamento Dental a Laser',
            'Restauração em Resina Composta',
            'Tratamento de Canal (Endodontia)',
            'Exodontia (Extração Dental)',
            'Prótese Fixa / Coroa Total',
            'Implante Dentário',
            'Instalação / Manutenção Ortodôntica',
            'Aplicação Tópica de Flúor',
            'Raspagem e Alisamento Radicular',
            'Prova de Lentes de Contato Dental',
            'Selante Odontológico',
          ];

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: convData } = await supabase
            .from('convenios')
            .select('*')
            .order('nome', { ascending: true });

          if (convData && convData.length > 0) {
            convList = convData.map((item: any) => ({
              codigo: item.codigo ?? item.id,
              nome: item.nome,
              status: Boolean(item.status),
              dataCadastro: item.created_at || new Date().toISOString(),
              ultimaAlteracao: item.updated_at || new Date().toISOString(),
            }));
          }

          const { data: procData } = await supabase
            .from('procedimentos')
            .select('*')
            .order('nome', { ascending: true });

          if (procData && procData.length > 0) {
            procNames = procData.map((item: any) => item.nome);
          }
        } catch (err) {
          console.error('Erro ao carregar dados do Supabase:', err);
        }
      }

      if (isMounted) {
        setConveniosList(convList);
        setProcedimentosList(procNames);
      }
    };

    loadConveniosAndProcedimentos();
    return () => { isMounted = false; };
  }, []);

  const availableConvenios = useMemo(() => {
    return conveniosList
      .filter((c) => c.status || c.codigo === convenioId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [conveniosList, convenioId]);

  const filteredAppointments = appointments.filter((a) => a.date === selectedDate);

  const handleOpenNewModal = () => {
    setEditingAppointment(null);
    setSelectedPatientId('');
    setIsUnregisteredPatient(false);
    setUnregisteredName('');
    setUnregisteredPhone('');
    setUnregisteredNameError('');
    setUnregisteredPhoneError('');
    setStatusErrorMessage('');
    setAppointmentDate(selectedDate);
    setTime('');
    setDurationMinutes('');
    setProcedure('');
    setValue('');
    setNotes('');
    setStatus('Confirmado');
    setConvenioId(undefined);
    setConvenioErrorMessage('');
    setShowModal(true);
  };

  const handleVerifyPasswordAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === REQUIRED_NEW_APPOINTMENT_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');

      if (passwordTargetAction === 'supabase_config') {
        const creds = getSupabaseCredentials();
        setCustomSupabaseUrl(creds.customUrl || creds.url || '');
        setCustomSupabaseKey(creds.customKey || creds.key || '');
        setSupabaseTestStatus(null);
        setShowSupabaseModal(true);
      } else {
        handleOpenNewModal();
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

  const handleOpenEditModal = (app: Appointment) => {
    setEditingAppointment(app);
    const isUnreg = Boolean(app.pacienteNaoCadastrado);
    setIsUnregisteredPatient(isUnreg);
    setSelectedPatientId(isUnreg ? '' : app.patientId);
    setUnregisteredName(isUnreg ? (app.nomePacienteNaoCadastrado || app.patientName) : '');
    setUnregisteredPhone(isUnreg ? (app.telefonePacienteNaoCadastrado || app.patientPhone) : '');
    setUnregisteredNameError('');
    setUnregisteredPhoneError('');
    setStatusErrorMessage('');
    setAppointmentDate(app.date);
    setTime(app.time);
    setDurationMinutes(app.durationMinutes);
    setProcedure(app.procedure);
    setValue(app.value || 0);
    setNotes(app.notes || '');
    setStatus(app.status);
    const pat = patients.find((p) => p.id === app.patientId);
    setConvenioId(app.convenioId || pat?.convenioId);
    setConvenioErrorMessage('');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let pId = '';
    let pName = '';
    let pPhone = '';

    if (isUnregisteredPatient) {
      let hasError = false;
      if (!unregisteredName.trim()) {
        setUnregisteredNameError('Informe o nome do paciente.');
        hasError = true;
      } else {
        setUnregisteredNameError('');
      }

      if (!unregisteredPhone.trim()) {
        setUnregisteredPhoneError('Informe o telefone para contato.');
        hasError = true;
      } else {
        setUnregisteredPhoneError('');
      }

      if (['Em Atendimento', 'Concluído'].includes(status)) {
        setStatusErrorMessage('Este status só pode ser utilizado para pacientes cadastrados.');
        hasError = true;
      } else {
        setStatusErrorMessage('');
      }

      if (hasError) return;

      pId = '';
      pName = unregisteredName.trim();
      pPhone = unregisteredPhone.trim();
    } else {
      const patientObj = patients.find((p) => p.id === selectedPatientId);
      if (!patientObj) return;
      pId = patientObj.id;
      pName = patientObj.name;
      pPhone = patientObj.whatsapp || patientObj.phone;
    }

    if (!convenioId) {
      setConvenioErrorMessage('O Convênio é obrigatório.');
      return;
    }

    setConvenioErrorMessage('');
    const selectedConv = conveniosList.find((c) => c.codigo === convenioId);
    const convenioName = selectedConv ? selectedConv.nome : '';

    const appData = {
      patientId: pId,
      patientName: pName,
      patientPhone: pPhone,
      date: appointmentDate,
      time,
      durationMinutes: durationMinutes === '' ? 45 : Number(durationMinutes),
      procedure: procedure || 'Consulta',
      status,
      notes,
      value: value === '' ? 0 : Number(value),
      convenioId,
      convenioName,
      pacienteNaoCadastrado: isUnregisteredPatient,
      nomePacienteNaoCadastrado: isUnregisteredPatient ? pName : undefined,
      telefonePacienteNaoCadastrado: isUnregisteredPatient ? pPhone : undefined,
    };

    if (editingAppointment) {
      if (onUpdateAppointment) {
        onUpdateAppointment({
          ...editingAppointment,
          ...appData,
        });
      }
    } else {
      onAddAppointment(appData);
    }

    setShowModal(false);
    setEditingAppointment(null);
  };

  const handleConfirmDelete = () => {
    if (deletingAppointment && onDeleteAppointment) {
      onDeleteAppointment(deletingAppointment.id);
    }
    setDeletingAppointment(null);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Concluído':
        return 'bg-[#6cf8bb]/40 text-[#00714d]';
      case 'Em Atendimento':
        return 'bg-[#cce5ff] text-[#004b73]';
      case 'Confirmado':
        return 'bg-[#dee8ff] text-[#006194]';
      case 'Aguardando':
        return 'bg-amber-100 text-amber-900';
      case 'Cancelado':
        return 'bg-[#ffdad6] text-[#93000a]';
      default:
        return 'bg-[#f0f3ff] text-[#3f4850]';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#111c2d] tracking-tight">
            Agenda de Consultas
          </h2>
          <p className="text-sm text-[#3f4850] mt-1">
            Gerencie o fluxo diário de atendimento do consultório.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 bg-white border border-[#bfc7d2] rounded-xl text-sm font-semibold text-[#111c2d] shadow-xs"
          />

          <button
            onClick={() => {
              setPasswordTargetAction('supabase_config');
              setPasswordInput('');
              setPasswordError('');
              setShowPasswordModal(true);
            }}
            className="bg-white hover:bg-[#f0f3ff] text-[#006194] border border-[#006194]/30 px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer opacity-80 hover:opacity-100"
            title="Configurar Conexão do Banco de Dados Supabase (Acesso Restrito)"
          >
            <span className="material-symbols-outlined text-[16px]">database</span>
            <span>Configurar Supabase</span>
            {isSupabaseConfigured ? (
              <span className="w-2 h-2 rounded-full bg-[#00714d]" title="Banco Conectado"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Banco Pendente"></span>
            )}
          </button>

          <button
            onClick={handleOpenNewModal}
            className="bg-[#006194] text-white hover:bg-[#004b73] px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Daily Quick Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#e7eeff] shadow-xs">
          <p className="text-xs text-[#707881]">Total Agendado</p>
          <p className="text-2xl font-bold text-[#111c2d] mt-1">{filteredAppointments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#e7eeff] shadow-xs">
          <p className="text-xs text-[#707881]">Confirmados</p>
          <p className="text-2xl font-bold text-[#006194] mt-1">
            {filteredAppointments.filter((a) => a.status === 'Confirmado').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#e7eeff] shadow-xs">
          <p className="text-xs text-[#707881]">Em Atendimento</p>
          <p className="text-2xl font-bold text-[#007bb9] mt-1">
            {filteredAppointments.filter((a) => a.status === 'Em Atendimento').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#e7eeff] shadow-xs">
          <p className="text-xs text-[#707881]">Concluídos</p>
          <p className="text-2xl font-bold text-[#006c49] mt-1">
            {filteredAppointments.filter((a) => a.status === 'Concluído').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#e7eeff] shadow-xs">
          <p className="text-xs text-[#707881]">Faturamento Previsto</p>
          <p className="text-2xl font-bold text-[#007bb9] mt-1">
            R${' '}
            {filteredAppointments
              .reduce((acc, curr) => acc + (curr.value || 0), 0)
              .toFixed(0)}
          </p>
        </div>
      </div>

      {/* Appointments Timeline Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e7eeff] overflow-hidden">
        <div className="p-5 border-b border-[#e7eeff] bg-[#f0f3ff] flex justify-between items-center">
          <h3 className="font-semibold text-base text-[#111c2d] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006194]">event</span>
            Grade de Atendimentos do Dia ({selectedDate})
          </h3>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-[#707881]">
            <span className="material-symbols-outlined text-[48px] block mb-2 opacity-40">
              event_busy
            </span>
            Nenhuma consulta agendada para este dia. Clique em "Nova Consulta" para agendar.
          </div>
        ) : (
          <div className="divide-y divide-[#e7eeff]">
            {filteredAppointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((app) => {
                const linkedPatient = patients.find((p) => p.id === app.patientId);
                const targetPhone = app.pacienteNaoCadastrado
                  ? (app.telefonePacienteNaoCadastrado || app.patientPhone || '')
                  : (linkedPatient?.whatsapp || linkedPatient?.phone || app.patientPhone || '');

                return (
                  <div
                    key={app.id}
                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#f0f3ff]/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="px-3 py-2 bg-[#e7eeff] text-[#006194] font-bold rounded-xl text-center min-w-[70px]">
                        <p className="text-sm">{app.time}</p>
                        <p className="text-[10px] text-[#707881] font-normal">{app.durationMinutes} min</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            onClick={() => {
                              if (!app.pacienteNaoCadastrado) {
                                onViewPatientRecord(app.patientId);
                              }
                            }}
                            className={`font-bold text-base text-[#111c2d] ${
                              !app.pacienteNaoCadastrado ? 'hover:text-[#006194] cursor-pointer' : ''
                            }`}
                          >
                            {app.patientName}
                            {app.pacienteNaoCadastrado && (
                              <span className="ml-2 text-xs font-normal text-[#707881] bg-[#e7eeff] px-2 py-0.5 rounded-full">
                                Não Cadastrado
                              </span>
                            )}
                          </h4>
                          <select
                            value={app.status}
                            onChange={(e) => onUpdateStatus(app.id, e.target.value as Appointment['status'])}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006194] ${getStatusBadge(
                              app.status
                            )}`}
                            title="Alterar Status da Consulta"
                          >
                            <option value="Confirmado">Confirmado</option>
                            <option value="Aguardando">Aguardando</option>
                            <option value="Agendado">Agendado</option>
                            <option value="Em Atendimento">Em Atendimento</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </div>

                        <p className="text-xs text-[#006194] font-medium mt-0.5">
                          Procedimento: {app.procedure}
                        </p>

                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#e7eeff] text-[#006194]">
                            Convênio: {app.convenioName || 'Particular'}
                          </span>

                          {targetPhone && (
                            <a
                              href={`https://wa.me/55${targetPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#e8f8f0] text-[#006c49] hover:bg-[#d0f2e2] transition-colors"
                              title="Mandar WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[13px]">chat</span>
                              <span>{targetPhone}</span>
                            </a>
                          )}
                        </div>

                        {app.notes && (
                          <p className="text-xs text-[#3f4850] mt-1 italic">
                            "{app.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions & Status Changer */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                      {app.status !== 'Em Atendimento' &&
                        app.status !== 'Concluído' &&
                        app.status !== 'Cancelado' && (
                          <button
                            onClick={() => onUpdateStatus(app.id, 'Em Atendimento')}
                            className="px-3 py-1.5 bg-[#006194] text-white rounded-lg text-xs font-semibold hover:bg-[#004b73] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Iniciar Atendimento"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                            <span>Iniciar Atendimento</span>
                          </button>
                        )}

                      {app.status === 'Em Atendimento' && (
                        <button
                          onClick={() => onUpdateStatus(app.id, 'Concluído')}
                          className="px-3 py-1.5 bg-[#006c49] text-white rounded-lg text-xs font-semibold hover:bg-[#005236] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Concluir Consulta"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Concluir Consulta</span>
                        </button>
                      )}

                      {targetPhone && (
                        <a
                          href={`https://wa.me/55${targetPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-[#e8f8f0] text-[#006c49] hover:bg-[#d0f2e2] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-[#006c49]/20"
                          title="Mandar Lembrete no WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          <span>{targetPhone}</span>
                        </a>
                      )}

                    {!app.pacienteNaoCadastrado && (
                      <button
                        onClick={() => onViewPatientRecord(app.patientId)}
                        className="p-2 text-[#3f4850] hover:text-[#006194] hover:bg-[#e7eeff] rounded-lg transition-colors cursor-pointer"
                        title="Abrir Prontuário"
                      >
                        <span className="material-symbols-outlined text-[20px]">folder_shared</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(app)}
                      className="p-2 text-[#3f4850] hover:text-[#006194] hover:bg-[#e7eeff] rounded-lg transition-colors cursor-pointer"
                      title="Editar Agendamento"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingAppointment(app)}
                      className="p-2 text-[#3f4850] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Agendamento"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova / Editar Consulta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e7eeff] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <h3 className="font-bold text-lg text-[#111c2d]">
                {editingAppointment ? 'Editar Consulta' : 'Agendar Nova Consulta'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAppointment(null);
                }}
                className="p-1 text-[#707881] hover:text-[#111c2d] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="unregisteredCheck"
                  checked={isUnregisteredPatient}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsUnregisteredPatient(checked);
                    if (checked) {
                      setSelectedPatientId('');
                      if (['Em Atendimento', 'Concluído'].includes(status)) {
                        setStatus('Confirmado');
                      }
                    }
                    setUnregisteredNameError('');
                    setUnregisteredPhoneError('');
                    setStatusErrorMessage('');
                  }}
                  className="w-4 h-4 text-[#006194] rounded border-[#bfc7d2] cursor-pointer"
                />
                <label htmlFor="unregisteredCheck" className="text-xs font-semibold text-[#111c2d] cursor-pointer">
                  Paciente Não Cadastrado
                </label>
              </div>

              {isUnregisteredPatient ? (
                <div className="space-y-3 bg-[#f0f3ff]/50 p-3.5 rounded-xl border border-[#e7eeff]">
                  <div>
                    <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                      Nome do Paciente <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      placeholder="Nome completo do paciente"
                      value={unregisteredName}
                      onChange={(e) => {
                        setUnregisteredName(e.target.value);
                        if (e.target.value.trim()) setUnregisteredNameError('');
                      }}
                      className={`w-full p-2.5 bg-white border ${
                        unregisteredNameError ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                      } rounded-xl text-sm`}
                    />
                    {unregisteredNameError && (
                      <p className="text-xs font-semibold text-[#ba1a1a] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">error</span>
                        <span>{unregisteredNameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                      Telefone para Contato <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={unregisteredPhone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setUnregisteredPhone(formatted);
                        if (formatted.trim()) setUnregisteredPhoneError('');
                      }}
                      className={`w-full p-2.5 bg-white border ${
                        unregisteredPhoneError ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                      } rounded-xl text-sm`}
                    />
                    {unregisteredPhoneError && (
                      <p className="text-xs font-semibold text-[#ba1a1a] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">error</span>
                        <span>{unregisteredPhoneError}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    Selecione o Paciente <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <select
                    required={!isUnregisteredPatient}
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                    }}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm cursor-pointer"
                  >
                    <option value="">Selecione um Paciente...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.cpf})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Convênio <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  required
                  value={convenioId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setConvenioId(val);
                    if (val) setConvenioErrorMessage('');
                  }}
                  className={`w-full p-2.5 bg-[#f0f3ff] border ${
                    convenioErrorMessage ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                  } rounded-xl text-sm focus:outline-none focus:border-[#006194] transition-all cursor-pointer`}
                >
                  <option value="">Selecione um Convênio...</option>
                  {availableConvenios.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.nome} {!c.status ? ' (Inativo)' : ''}
                    </option>
                  ))}
                </select>
                {convenioErrorMessage && (
                  <p className="text-xs font-semibold text-[#ba1a1a] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">error</span>
                    <span>{convenioErrorMessage}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">Horário</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Status do Agendamento <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  required
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value as Appointment['status'];
                    if (isUnregisteredPatient && ['Em Atendimento', 'Concluído'].includes(newStatus)) {
                      setStatusErrorMessage('Este status só pode ser utilizado para pacientes cadastrados.');
                      return;
                    }
                    setStatusErrorMessage('');
                    setStatus(newStatus);
                  }}
                  className={`w-full p-2.5 bg-[#f0f3ff] border ${
                    statusErrorMessage ? 'border-[#ba1a1a]' : 'border-[#bfc7d2]'
                  } rounded-xl text-sm cursor-pointer font-medium text-[#111c2d] focus:outline-none focus:border-[#006194] transition-all`}
                >
                  <option value="Confirmado">Confirmado</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Agendado">Agendado</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                {statusErrorMessage && (
                  <p className="text-xs font-semibold text-[#ba1a1a] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">error</span>
                    <span>{statusErrorMessage}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    Duração (Min)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 45"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 300.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Procedimento Odontológico
                </label>
                <select
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm cursor-pointer font-medium text-[#111c2d]"
                >
                  <option value="">Selecione o Procedimento...</option>
                  {procedimentosList.map((pName, idx) => (
                    <option key={idx} value={pName}>
                      {pName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Observações de Agendamento
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instruções para o paciente..."
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAppointment(null);
                  }}
                  className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#006194] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#004b73] cursor-pointer"
                >
                  {editingAppointment ? 'Salvar Alterações' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Consulta */}
      {deletingAppointment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e7eeff] text-center">
            <div className="w-12 h-12 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px]">delete</span>
            </div>
            <h3 className="font-bold text-lg text-[#111c2d] mb-1">Excluir Agendamento?</h3>
            <p className="text-xs text-[#3f4850] mb-6">
              Tem certeza que deseja excluir o agendamento de{' '}
              <span className="font-semibold">{deletingAppointment.patientName}</span> às{' '}
              <span className="font-semibold">{deletingAppointment.time}</span>? Essa ação não poderá ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingAppointment(null)}
                className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 bg-[#ba1a1a] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#93000a] cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autenticação / Senha para Ações Restritas */}
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
                {passwordTargetAction === 'supabase_config'
                  ? 'Informe a senha de acesso para configurar a conexão com o Banco de Dados Supabase:'
                  : 'Informe a senha de acesso para criar um novo agendamento:'}
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
                <strong>Como funciona o armazenamento das credenciais?</strong>
                <p className="mt-0.5">
                  Por motivos de segurança, credenciais de banco de dados não são salvas dentro de tabelas SQL. Elas são gravadas em variáveis de ambiente e no armazenamento local seguro do seu navegador (localStorage).
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
