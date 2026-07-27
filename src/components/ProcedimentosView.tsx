import React, { useState, useEffect, useMemo } from 'react';
import { Procedimento } from '../types';
import { getSupabase, getIsSupabaseConfigured, notifySupabaseDatabaseError} from '../lib/supabase';

const initialProcedimentosData: Procedimento[] = [
  { id: 1, nome: 'Avaliação Odontológica / Consulta Inicial', createdAt: '2026-01-01T08:00:00.000Z' },
  { id: 2, nome: 'Profilaxia e Limpeza Dental', createdAt: '2026-01-02T08:00:00.000Z' },
  { id: 3, nome: 'Clareamento Dental a Laser', createdAt: '2026-01-03T08:00:00.000Z' },
  { id: 4, nome: 'Restauração em Resina Composta', createdAt: '2026-01-04T08:00:00.000Z' },
  { id: 5, nome: 'Tratamento de Canal (Endodontia)', createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 6, nome: 'Exodontia (Extração Dental)', createdAt: '2026-01-06T08:00:00.000Z' },
  { id: 7, nome: 'Prótese Fixa / Coroa Total', createdAt: '2026-01-07T08:00:00.000Z' },
  { id: 8, nome: 'Implante Dentário', createdAt: '2026-01-08T08:00:00.000Z' },
  { id: 9, nome: 'Instalação / Manutenção Ortodôntica', createdAt: '2026-01-09T08:00:00.000Z' },
  { id: 10, nome: 'Aplicação Tópica de Flúor', createdAt: '2026-01-10T08:00:00.000Z' },
  { id: 11, nome: 'Raspagem e Alisamento Radicular', createdAt: '2026-01-11T08:00:00.000Z' },
  { id: 12, nome: 'Prova de Lentes de Contato Dental', createdAt: '2026-01-12T08:00:00.000Z' },
  { id: 13, nome: 'Selante Odontológico', createdAt: '2026-01-13T08:00:00.000Z' },
];

export const PROCEDIMENTOS_SQL_SCRIPT = `-- =========================================================
-- SCRIPT DE CRIAÇÃO E CARGA INICIAL: PROCEDIMENTOS ODONTOLÓGICOS
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- =========================================================

-- 1. Criação da Tabela de Procedimentos Odontológicos
CREATE TABLE IF NOT EXISTS public.procedimentos (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Configuração de RLS (Row Level Security) e Permissões
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write on procedimentos" ON public.procedimentos;
CREATE POLICY "Allow public read and write on procedimentos" ON public.procedimentos FOR ALL USING (true) WITH CHECK (true);

-- 3. Carga Inicial de Procedimentos Existentes
INSERT INTO public.procedimentos (id, nome) VALUES
  (1, 'Avaliação Odontológica / Consulta Inicial'),
  (2, 'Profilaxia e Limpeza Dental'),
  (3, 'Clareamento Dental a Laser'),
  (4, 'Restauração em Resina Composta'),
  (5, 'Tratamento de Canal (Endodontia)'),
  (6, 'Exodontia (Extração Dental)'),
  (7, 'Prótese Fixa / Coroa Total'),
  (8, 'Implante Dentário'),
  (9, 'Instalação / Manutenção Ortodôntica'),
  (10, 'Aplicação Tópica de Flúor'),
  (11, 'Raspagem e Alisamento Radicular'),
  (12, 'Prova de Lentes de Contato Dental'),
  (13, 'Selante Odontológico')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 4. Ajuste da Sequência do ID Auto-Incremento
SELECT setval('procedimentos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.procedimentos));
`;

