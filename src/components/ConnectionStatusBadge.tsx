import React, { useState, useEffect } from 'react';
import { getCurrentConnectionInfo, pingSupabaseDatabase, DatabaseConnectionInfo } from '../lib/supabase';

interface ConnectionStatusBadgeProps {
  variant?: 'header' | 'compact' | 'sidebar' | 'banner';
  onNavigateToSettings?: () => void;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  variant = 'header',
  onNavigateToSettings,
}) => {
  const [info, setInfo] = useState<DatabaseConnectionInfo>(() => getCurrentConnectionInfo());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ online: boolean; latencyMs: number; message: string } | null>(null);
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    // Initial check
    const current = getCurrentConnectionInfo();
    setInfo(current);

    // Initial ping
    if (current.isOnline) {
      pingSupabaseDatabase().then((res) => {
        setTestResult(res);
        setInfo(getCurrentConnectionInfo());
      });
    }

    // Refresh every 30s or on window focus
    const handleFocus = () => {
      setInfo(getCurrentConnectionInfo());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleManualPing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsTesting(true);
    try {
      const res = await pingSupabaseDatabase();
      setTestResult(res);
      setInfo(getCurrentConnectionInfo());
    } finally {
      setIsTesting(false);
    }
  };

  const isCloud = info.mode === 'database';

  // VARIANT: SIDEBAR
  if (variant === 'sidebar') {
    return (
      <div className="w-full bg-white/70 border border-[#e7eeff] rounded-xl p-2.5 flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-[#111c2d]">
            <span
              className={`w-2 h-2 rounded-full ${
                isCloud ? 'bg-[#006c49] animate-pulse' : 'bg-[#b97500]'
              }`}
            />
            <span className="truncate">{isCloud ? 'Banco Supabase' : 'Modo Local'}</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isCloud ? 'bg-[#d2f3db] text-[#006c49]' : 'bg-[#ffedc2] text-[#825400]'
            }`}
          >
            {isCloud ? 'Online' : 'Offline'}
          </span>
        </div>
        <p className="text-[11px] text-[#707881] truncate">
          {info.sourceLabel}
        </p>
      </div>
    );
  }

  // VARIANT: COMPACT (for page headers)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-2xs ${
          isCloud
            ? 'bg-[#eaf8f0] text-[#006c49] border-[#b4e8c8]'
            : 'bg-[#fff9eb] text-[#825400] border-[#fce2a6]'
        }`}
        title={`Conexão: ${info.label} (${info.sourceLabel})`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isCloud ? 'bg-[#006c49] animate-pulse' : 'bg-[#b97500]'
          }`}
        />
        <span className="material-symbols-outlined text-[16px]">
          {isCloud ? 'cloud_done' : 'dns'}
        </span>
        <span>{isCloud ? 'Conectado ao Banco (Supabase)' : 'Armazenamento Local'}</span>
      </div>
    );
  }

  // VARIANT: BANNER
  if (variant === 'banner') {
    return (
      <div
        className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-2xs ${
          isCloud
            ? 'bg-[#eaf8f0]/80 border-[#b4e8c8] text-[#006c49]'
            : 'bg-[#fff9eb] border-[#fce2a6] text-[#825400]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isCloud ? 'bg-[#006c49] text-white' : 'bg-[#b97500] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCloud ? 'cloud_done' : 'save'}
            </span>
          </div>
          <div>
            <div className="font-bold flex items-center gap-2 text-sm text-[#111c2d]">
              <span>{isCloud ? 'Banco de Dados em Nuvem (Supabase)' : 'Armazenamento Local (Offline)'}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isCloud ? 'bg-[#d2f3db] text-[#006c49]' : 'bg-[#ffedc2] text-[#825400]'
                }`}
              >
                {isCloud ? 'Conectado' : 'Cache Local'}
              </span>
            </div>
            <p className="text-[#3f4850] text-[11px] mt-0.5">
              Origem da Conexão: <strong className="font-semibold">{info.sourceLabel}</strong>
              {isCloud && info.url && ` • Host: ${info.url.replace(/^https?:\/\//, '')}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCloud && (
            <button
              onClick={handleManualPing}
              disabled={isTesting}
              className="px-3 py-1.5 bg-white border border-[#b4e8c8] text-[#006c49] hover:bg-[#d2f3db] rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[15px] ${isTesting ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>
          )}
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="px-3 py-1.5 bg-[#006194] text-white hover:bg-[#004b73] rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">settings</span>
              <span>Configurar</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // DEFAULT VARIANT: HEADER (Dropdown popover)
  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
          isCloud
            ? 'bg-[#eaf8f0] text-[#006c49] border-[#b4e8c8] hover:bg-[#dff5e7]'
            : 'bg-[#fff9eb] text-[#825400] border-[#fce2a6] hover:bg-[#fff2d2]'
        }`}
        title="Clique para ver detalhes da conexão com o Banco de Dados"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isCloud ? 'bg-[#006c49] animate-pulse' : 'bg-[#b97500]'
          }`}
        />
        <span className="material-symbols-outlined text-[16px]">
          {isCloud ? 'cloud_done' : 'save'}
        </span>
        <span className="hidden sm:inline">
          {isCloud ? 'Banco Supabase' : 'Modo Local'}
        </span>
        <span className="material-symbols-outlined text-[14px] opacity-70">
          arrow_drop_down
        </span>
      </button>

      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-[#e7eeff] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isCloud ? 'bg-[#006c49] text-white' : 'bg-[#b97500] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isCloud ? 'database' : 'storage'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#111c2d]">
                    Status da Conexão
                  </h4>
                  <span className="text-[11px] text-[#707881]">
                    {isCloud ? 'PostgreSQL em Nuvem' : 'Memória do Navegador'}
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  isCloud ? 'bg-[#d2f3db] text-[#006c49]' : 'bg-[#ffedc2] text-[#825400]'
                }`}
              >
                {isCloud ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>

            {/* Popover Content */}
            <div className="py-3 space-y-2.5 text-xs">
              <div className="bg-[#f0f3ff] p-2.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-[#3f4850]">
                  <span>Modo Atual:</span>
                  <strong className="text-[#111c2d] font-bold">
                    {isCloud ? 'Banco de Dados (Supabase)' : 'Armazenamento Local'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[#3f4850]">
                  <span>Origem da Configuração:</span>
                  <strong className="text-[#006194] font-semibold">
                    {info.sourceLabel}
                  </strong>
                </div>
                {isCloud && (
                  <div className="flex justify-between items-center text-[#3f4850] pt-1 border-t border-[#dee8ff]">
                    <span>Endpoint Supabase:</span>
                    <span className="font-mono text-[10px] text-[#111c2d] truncate max-w-[170px]" title={info.url}>
                      {info.url}
                    </span>
                  </div>
                )}
                {testResult?.latencyMs ? (
                  <div className="flex justify-between items-center text-[#3f4850]">
                    <span>Latência de Resposta:</span>
                    <span className="text-[#006c49] font-bold font-mono">
                      {testResult.latencyMs}ms
                    </span>
                  </div>
                ) : null}
              </div>

              {testResult?.message && (
                <p className="text-[11px] text-[#3f4850] px-1 italic">
                  {testResult.message}
                </p>
              )}
            </div>

            {/* Popover Actions */}
            <div className="pt-2 border-t border-[#e7eeff] flex gap-2">
              <button
                onClick={handleManualPing}
                disabled={isTesting}
                className="flex-1 bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#006194] py-2 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[15px] ${isTesting ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{isTesting ? 'Verificando...' : 'Testar Conexão'}</span>
              </button>

              {onNavigateToSettings && (
                <button
                  onClick={() => {
                    setShowPopover(false);
                    onNavigateToSettings();
                  }}
                  className="bg-[#006194] text-white hover:bg-[#004b73] px-3 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Configurar Supabase"
                >
                  <span className="material-symbols-outlined text-[15px]">settings</span>
                  <span>Ajustar</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
