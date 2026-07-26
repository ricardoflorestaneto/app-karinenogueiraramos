import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
          // Perform Supabase Auth Sign Up
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.user) {
            setSuccessMsg('Conta criada com sucesso no Supabase! Você já pode entrar.');
            setIsSignUp(false);
            setIsLoading(false);
            return;
          }
        } else {
          // Perform Supabase Auth Sign In
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });

          if (error) {
            if (
              error.message.includes('Invalid login credentials') ||
              error.message.includes('User not found') ||
              error.status === 400
            ) {
              throw new Error(
                'Acesso Negado: Este e-mail não está cadastrado no Supabase ou a senha está incorreta.'
              );
            }
            throw new Error(error.message);
          }

          if (data.session || data.user) {
            setIsLoading(false);
            onLoginSuccess();
            return;
          }
        }
      } else {
        // Fallback local verification when Supabase environment variables are pending configuration
        if (!registeredLocalEmails.includes(cleanEmail)) {
          throw new Error(
            'E-mail não cadastrado no sistema. Por favor, utilize o e-mail cadastrado (ex: karine@consultorio.com) ou configure o Supabase.'
          );
        }

        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess();
        }, 800);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Falha ao realizar autenticação.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSupabaseConfigured && supabase && forgotEmail) {
      await supabase.auth.resetPasswordForEmail(forgotEmail);
    }
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgotModal(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 glass-background relative overflow-hidden bg-[#f9f9ff]">
      {/* Decorative Atmospheric Floating Circles */}
      <div
        className="absolute top-20 left-20 w-64 h-64 bg-[#006194]/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute bottom-20 right-20 w-80 h-80 bg-[#006c49]/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      />

      <main className="w-full max-w-[440px] z-10 my-auto">
        {/* Central Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-[#e7eeff]">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 bg-[#007bb9] rounded-xl flex items-center justify-center mb-3 shadow-sm text-white">
              <span className="material-symbols-outlined text-[40px]">dentistry</span>
            </div>
            <h1 className="text-[20px] leading-[28px] font-semibold text-[#111c2d] tracking-tight">
              Dra. Karine Nogueira Ramos
            </h1>
            <p className="text-[12px] leading-[18px] text-[#3f4850] uppercase tracking-wider font-medium mt-0.5">
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
          <span className="flex items-center gap-1.5">
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
              className="w-full bg-[#006194] text-white py-2.5 rounded-xl font-medium hover:bg-[#004b73] transition-colors"
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
                <span className="material-symbols-outlined text-[36px] text-[#006c49]">
                  check_circle
                </span>
                <p className="font-semibold text-[#111c2d]">Instruções enviadas!</p>
                <p className="text-xs text-[#3f4850]">
                  Verifique a caixa de entrada de <strong>{forgotEmail}</strong> para redefinir sua senha.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-sm text-[#3f4850]">
                  Digite seu e-mail cadastrado para receber um link seguro de redefinição de acesso.
                </p>
                <div>
                  <label className="block text-xs font-medium text-[#3f4850] mb-1">
                    E-mail Cadastrado
                  </label>
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
    </div>
  );
};
