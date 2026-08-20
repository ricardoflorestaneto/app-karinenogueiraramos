import React, { useState, useEffect } from 'react';
import {
  getCurrentConnectionInfo,
  pingSupabaseDatabase,
  getSupabaseCredentials,
  setCustomSupabaseCredentials,
  testSupabaseConnection,
  DatabaseConnectionInfo,
} from '../lib/supabase';
import { APP_VERSION } from '../version';

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

  // Security password requirement
  const REQUIRED_PASSWORD = 'tpHsmKMMTJiDYKRQFDV6';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Supabase Configuration Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configTestStatus, setConfigTestStatus] = useState<{ success: boolean; message: string } | null>(null);

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

  // Triggered when user clicks "Ajustar" or "Configurar"
  const handleOpenSettingsClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowPopover(false);
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === REQUIRED_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordError('');
      // Pre-fill current credentials
      const creds = getSupabaseCredentials();
      setCustomUrl(creds.customUrl || creds.url || '');
      setCustomKey(creds.customKey || creds.key || '');
      setConfigTestStatus(null);
      setShowConfigModal(true);
    } else {
      setPasswordError('Senha incorreta. Acesso não autorizado.');
    }
  };

  const handleTestSupabaseConfig = async () => {
    setIsTestingConfig(true);
    setConfigTestStatus(null);
    try {
      const res = await testSupabaseConnection(customUrl, customKey);
      setConfigTestStatus(res);
    } finally {
      setIsTestingConfig(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSupabaseCredentials(customUrl, customKey);
    setShowConfigModal(false);
    alert('Configuração do Supabase salva com sucesso! A página será atualizada.');
    window.location.reload();
  };

  const handleResetToDefault = () => {
    if (confirm('Deseja restaurar as credenciais padrão do sistema?')) {
      setCustomSupabaseCredentials('', '');
      setShowConfigModal(false);
      alert('Credenciais padrão restauradas! A página será atualizada.');
      window.location.reload();
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
        <div className="flex items-center justify-between text-[11px] text-[#707881] pt-0.5">
          <span className="truncate">{info.sourceLabel}</span>
          <span className="font-mono text-[10px] text-[#006194] font-semibold">{APP_VERSION}</span>
        </div>
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
      <>
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
            <button
              onClick={handleOpenSettingsClick}
              className="px-3 py-1.5 bg-[#006194] text-white hover:bg-[#004b73] rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Configurar</span>
            </button>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && renderPasswordModal()}

        {/* Supabase Config Modal */}
        {showConfigModal && renderConfigModal()}
      </>
    );
  }

  // Helper: Render Password Modal
  function renderPasswordModal() {
    return (
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

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Informe a senha de acesso para visualizar e alterar a conexão com o Banco de Dados:
            </p>

            <div>
              <input
                type="password"
                autoFocus
                required
                placeholder="Digite a senha de segurança"
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
    );
  }

  // Helper: Render Supabase Config Modal
  function renderConfigModal() {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e7eeff] space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff]">
            <div className="flex items-center gap-2 text-[#006194]">
              <span className="material-symbols-outlined text-[24px]">database</span>
              <h3 className="font-bold text-base text-[#111c2d]">Conexão Banco de Dados Supabase</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="text-[#707881] hover:text-[#111c2d] p-1 rounded-lg hover:bg-[#f0f3ff] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-3 bg-[#e7eeff]/60 border border-[#006194]/20 rounded-xl text-xs text-[#004b73] leading-relaxed flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
            <div>
              <strong>Configuração de Conexão com o Supabase</strong>
              <p className="mt-0.5">
                Informe a URL do seu Projeto Supabase e a Chave Pública (Anon Key). Os dados ficam protegidos no seu navegador.
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
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setConfigTestStatus(null);
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
                value={customKey}
                onChange={(e) => {
                  setCustomKey(e.target.value);
                  setConfigTestStatus(null);
                }}
                className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-xs font-mono text-[#111c2d] focus:outline-none focus:border-[#006194]"
              />
            </div>

            {configTestStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  configTestStatus.success
                    ? 'bg-[#e8f8f0] text-[#006c49] border border-[#006c49]/30'
                    : 'bg-[#ffdad6] text-[#93000a] border border-[#ffdad6]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {configTestStatus.success ? 'check_circle' : 'error'}
                </span>
                <span>{configTestStatus.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e7eeff]">
              <button
                type="button"
                onClick={handleTestSupabaseConfig}
                disabled={isTestingConfig || !customUrl || !customKey}
                className="px-4 py-2 border border-[#006194] text-[#006194] hover:bg-[#f0f3ff] disabled:opacity-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${isTestingConfig ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{isTestingConfig ? 'Testando...' : 'Testar Conexão'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl font-medium transition-colors cursor-pointer"
                  title="Restaurar valores padrão"
                >
                  Restaurar Padrão
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006194] text-white hover:bg-[#004b73] rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Salvar e Conectar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // DEFAULT VARIANT: HEADER (Dropdown popover)
  return (
    <>
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
                  <div className="flex justify-between items-center text-[#3f4850]">
                    <span>Versão do Sistema:</span>
                    <span className="font-mono font-bold text-[#006194] bg-[#dee8ff] px-1.5 py-0.5 rounded text-[10px]">
                      {APP_VERSION}
                    </span>
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

                <button
                  onClick={handleOpenSettingsClick}
                  className="bg-[#006194] text-white hover:bg-[#004b73] px-3 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Configurar Supabase (Requer Senha)"
                >
                  <span className="material-symbols-outlined text-[15px]">lock</span>
                  <span>Ajustar</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && renderPasswordModal()}

      {/* Supabase Config Modal */}
      {showConfigModal && renderConfigModal()}
    </>
  );
};
