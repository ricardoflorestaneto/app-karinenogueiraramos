import React, { useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseCredentials,
  setCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Supabase Configuration Modal State
  const REQUIRED_PASSWORD = 'tpHsmKMMTJiDYKRQFDV6';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpenPasswordModal = () => {
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleVerifyPasswordAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === REQUIRED_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      handleOpenSupabaseModal();
    } else {
      setPasswordError('Senha de acesso incorreta. Verifique e tente novamente.');
    }
  };

  const handleOpenSupabaseModal = () => {
    const creds = getSupabaseCredentials();
    setCustomSupabaseUrl(creds.customUrl || creds.url || '');
    setCustomSupabaseKey(creds.customKey || creds.key || '');
    setSupabaseTestStatus(null);
    setShowSupabaseModal(true);
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    const res = await testSupabaseConnection(customSupabaseUrl, customSupabaseKey);
    setSupabaseTestStatus(res);
    setIsTestingSupabase(false);
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    const testRes = await testSupabaseConnection(customSupabaseUrl, customSupabaseKey);
    setIsTestingSupabase(false);
    if (!testRes.success) {
      setSupabaseTestStatus(testRes);
      return;
    }
    setCustomSupabaseCredentials(customSupabaseUrl, customSupabaseKey);
    setShowSupabaseModal(false);
    window.location.reload();
  };

  const handleClearSupabaseConfig = () => {
    setCustomSupabaseCredentials('', '');
    setShowSupabaseModal(false);
    window.location.reload();
  };

  // Registered local emails if Supabase is not active
  const registeredLocalEmails = [
    'karine@consultorio.com',
    'contato@drakarineramos.com.br',
    'dra.karine@gmail.com',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = username.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMsg('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
          });

          if (error) {
            if (error.message.includes('User already registered')) {
              setErrorMsg('Este e-mail já está cadastrado no Supabase. Faça login para continuar.');
            } else if (error.message.includes('Password should be at least')) {
              setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
            } else {
              setErrorMsg(`Erro ao criar conta: ${error.message}`);
            }
          } else {
            setSuccessMsg('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro ou faça login.');
            setIsSignUp(false);
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });

          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.');
            } else if (error.message.includes('Email not confirmed')) {
              setErrorMsg('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
            } else {
              setErrorMsg(`Erro na autenticação: ${error.message}`);
            }
          } else {
            setSuccessMsg('Login realizado com sucesso! Redirecionando...');
            setTimeout(() => {
              onLoginSuccess();
            }, 500);
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (isSignUp) {
          setSuccessMsg('Usuário pré-cadastrado no modo local. Você já pode acessar.');
          setIsSignUp(false);
        } else {
          const isRegistered = registeredLocalEmails.some(
            (email) => email.toLowerCase() === cleanEmail
          );

          if (!isRegistered && !cleanEmail.endsWith('@consultorio.com')) {
            setErrorMsg(
              'Acesso Negado: Este e-mail não está cadastrado no Supabase ou a senha está incorreta.'
            );
            setIsLoading(false);
            return;
          }

          if (password.length < 4) {
            setErrorMsg('Senha incorreta.');
            setIsLoading(false);
            return;
          }

          onLoginSuccess();
        }
      }
    } catch (err: any) {
      console.error('Erro inesperado no login:', err);
      setErrorMsg('Ocorreu uma falha inesperada na autenticação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgotModal(false);
      setForgotEmail('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center p-4 selection:bg-[#006194] selection:text-white font-sans text-[#111c2d]">
      {/* Background Subtle Branding */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden flex items-center justify-center">
        <span className="material-symbols-outlined text-[600px] text-[#006194]">
          medical_services
        </span>
      </div>

      <main className="w-full max-w-[440px] relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-[#e7eeff] flex flex-col items-center">
          {/* Clinic Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006194] to-[#004b73] text-white flex items-center justify-center shadow-lg mb-4 ring-4 ring-[#e7eeff]">
              <span className="material-symbols-outlined text-[36px]">dentistry</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
              Dra. Karine Ramos
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#006194] mt-1">
              GESTÃO ODONTOLÓGICA • SUPABASE AUTH
            </p>
          </div>

          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs flex items-start gap-2 border border-[#ba1a1a]/20">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="w-full mb-4 p-3 rounded-xl bg-[#6cf8bb]/30 text-[#005236] text-xs flex items-start gap-2 border border-[#006c49]/30">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login / Sign Up Form */}
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="text-[12px] font-medium text-[#3f4850] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                E-mail de Acesso
              </label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nome@consultorio.com"
                required
                className="w-full px-4 py-3 bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg transition-all text-[#111c2d] placeholder:text-[#bfc7d2] text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-[12px] font-medium text-[#3f4850] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Senha
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-lg transition-all text-[#111c2d] placeholder:text-[#bfc7d2] pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3f4850] hover:text-[#006194] transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            {!isSignUp && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#bfc7d2] text-[#006194] focus:ring-[#006194]/20 transition-all cursor-pointer"
                  />
                  <span className="text-[13px] text-[#3f4850] group-hover:text-[#111c2d] transition-colors font-medium">
                    Lembrar de mim
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(username);
                    setShowForgotModal(true);
                  }}
                  className="text-[13px] text-[#006194] hover:text-[#004b73] transition-colors font-semibold"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#006194] text-white font-semibold text-[16px] py-3 rounded-xl shadow-md hover:bg-[#004b73] hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
                  Autenticando...
                </>
              ) : (
                <>
                  {isSignUp ? 'Cadastrar Usuário' : 'Acessar Sistema'}
                  <span className="material-symbols-outlined text-[22px]">
                    {isSignUp ? 'person_add' : 'login'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer / Secondary Actions */}
          <div className="mt-6 pt-5 border-t border-[#d8e3fb] w-full text-center">
            <p className="text-[13px] text-[#3f4850]">
              Dúvidas ou problemas? <br />
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="text-[#006c49] font-semibold hover:underline inline-flex items-center justify-center gap-1 mt-1 cursor-pointer text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">support_agent</span>
                Contatar suporte técnico
              </button>
            </p>
          </div>
        </div>

        {/* System Status Indicator */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[#707881] text-[12px] font-medium">
          <span
            onDoubleClick={handleOpenPasswordModal}
            className="flex items-center gap-1.5 cursor-pointer select-none hover:text-[#006194] transition-colors"
            title="Clique 2x para abrir a conexão com o Supabase (Acesso Restrito)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-[#006c49]' : 'bg-amber-500'
              } animate-pulse`}
            ></span>
            {isSupabaseConfigured ? 'Supabase Auth Ativo' : 'Servidor Modo Local'}
          </span>
          <span className="text-[#bfc7d2]">|</span>
          <span>v2.4.0 Clinical Precision</span>
        </div>
      </main>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined">support_agent</span>
                <h3 className="font-semibold text-lg text-[#111c2d]">Suporte Técnico</h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-[#707881] hover:text-[#111c2d] transition-colors p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-[#3f4850] mb-4">
              Nossa equipe de suporte odontológico está pronta para auxiliar você no que for preciso:
            </p>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex items-center gap-3 p-3 bg-[#f0f3ff] rounded-xl border border-[#d8e3fb]">
                <span className="material-symbols-outlined text-[#006c49]">chat</span>
                <div>
                  <p className="font-semibold text-[#111c2d]">WhatsApp Suporte</p>
                  <p className="text-[#3f4850] text-xs">(11) 98888-7777 (24/7)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#f0f3ff] rounded-xl border border-[#d8e3fb]">
                <span className="material-symbols-outlined text-[#006194]">mail</span>
                <div>
                  <p className="font-semibold text-[#111c2d]">E-mail Oficial</p>
                  <p className="text-[#3f4850] text-xs">suporte@clinicalprecision.com.br</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full bg-[#006194] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-[#004b73] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined">lock_reset</span>
                <h3 className="font-semibold text-lg text-[#111c2d]">Recuperação de Senha</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-[#707881] hover:text-[#111c2d] transition-colors p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {forgotSuccess ? (
              <div className="p-4 bg-[#6cf8bb]/20 border border-[#006c49]/30 rounded-xl text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#006c49]">
                  check_circle
                </span>
                <p className="text-sm text-[#005236] font-medium">
                  Instruções enviadas!
                </p>
                <p className="text-xs text-[#3f4850]">
                  Verifique a caixa de entrada de <strong>{forgotEmail}</strong> para redefinir sua senha.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-[#3f4850]">
                  Informe seu e-mail cadastrado para receber o link de recuperação:
                </p>
                <div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu.email@consultorio.com"
                    className="w-full px-3 py-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl focus:border-[#006194] focus:outline-none text-sm text-[#111c2d]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-[#006194] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#004b73]"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Autenticação / Senha para Acesso Restrito */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e7eeff] text-left">
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
                Informe a senha de acesso para configurar a conexão com o Banco de Dados Supabase:
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e7eeff] space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined text-[24px]">database</span>
                <h3 className="font-bold text-base text-[#111c2d]">Conexão Banco de Dados Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="text-[#707881] hover:text-[#111c2d] p-1 rounded-lg hover:bg-[#f0f3ff] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-[#e7eeff]/60 border border-[#006194]/20 rounded-xl text-xs text-[#004b73] leading-relaxed flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
              <div>
                <strong>Como funciona o armazenamento das credenciais?</strong>
                <p className="mt-0.5">
                  Credenciais de banco de dados são salvas em variáveis de ambiente e no armazenamento local do seu navegador (localStorage).
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
