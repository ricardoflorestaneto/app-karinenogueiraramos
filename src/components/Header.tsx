import React, { useState } from 'react';
import { DoctorProfile } from '../types';
import { DEFAULT_DOCTOR_PHOTO_URL } from '../mockData';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface HeaderProps {
  doctor: DoctorProfile;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNavigateToSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  doctor,
  searchQuery,
  setSearchQuery,
  onNavigateToSettings,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDoctorMenu, setShowDoctorMenu] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'Consulta Confirmada',
      desc: 'Mariana Souza confirmou agendamento das 14:00.',
      time: 'Há 15 min',
      type: 'success',
    },
    {
      id: '2',
      title: 'Retorno Ortodôntico',
      desc: '3 pacientes aguardam confirmação de limpeza semestral.',
      time: 'Há 1 hora',
      type: 'info',
    },
    {
      id: '3',
      title: 'Aviso LGPD',
      desc: 'Backup de segurança de prontuários concluído.',
      time: 'Hoje 07:00',
      type: 'system',
    },
  ];

  return (
    <header className="bg-white sticky top-0 z-30 h-16 flex justify-between items-center px-6 border-b border-[#e7eeff] shadow-xs">
      {/* Search Bar */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707881] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nome ou CPF..."
            className="w-full bg-[#f0f3ff] border border-transparent focus:border-[#006194] focus:bg-white rounded-full pl-10 pr-8 py-2 text-sm text-[#111c2d] placeholder:text-[#707881] transition-all focus:outline-none focus:ring-2 focus:ring-[#006194]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707881] hover:text-[#111c2d]"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Status da Conexão (Banco Supabase vs Local) */}
        <ConnectionStatusBadge
          variant="header"
          onNavigateToSettings={onNavigateToSettings}
        />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowHelp(false);
              setShowDoctorMenu(false);
            }}
            className="p-2 text-[#3f4850] hover:text-[#006194] hover:bg-[#f0f3ff] rounded-full transition-colors relative cursor-pointer"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full border-2 border-white animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#e7eeff] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center pb-2 mb-3 border-b border-[#e7eeff]">
                <h4 className="font-semibold text-sm text-[#111c2d] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006194] text-[18px]">notifications</span>
                  Notificações
                </h4>
                <span className="text-xs bg-[#e7eeff] text-[#006194] font-medium px-2 py-0.5 rounded-full">
                  3 novas
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 bg-[#f0f3ff] hover:bg-[#dee8ff] rounded-xl transition-colors text-xs space-y-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#111c2d]">{n.title}</span>
                      <span className="text-[10px] text-[#707881]">{n.time}</span>
                    </div>
                    <p className="text-[#3f4850] text-[11px] leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Help Dialog Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setShowHelp(!showHelp);
              setShowNotifications(false);
              setShowDoctorMenu(false);
            }}
            className="p-2 text-[#3f4850] hover:text-[#006194] hover:bg-[#f0f3ff] rounded-full transition-colors cursor-pointer"
            title="Ajuda e Suporte"
          >
            <span className="material-symbols-outlined text-[22px]">help</span>
          </button>

          {showHelp && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#e7eeff] p-4 z-50">
              <h4 className="font-semibold text-sm text-[#111c2d] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#006194] text-[18px]">help_center</span>
                Central de Ajuda
              </h4>
              <p className="text-xs text-[#3f4850] mb-3">
                Consulte atalhos do sistema de gestão odontológica ou entre em contato com nosso suporte técnico.
              </p>
              <div className="space-y-1.5 text-xs text-[#006194]">
                <a href="#suporte" onClick={(e) => { e.preventDefault(); alert('Suporte WhatsApp: (85) 988076961'); }} className="block hover:underline font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  Suporte Via WhatsApp
                </a>
                <a href="#manual" onClick={(e) => { e.preventDefault(); alert('Manual de Uso: Todos os prontuários são salvos automaticamente.'); }} className="block hover:underline font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  Guia Rápido de Uso
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Doctor Profile */}
        <div className="relative border-l border-[#bfc7d2] pl-4">
          <button
            onClick={() => {
              setShowDoctorMenu(!showDoctorMenu);
              setShowNotifications(false);
              setShowHelp(false);
            }}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-[#111c2d] group-hover:text-[#006194] transition-colors">
                {doctor.name}
              </p>
              <p className="text-xs text-[#707881]">{doctor.role.split('-')[0]}</p>
            </div>
            <div className="relative">
              <img
                src={doctor.profile_picture_url || doctor.avatarUrl || DEFAULT_DOCTOR_PHOTO_URL}
                alt={doctor.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#006194]/30 shadow-xs group-hover:border-[#006194] transition-all"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#006c49] border-2 border-white rounded-full"></span>
            </div>
          </button>

          {showDoctorMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e7eeff] p-3 z-50">
              <div className="p-2 border-b border-[#e7eeff] mb-2">
                <p className="font-semibold text-sm text-[#111c2d]">{doctor.name}</p>
                <p className="text-xs text-[#006194] font-medium">{doctor.cro}</p>
                <p className="text-[11px] text-[#707881] mt-0.5">{doctor.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowDoctorMenu(false);
                  onNavigateToSettings();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#3f4850] hover:bg-[#f0f3ff] hover:text-[#006194] rounded-xl transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                Editar Perfil do Consultório
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
