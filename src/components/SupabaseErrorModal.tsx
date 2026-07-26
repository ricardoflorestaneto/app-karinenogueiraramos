import React, { useState, useEffect } from 'react';
import { SupabaseErrorEventDetail } from '../lib/supabase';

export const SupabaseErrorModal: React.FC = () => {
  const [errorDetail, setErrorDetail] = useState<SupabaseErrorEventDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleDbError = (event: Event) => {
      const customEv = event as CustomEvent<SupabaseErrorEventDetail>;
      if (customEv.detail) {
        setErrorDetail(customEv.detail);
      }
    };

    window.addEventListener('supabase-database-error', handleDbError);
    return () => {
      window.removeEventListener('supabase-database-error', handleDbError);
    };
  }, []);

  if (!errorDetail) return null;

  const technicalText = `=== RELATÓRIO TÉCNICO DE ERRO DE BANCO DE DADOS ===
Operação: ${errorDetail.operation}
Data/Hora: ${errorDetail.timestamp}
Código do Erro: ${errorDetail.code || 'N/A'}
Mensagem: ${errorDetail.message}
Detalhes: ${errorDetail.details || 'Sem detalhes fornecidos pelo servidor'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(technicalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-[#ba1a1a] space-y-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header Ribbon */}
        <div className="flex items-start gap-3 pb-4 border-b border-[#ffdad6]">
          <div className="p-2.5 bg-[#ffdad6] text-[#ba1a1a] rounded-xl shrink-0">
            <span className="material-symbols-outlined text-[28px]">database_off</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#ba1a1a] leading-tight">
              Erro na Comunicação com o Banco de Dados
            </h3>
            <p className="text-xs font-semibold text-[#707881] mt-0.5">
              Operação: <span className="text-[#111c2d]">{errorDetail.operation}</span>
            </p>
          </div>
        </div>

        {/* Mandatory User Notification Message */}
        <div className="p-4 bg-[#ffdad6]/50 border border-[#ffb4ab] rounded-xl text-sm font-medium text-[#93000a] space-y-2">
          <p className="font-semibold leading-relaxed">
            Não foi possível concluir a operação devido a um erro na comunicação com o banco de dados. Entre em contato imediatamente com o setor de desenvolvimento.
          </p>
          <p className="text-xs text-[#ba1a1a]">
            A operação foi interrompida para proteger a integridade das suas informações clínicas.
          </p>
        </div>

        {/* Technical Error Details Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3f4850] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">code</span>
              Descrição Técnica do Erro:
            </span>
            <span className="text-[11px] font-mono text-[#707881]">
              Código: {errorDetail.code || 'ERRO_SUPABASE'}
            </span>
          </div>

          <div className="bg-[#1e1e1e] text-[#f8f9fa] font-mono text-xs p-4 rounded-xl space-y-2 overflow-x-auto select-all border border-[#3f4850]">
            <div>
              <span className="text-[#f14c4c] font-bold">[MENSAGEM]: </span>
              <span>{errorDetail.message}</span>
            </div>
            {errorDetail.details && (
              <div>
                <span className="text-[#cca700] font-bold">[DETALHES]: </span>
                <span>{errorDetail.details}</span>
              </div>
            )}
            <div>
              <span className="text-[#3794ff] font-bold">[TIMESTAMP]: </span>
              <span>{errorDetail.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0f3ff]">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#006194] rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#006194]/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Detalhes Copiados!' : 'Copiar Detalhes Técnicos'}</span>
          </button>

          <button
            type="button"
            onClick={() => setErrorDetail(null)}
            className="px-6 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendi / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
