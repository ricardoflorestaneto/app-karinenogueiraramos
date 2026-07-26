import React from 'react';
import { ActiveTab, DoctorProfile } from '../types';

interface SidebarProps {
  doctor?: DoctorProfile;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  patientCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  doctor,
  activeTab,
  setActiveTab,
  onLogout,
  patientCount = 0,
}) => {
  const isPatientsActive = activeTab === 'dashboard' || activeTab === 'patients' || activeTab === 'prontuario';

  return (
    <aside className="h-full w-64 fixed left-0 top-0 flex flex-col py-6 bg-[#f0f3ff] shadow-sm z-40 border-r border-[#e7eeff]">
      {/* Brand Header */}
      <div className="px-4 mb-8 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#007bb9] rounded-lg flex items-center justify-center text-white shadow-xs overflow-hidden shrink-0">
            {doctor?.avatarUrl ? (
              <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[24px]">dentistry</span>
            )}
          </div>
          <div>
            <h1 className="font-semibold text-[18px] text-[#006194] leading-tight">
              {doctor?.name || 'Dra. Karine Nogueira'}
            </h1>
            <p className="text-[12px] text-[#3f4850] font-medium">
              {doctor?.clinicName || doctor?.role || 'Dental Management'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1.5 px-2">
        <button
          onClick={() => setActiveTab('patients')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm text-left ${
            isPatientsActive
              ? 'text-[#006194] font-bold border-r-4 border-[#006194] bg-[#e7eeff] shadow-xs'
              : 'text-[#3f4850] hover:bg-[#dee8ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">group</span>
          <span className="flex-1">Pacientes</span>
          {patientCount > 0 && (
            <span className="text-[11px] bg-[#007bb9] text-white font-bold px-2 py-0.5 rounded-full">
              {patientCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm text-left ${
            activeTab === 'appointments'
              ? 'text-[#006194] font-bold border-r-4 border-[#006194] bg-[#e7eeff] shadow-xs'
              : 'text-[#3f4850] hover:bg-[#dee8ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          <span>Agenda de Consultas</span>
        </button>

        {/* Cadastros Group */}
        <div className="pt-2 space-y-1">
          <div className="px-3.5 pb-1 flex items-center gap-1.5 text-[11px] font-bold text-[#707881] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">folder_open</span>
            <span>Cadastros</span>
          </div>
          <button
            onClick={() => setActiveTab('convenios')}
            className={`w-full flex items-center gap-3 pl-6 pr-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm text-left ${
              activeTab === 'convenios'
                ? 'text-[#006194] font-bold border-r-4 border-[#006194] bg-[#e7eeff] shadow-xs'
                : 'text-[#3f4850] hover:bg-[#dee8ff] hover:text-[#111c2d]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
            <span>Convênios</span>
          </button>
          <button
            onClick={() => setActiveTab('procedimentos')}
            className={`w-full flex items-center gap-3 pl-6 pr-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm text-left ${
              activeTab === 'procedimentos'
                ? 'text-[#006194] font-bold border-r-4 border-[#006194] bg-[#e7eeff] shadow-xs'
                : 'text-[#3f4850] hover:bg-[#dee8ff] hover:text-[#111c2d]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">medical_services</span>
            <span>Procedimentos Odontológicos</span>
          </button>
        </div>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm text-left ${
            activeTab === 'settings'
              ? 'text-[#006194] font-bold border-r-4 border-[#006194] bg-[#e7eeff] shadow-xs'
              : 'text-[#3f4850] hover:bg-[#dee8ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Configurações</span>
        </button>
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto px-4 space-y-3 pt-4 border-t border-[#d8e3fb]">
        <button
          onClick={() => setActiveTab('new-patient')}
          className="w-full bg-[#006194] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#004b73] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Novo Paciente
        </button>

        <button
          onClick={onLogout}
          className="w-full text-[#3f4850] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
};