type SortField = 'id' | 'nome' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const ProcedimentosView: React.FC = () => {
  // Procedimentos list state
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>(() => {
    const saved = localStorage.getItem('dra_karine_procedimentos');
    return saved ? JSON.parse(saved) : initialProcedimentosData;
  });

  // Form states
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nome, setNome] = useState<string>('');

  // Status and UI state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Search & Filter states
  const [searchId, setSearchId] = useState('');
  const [searchNome, setSearchNome] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch procedimentos from Supabase if available
  useEffect(() => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      setIsLoading(true);
      const fetchProcedimentos = async () => {
        try {
          const { data, error } = await getSupabase()
            .from('procedimentos')
            .select('*')
            .order('id', { ascending: true });

          setIsLoading(false);
          if (error) {
            notifySupabaseDatabaseError('Consulta de Procedimentos', error);
            return;
          }
          if (data && data.length > 0) {
            const mapped: Procedimento[] = data.map((item: any) => ({
              id: Number(item.id),
              nome: item.nome,
              createdAt: item.created_at || new Date().toISOString(),
              updatedAt: item.updated_at || new Date().toISOString(),
            }));
            setProcedimentos(mapped);
          }
        } catch (err) {
          setIsLoading(false);
          notifySupabaseDatabaseError('Consulta de Procedimentos', err);
        }
      };

      fetchProcedimentos();
    }
  }, []);

  // Save to localStorage as backup
  useEffect(() => {
    localStorage.setItem('dra_karine_procedimentos', JSON.stringify(procedimentos));
  }, [procedimentos]);

  // Form Reset / "Novo"
  const handleNovo = () => {
    setSelectedId(null);
    setNome('');
    setMessage(null);
  };

  // Form Cancel / "Cancelar"
  const handleCancelar = () => {
    setSelectedId(null);
    setNome('');
    setMessage(null);
  };

  // Form Save / "Salvar"
  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessage(null);

    const trimmedNome = nome.trim();

    // Validation 1: Mandatory Name
    if (!trimmedNome) {
      setMessage({
        type: 'error',
        text: 'O Nome do Procedimento é obrigatório.',
      });
      return;
    }

    // Validation 2: Duplicate Name Check
    const duplicate = procedimentos.some(
      (p) =>
        p.id !== selectedId &&
        p.nome.trim().toLowerCase() === trimmedNome.toLowerCase()
    );

    if (duplicate) {
      setMessage({
        type: 'error',
        text: 'Já existe um procedimento cadastrado com este nome.',
      });
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    try {
      if (selectedId === null) {
        // --- INSERT NEW PROCEDIMENTO ---
        let newId = 1;
        if (procedimentos.length > 0) {
          const maxId = Math.max(...procedimentos.map((p) => p.id || 0));
          newId = maxId + 1;
        }

        let createdItem: Procedimento = {
          id: newId,
          nome: trimmedNome,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (getIsSupabaseConfigured() && getSupabase()) {
          const { data, error } = await getSupabase()
            .from('procedimentos')
            .insert([{ nome: trimmedNome }])
            .select();

          if (error) {
            notifySupabaseDatabaseError('Inclusão de Procedimento', error);
            setIsSaving(false);
            return;
          }

          if (data && data.length > 0) {
            const dbRow = data[0];
            createdItem = {
              id: Number(dbRow.id ?? newId),
              nome: dbRow.nome,
              createdAt: dbRow.created_at || nowIso,
              updatedAt: dbRow.updated_at || nowIso,
            };
          }
        }

        setProcedimentos((prev) => [...prev, createdItem]);
        setSelectedId(createdItem.id || newId);
        setNome(createdItem.nome);
        setMessage({
          type: 'success',
          text: 'Procedimento cadastrado com sucesso.',
        });
      } else {
        // --- UPDATE EXISTING PROCEDIMENTO ---
        let updatedItem: Procedimento = {
          id: selectedId,
          nome: trimmedNome,
          createdAt: procedimentos.find((p) => p.id === selectedId)?.createdAt || nowIso,
          updatedAt: nowIso,
        };

        if (getIsSupabaseConfigured() && getSupabase()) {
          const { error } = await getSupabase()
            .from('procedimentos')
            .update({
              nome: trimmedNome,
              updated_at: nowIso,
            })
            .eq('id', selectedId);

          if (error) {
            notifySupabaseDatabaseError('Alteração de Procedimento', error);
            setIsSaving(false);
            return;
          }
        }

        setProcedimentos((prev) =>
          prev.map((p) => (p.id === selectedId ? updatedItem : p))
        );
        setMessage({
          type: 'success',
          text: 'Procedimento atualizado com sucesso.',
        });
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: 'Ocorreu um erro ao salvar o procedimento no banco de dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Row selection handler
  const handleSelectRow = (proc: Procedimento) => {
    if (proc.id !== undefined) {
      setSelectedId(proc.id);
    }
    setNome(proc.nome);
    setMessage(null);
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted procedimentos list
  const filteredProcedimentos = useMemo(() => {
    return procedimentos
      .filter((item) => {
        // Filter by ID
        if (searchId.trim() !== '') {
          const idStr = String(item.id || '');
          if (!idStr.includes(searchId.trim())) {
            return false;
          }
        }

        // Filter by Nome
        if (searchNome.trim() !== '') {
          if (!item.nome.toLowerCase().includes(searchNome.trim().toLowerCase())) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'id') {
          valA = Number(a.id || 0);
          valB = Number(b.id || 0);
        } else if (sortField === 'nome') {
          valA = a.nome.toLowerCase();
          valB = b.nome.toLowerCase();
        } else if (sortField === 'createdAt') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [procedimentos, searchId, searchNome, sortField, sortDirection]);

  // Copy SQL Handler
  const handleCopySql = () => {
    navigator.clipboard.writeText(PROCEDIMENTOS_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Date Formatter
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e7eeff] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#006194] uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            <span>Cadastros &gt; Procedimentos Odontológicos</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111c2d]">Cadastro de Procedimentos Odontológicos</h2>
          <p className="text-sm text-[#3f4850] mt-0.5">
            Gerencie os procedimentos cadastrados e integrados ao banco de dados Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-2 bg-[#e7eeff] hover:bg-[#dee8ff] text-[#006194] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span>Ver Script SQL Supabase</span>
          </button>

          {getIsSupabaseConfigured() ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#e7f4e8] text-[#1e7e34] rounded-full text-xs font-medium border border-[#c3e6cb]">
              <span className="w-2 h-2 rounded-full bg-[#28a745] animate-pulse"></span>
              Conectado ao Supabase
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fff8e1] text-[#b78103] rounded-full text-xs font-medium border border-[#ffe082]">
              <span className="material-symbols-outlined text-[16px]">cloud_off</span>
              Modo Local (Supabase não configurado)
            </div>
          )}
        </div>
      </div>

      {/* Alert Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium shadow-xs transition-all ${
            message.type === 'success'
              ? 'bg-[#e7f4e8] text-[#1e7e34] border border-[#c3e6cb]'
              : 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">
              {message.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-6">
        <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-4">
          <h3 className="font-bold text-lg text-[#111c2d] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006194]">
              {selectedId !== null ? 'edit_note' : 'add_circle'}
            </span>
            {selectedId !== null
              ? `Editando Procedimento #${selectedId}`
              : 'Novo Cadastro de Procedimento'}
          </h3>

          <span className="text-xs text-[#707881]">
            * Campos de preenchimento obrigatório
          </span>
        </div>

        <form onSubmit={handleSalvar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* 1. ID do Procedimento (Sequencial automático) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-[#3f4850] mb-1.5">
                ID do Procedimento
              </label>
              <input
                type="text"
                disabled
                readOnly
                value={selectedId !== null ? `#${selectedId}` : 'Automático'}
                className="w-full bg-[#e7eeff]/60 border border-[#bfc7d2] rounded-xl px-4 py-3 text-sm font-semibold text-[#707881] cursor-not-allowed select-none shadow-inner"
              />
              <p className="text-[11px] text-[#707881] mt-1">
                Sequencial gerado automaticamente pelo banco de dados. Não editável.
              </p>
            </div>

            {/* 2. Nome do Procedimento */}
            <div className="md:col-span-9">
              <label className="block text-xs font-semibold text-[#3f4850] mb-1.5">
                Nome do Procedimento <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Informe o nome ou descrição do procedimento odontológico"
                className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-xl px-4 py-3 text-sm text-[#111c2d] transition-all"
              />
              <div className="flex justify-between items-center text-[11px] text-[#707881] mt-1">
                <span>Campo obrigatório para armazenamento no banco de dados.</span>
                <span>{nome.length}/200</span>
              </div>
            </div>
          </div>

          {/* Form Action Buttons (Sem exclusão por regra do sistema) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#f0f3ff]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNovo}
                className="px-5 py-2.5 bg-[#f0f3ff] text-[#006194] hover:bg-[#e7eeff] border border-[#006194]/20 rounded-xl font-medium text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Novo
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#006194] text-white hover:bg-[#004b73] disabled:bg-[#bfc7d2] rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {isSaving ? 'Gravando...' : 'Salvar'}
              </button>

              <button
                type="button"
                onClick={handleCancelar}
                className="px-5 py-2.5 bg-white text-[#3f4850] hover:bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl font-medium text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Cancelar
              </button>
            </div>

            <div className="text-xs text-[#707881] italic flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-amber-600">lock</span>
              <span>Nota: Exclusão desabilitada para preservação de histórico clínico.</span>
            </div>
          </div>
        </form>
      </div>

      {/* Grid / Listing Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e7eeff] overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#e7eeff]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-lg text-[#111c2d]">Procedimentos Cadastrados</h3>
              <p className="text-xs text-[#707881]">
                Clique em qualquer linha da grade para carregar os dados e editar o procedimento.
              </p>
            </div>

            <span className="text-xs font-semibold px-3 py-1 bg-[#e7eeff] text-[#006194] rounded-full self-start md:self-auto">
              {filteredProcedimentos.length} {filteredProcedimentos.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* Search ID */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-[#707881] mb-1">
                Pesquisar por ID
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#707881]">
                  tag
                </span>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl pl-9 pr-3 py-2 text-sm text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>
            </div>

            {/* Search Nome */}
            <div className="md:col-span-9">
              <label className="block text-[11px] font-semibold text-[#707881] mb-1">
                Pesquisar por Nome do Procedimento
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#707881]">
                  search
                </span>
                <input
                  type="text"
                  value={searchNome}
                  onChange={(e) => setSearchNome(e.target.value)}
                  placeholder="Ex: Restauração, Canal, Limpeza..."
                  className="w-full bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl pl-9 pr-3 py-2 text-sm text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#3f4850] font-semibold text-xs border-b border-[#e7eeff] uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors w-28"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'id'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('nome')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nome do Procedimento</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'nome'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('createdAt')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors w-48"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data de Cadastro</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'createdAt'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th className="py-3.5 px-6 text-right font-semibold w-32">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e7eeff]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#707881]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-[#006194]">
                        progress_activity
                      </span>
                      <span>Carregando procedimentos do banco de dados...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProcedimentos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#707881]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-[#bfc7d2]">
                        search_off
                      </span>
                      <p className="font-semibold text-sm">Nenhum procedimento encontrado.</p>
                      <p className="text-xs text-[#707881]">
                        Ajuste o termo de pesquisa ou cadastre um novo procedimento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProcedimentos.map((proc) => {
                  const isSelected = selectedId === proc.id;
                  return (
                    <tr
                      key={proc.id}
                      onClick={() => handleSelectRow(proc)}
                      className={`cursor-pointer transition-colors hover:bg-[#e7eeff]/60 ${
                        isSelected ? 'bg-[#e7eeff] font-medium' : 'even:bg-[#f9f9ff]'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-bold text-[#006194]">
                        #{proc.id}
                      </td>

                      <td className="py-3.5 px-6 text-[#111c2d] font-semibold">
                        {proc.nome}
                      </td>

                      <td className="py-3.5 px-6 text-[#3f4850] text-xs">
                        {formatDate(proc.createdAt)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(proc);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006194] text-white hover:bg-[#004b73] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          title="Editar Procedimento"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQL Migration Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e7eeff] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7eeff]">
              <div className="flex items-center gap-2 text-[#006194]">
                <span className="material-symbols-outlined text-[24px]">terminal</span>
                <h3 className="font-bold text-base text-[#111c2d]">
                  Script SQL de Criação e Carga - Procedimentos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-[#707881] hover:text-[#111c2d] p-1 rounded-lg hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#3f4850] leading-relaxed">
              Copie o código abaixo e execute no <strong>SQL Editor</strong> do seu Dashboard Supabase para criar a tabela de procedimentos e realizar a carga inicial dos dados:
            </p>

            <div className="relative flex-1 min-h-[280px]">
              <textarea
                readOnly
                value={PROCEDIMENTOS_SQL_SCRIPT}
                className="w-full h-full p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs rounded-xl focus:outline-none select-all resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#e7eeff]">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 border border-[#bfc7d2] rounded-xl text-xs font-medium text-[#3f4850] hover:bg-[#f0f3ff]"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2 bg-[#006194] text-white hover:bg-[#004b73] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedSql ? 'check' : 'content_copy'}
                </span>
                <span>{copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
