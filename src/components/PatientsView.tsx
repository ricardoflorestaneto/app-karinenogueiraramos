import React, { useState, useMemo } from 'react';
import { Patient, ActiveTab } from '../types';

interface PatientsViewProps {
  patients: Patient[];
  searchQuery: string;
  onNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onViewProntuario: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  onNewAppointment: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  searchQuery,
  onNewPatient,
  onEditPatient,
  onViewProntuario,
  onDeletePatient,
  onNewAppointment,
}) => {
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter logic
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cpf.includes(searchQuery) ||
        p.phone.includes(searchQuery) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'Ativo' && p.active) ||
        (statusFilter === 'Inativo' && !p.active);

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(start, start + itemsPerPage);
  }, [filteredPatients, currentPage]);

  const activeCount = patients.filter((p) => p.active).length;

  const newThisMonthCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return patients.filter((p) => {
      if (!p.registrationDate) return false;
      const dateStr = p.registrationDate.trim();

      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length >= 2) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          return year === currentYear && month === currentMonth;
        }
      }

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return year === currentYear && month === currentMonth;
        }
      }

      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }

      return false;
    }).length;
  }, [patients]);

  const exportToCSV = () => {
    const headers = ['Nome', 'CPF', 'Telefone', 'E-mail', 'Cidade', 'Estado', 'Status', 'Última Visita'];
    const rows = filteredPatients.map((p) => [
      p.name,
      p.cpf,
      p.phone,
      p.email,
      p.city,
      p.state,
      p.active ? 'Ativo' : 'Inativo',
      p.lastVisit,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_pacientes_consultorio.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1280px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#111c2d] tracking-tight">
            Gerenciamento de Pacientes
          </h2>
          <p className="text-sm text-[#3f4850] mt-1">
            Visualize e edite as informações clínicas da sua base de dados.
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="bg-[#dee8ff] text-[#006194] hover:bg-[#d8e3fb] px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span>Filtros ({statusFilter})</span>
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#e7eeff] p-2 z-30">
                <p className="text-xs font-semibold text-[#707881] px-3 py-1">Filtrar por Status</p>
                {(['Todos', 'Ativo', 'Inativo'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setCurrentPage(1);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                      statusFilter === st
                        ? 'bg-[#e7eeff] text-[#006194] font-bold'
                        : 'text-[#3f4850] hover:bg-[#f0f3ff]'
                    }`}
                  >
                    <span>{st}</span>
                    {statusFilter === st && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onNewPatient}
            className="bg-[#006194] text-white hover:bg-[#004b73] px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e7eeff] flex flex-col gap-2">
          <span className="text-[#006194] material-symbols-outlined text-3xl">group</span>
          <span className="text-[#3f4850] text-xs font-medium">Total de Pacientes</span>
          <span className="text-[#111c2d] font-bold text-2xl leading-none">
            {patients.length}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e7eeff] flex flex-col gap-2">
          <span className="text-[#006c49] material-symbols-outlined text-3xl">check_circle</span>
          <span className="text-[#3f4850] text-xs font-medium">Pacientes Ativos</span>
          <span className="text-[#111c2d] font-bold text-2xl leading-none">
            {activeCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e7eeff] flex flex-col gap-2">
          <span className="text-[#707881] material-symbols-outlined text-3xl">cancel</span>
          <span className="text-[#3f4850] text-xs font-medium">Pacientes Inativos</span>
          <span className="text-[#111c2d] font-bold text-2xl leading-none">
            {patients.length - activeCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e7eeff] flex flex-col gap-2">
          <span className="text-[#007bb9] material-symbols-outlined text-3xl">person_add</span>
          <span className="text-[#3f4850] text-xs font-medium">Novos Este Mês</span>
          <span className="text-[#111c2d] font-bold text-2xl leading-none">
            {newThisMonthCount}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e7eeff] overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-[#e7eeff] flex justify-between items-center bg-white">
          <h3 className="font-semibold text-lg text-[#111c2d]">
            Lista de Pacientes{' '}
            <span className="text-xs text-[#707881] font-normal ml-2">
              ({filteredPatients.length} cadastrado{filteredPatients.length !== 1 ? 's' : ''})
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="p-2 text-[#3f4850] hover:bg-[#f0f3ff] hover:text-[#006194] rounded-lg transition-colors cursor-pointer"
              title="Exportar CSV"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-[#3f4850] hover:bg-[#f0f3ff] hover:text-[#006194] rounded-lg transition-colors cursor-pointer"
              title="Imprimir Tabela"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-xs font-semibold text-[#3f4850] uppercase tracking-wider">
                <th className="px-6 py-3.5">Paciente</th>
                <th className="px-6 py-3.5">CPF</th>
                <th className="px-6 py-3.5">Contato</th>
                <th className="px-6 py-3.5">Cidade</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7eeff] text-sm">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#707881]">
                    <span className="material-symbols-outlined text-[48px] block mb-2 opacity-40">
                      search_off
                    </span>
                    Nenhum paciente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-[#f0f3ff]/60 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#cce5ff] flex items-center justify-center text-[#006194] font-bold text-sm shrink-0">
                          {patient.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-[#111c2d] hover:text-[#006194] cursor-pointer" onClick={() => onEditPatient(patient)}>
                            {patient.name}
                          </p>
                          <p className="text-xs text-[#707881]">Última visita: {patient.lastVisit}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[#3f4850] font-mono text-xs">{patient.cpf}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#3f4850] text-xs">{patient.whatsapp || patient.phone}</span>
                        <a
                          href={`https://web.whatsapp.com/send?phone=55${(patient.whatsapp || patient.phone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-[#006c49] hover:bg-[#6cf8bb]/20 rounded-md transition-colors"
                          title="Abrir WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                        </a>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[#3f4850]">{patient.city}</td>

                    <td className="px-6 py-4">
                      {patient.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#6cf8bb]/40 text-[#00714d]">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d8e3fb] text-[#3f4850]">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNewAppointment(patient)}
                          className="p-2 text-[#006194] hover:bg-[#e7eeff] rounded-lg transition-colors cursor-pointer"
                          title="Novo Agendamento"
                        >
                          <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                        </button>
                        <button
                          onClick={() => onViewProntuario(patient)}
                          className="p-2 text-[#006194] hover:bg-[#e7eeff] rounded-lg transition-colors cursor-pointer"
                          title="Ver Prontuário & Odontograma"
                        >
                          <span className="material-symbols-outlined text-[20px]">medical_information</span>
                        </button>
                        <button
                          onClick={() => onEditPatient(patient)}
                          className="p-2 text-[#707881] hover:text-[#006194] hover:bg-[#f0f3ff] rounded-lg transition-colors cursor-pointer"
                          title="Editar Cadastro"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-[#e7eeff] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#707881]">
            Mostrando{' '}
            {filteredPatients.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{' '}
            a {Math.min(currentPage * itemsPerPage, filteredPatients.length)} de{' '}
            {filteredPatients.length} pacientes
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-[#bfc7d2] hover:bg-[#f0f3ff] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#006194] text-white'
                    : 'text-[#111c2d] hover:bg-[#f0f3ff]'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-[#bfc7d2] hover:bg-[#f0f3ff] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
