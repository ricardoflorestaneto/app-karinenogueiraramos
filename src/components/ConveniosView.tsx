import React, { useState, useEffect, useMemo } from 'react';
import { Convenio } from '../types';
import { getSupabase, getIsSupabaseConfigured, notifySupabaseDatabaseError} from '../lib/supabase';

const initialConveniosData: Convenio[] = [
  {
    codigo: 1,
    nome: 'Unimed',
    status: true,
    dataCadastro: '2026-01-10T10:00:00.000Z',
    ultimaAlteracao: '2026-01-10T10:00:00.000Z',
  },
  {
    codigo: 2,
    nome: 'Bradesco Saúde',
    status: true,
    dataCadastro: '2026-01-15T11:30:00.000Z',
    ultimaAlteracao: '2026-01-15T11:30:00.000Z',
  },
  {
    codigo: 3,
    nome: 'Amil',
    status: true,
    dataCadastro: '2026-02-01T09:15:00.000Z',
    ultimaAlteracao: '2026-02-01T09:15:00.000Z',
  },
  {
    codigo: 4,
    nome: 'SulAmérica',
    status: false,
    dataCadastro: '2026-02-20T14:00:00.000Z',
    ultimaAlteracao: '2026-03-05T16:20:00.000Z',
  },
  {
    codigo: 5,
    nome: 'Porto Seguro Saúde',
    status: true,
    dataCadastro: '2026-03-10T08:45:00.000Z',
    ultimaAlteracao: '2026-03-10T08:45:00.000Z',
  },
];

type SortField = 'codigo' | 'nome' | 'status' | 'dataCadastro' | 'ultimaAlteracao';
type SortDirection = 'asc' | 'desc';

export const ConveniosView: React.FC = () => {
  // Convenios list
  const [convenios, setConvenios] = useState<Convenio[]>(() => {
    const saved = localStorage.getItem('dra_karine_convenios');
    return saved ? JSON.parse(saved) : initialConveniosData;
  });

  // Form states
  const [codigo, setCodigo] = useState<number | null>(null);
  const [nome, setNome] = useState<string>('');
  const [status, setStatus] = useState<boolean>(true);

  // Status message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [searchCodigo, setSearchCodigo] = useState('');
  const [searchNome, setSearchNome] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch convenios from Supabase if available
  useEffect(() => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      setIsLoading(true);
      const fetchConvenios = async () => {
        try {
          const { data, error } = await getSupabase()
            .from('convenios')
            .select('*')
            .order('codigo', { ascending: true });

          setIsLoading(false);
          if (error) {
            notifySupabaseDatabaseError('Consulta de Convênios', error);
            return;
          }
          if (data && data.length > 0) {
            const mapped: Convenio[] = data.map((item: any) => ({
              codigo: item.codigo ?? item.id,
              nome: item.nome,
              status: Boolean(item.status),
              dataCadastro: item.created_at || item.data_cadastro || new Date().toISOString(),
              ultimaAlteracao: item.updated_at || item.ultima_alteracao || new Date().toISOString(),
            }));
            setConvenios(mapped);
          }
        } catch (err) {
          setIsLoading(false);
          notifySupabaseDatabaseError('Consulta de Convênios', err);
        }
      };

      fetchConvenios();
    }
  }, []);

  // Save convenios to localStorage as backup
  useEffect(() => {
    localStorage.setItem('dra_karine_convenios', JSON.stringify(convenios));
  }, [convenios]);

  // Form Reset / "Novo"
  const handleNovo = () => {
    setCodigo(null);
    setNome('');
    setStatus(true);
    setMessage(null);
  };

  // Form Cancel / "Cancelar"
  const handleCancelar = () => {
    setCodigo(null);
    setNome('');
    setStatus(true);
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
        text: 'O Nome do Convênio é obrigatório.',
      });
      return;
    }

    // Validation 2: Duplicate Name Check
    const duplicate = convenios.some(
      (c) =>
        c.codigo !== codigo &&
        c.nome.trim().toLowerCase() === trimmedNome.toLowerCase()
    );

    if (duplicate) {
      setMessage({
        type: 'error',
        text: 'Já existe um convênio cadastrado com este nome.',
      });
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    try {
      if (codigo === null) {
        // --- INSERT NEW CONVENIO ---
        let newCodigo = 1;
        if (convenios.length > 0) {
          const maxCode = Math.max(...convenios.map((c) => c.codigo || 0));
          newCodigo = maxCode + 1;
        }

        let createdItem: Convenio = {
          codigo: newCodigo,
          nome: trimmedNome,
          status,
          dataCadastro: nowIso,
          ultimaAlteracao: nowIso,
        };

        if (getIsSupabaseConfigured() && getSupabase()) {
          const { data, error } = await getSupabase()
            .from('convenios')
            .insert([{ nome: trimmedNome, status }])
            .select();

          if (error) {
            notifySupabaseDatabaseError('Inclusão de Convênio', error);
            setIsSaving(false);
            return;
          }

          if (data && data.length > 0) {
            const dbRow = data[0];
            createdItem = {
              codigo: dbRow.codigo ?? dbRow.id ?? newCodigo,
              nome: dbRow.nome,
              status: Boolean(dbRow.status),
              dataCadastro: dbRow.created_at || nowIso,
              ultimaAlteracao: dbRow.updated_at || nowIso,
            };
          }
        }

        setConvenios((prev) => [...prev, createdItem]);
        setCodigo(createdItem.codigo || newCodigo);
        setNome(createdItem.nome);
        setStatus(createdItem.status);
        setMessage({
          type: 'success',
          text: 'Convênio cadastrado com sucesso.',
        });
      } else {
        // --- UPDATE EXISTING CONVENIO ---
        let updatedItem: Convenio = {
          codigo,
          nome: trimmedNome,
          status,
          dataCadastro: convenios.find((c) => c.codigo === codigo)?.dataCadastro || nowIso,
          ultimaAlteracao: nowIso,
        };

        if (getIsSupabaseConfigured() && getSupabase()) {
          const { error } = await getSupabase()
            .from('convenios')
            .update({
              nome: trimmedNome,
              status,
              updated_at: nowIso,
            })
            .eq('codigo', codigo);

          if (error) {
            notifySupabaseDatabaseError('Alteração de Convênio', error);
            setIsSaving(false);
            return;
          }
        }

        setConvenios((prev) =>
          prev.map((c) => (c.codigo === codigo ? updatedItem : c))
        );
        setMessage({
          type: 'success',
          text: 'Convênio atualizado com sucesso.',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: 'Ocorreu um erro ao salvar os dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Row selection handler
  const handleSelectRow = (conv: Convenio) => {
    if (conv.codigo !== undefined) {
      setCodigo(conv.codigo);
    }
    setNome(conv.nome);
    setStatus(conv.status);
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

  // Filtered and sorted convenios list
  const filteredConvenios = useMemo(() => {
    return convenios
      .filter((item) => {
        // Filter by Código
        if (searchCodigo.trim() !== '') {
          const codeStr = String(item.codigo || '');
          if (!codeStr.includes(searchCodigo.trim())) {
            return false;
          }
        }

        // Filter by Nome
        if (searchNome.trim() !== '') {
          if (!item.nome.toLowerCase().includes(searchNome.trim().toLowerCase())) {
            return false;
          }
        }

        // Filter by Status
        if (filterStatus === 'ativo' && !item.status) return false;
        if (filterStatus === 'inativo' && item.status) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'codigo') {
          valA = Number(a.codigo || 0);
          valB = Number(b.codigo || 0);
        } else if (sortField === 'nome') {
          valA = a.nome.toLowerCase();
          valB = b.nome.toLowerCase();
        } else if (sortField === 'status') {
          valA = a.status ? 1 : 0;
          valB = b.status ? 1 : 0;
        } else if (sortField === 'dataCadastro' || sortField === 'ultimaAlteracao') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [convenios, searchCodigo, searchNome, filterStatus, sortField, sortDirection]);

  // Date formatter
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
            <span>Cadastros &gt; Convênios</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111c2d]">Cadastro de Convênios</h2>
          <p className="text-sm text-[#3f4850] mt-0.5">
            Gerencie os planos de saúde e convênios aceitos na clínica.
          </p>
        </div>

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
              {codigo !== null ? 'edit_note' : 'add_circle'}
            </span>
            {codigo !== null
              ? `Editando Convênio #${codigo}`
              : 'Novo Cadastro de Convênio'}
          </h3>

          <span className="text-xs text-[#707881]">
            * Campos de preenchimento obrigatório
          </span>
        </div>

        <form onSubmit={handleSalvar} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* 1. Código do Convênio */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-[#3f4850] mb-1.5">
                Código do Convênio
              </label>
              <input
                type="text"
                disabled
                readOnly
                value={codigo !== null ? codigo : 'Automático'}
                className="w-full bg-[#e7eeff]/60 border border-[#bfc7d2] rounded-xl px-4 py-3 text-sm font-semibold text-[#707881] cursor-not-allowed select-none shadow-inner"
              />
              <p className="text-[11px] text-[#707881] mt-1">
                Sequencial gerado automaticamente pelo sistema.
              </p>
            </div>

            {/* 2. Nome do Convênio */}
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-[#3f4850] mb-1.5">
                Nome do Convênio <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                maxLength={150}
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Informe o nome do convênio (ex: Unimed, Bradesco Saúde)"
                className="w-full bg-[#f0f3ff] border-b-2 border-[#bfc7d2] focus:border-[#006194] focus:outline-none rounded-t-xl px-4 py-3 text-sm text-[#111c2d] transition-all"
              />
              <div className="flex justify-between items-center text-[11px] text-[#707881] mt-1">
                <span>Máximo de 150 caracteres.</span>
                <span>{nome.length}/150</span>
              </div>
            </div>

            {/* 3. Status Switch/Toggle */}
            <div className="md:col-span-3 flex flex-col justify-center">
              <label className="block text-xs font-semibold text-[#3f4850] mb-2">
                Status <span className="text-[#ba1a1a]">*</span>
              </label>

              <div className="flex items-center gap-3 bg-[#f0f3ff] p-2.5 rounded-xl border border-[#e7eeff]">
                <button
                  type="button"
                  onClick={() => setStatus(!status)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    status ? 'bg-[#006194]' : 'bg-[#bfc7d2]'
                  }`}
                  role="switch"
                  aria-checked={status}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      status ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>

                <span
                  onClick={() => setStatus(!status)}
                  className={`text-sm font-semibold cursor-pointer select-none ${
                    status ? 'text-[#006194]' : 'text-[#707881]'
                  }`}
                >
                  {status ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Action Buttons (ONLY Novo, Salvar, Cancelar) */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#f0f3ff]">
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
        </form>
      </div>

      {/* Grid / Listing Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e7eeff] overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#e7eeff]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-lg text-[#111c2d]">Lista de Convênios</h3>
              <p className="text-xs text-[#707881]">
                Clique em qualquer linha da grade para carregar os dados no formulário e realizar a edição.
              </p>
            </div>

            <span className="text-xs font-semibold px-3 py-1 bg-[#e7eeff] text-[#006194] rounded-full self-start md:self-auto">
              {filteredConvenios.length} {filteredConvenios.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {/* Search & Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* Search Código */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-[#707881] mb-1">
                Pesquisar por Código
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#707881]">
                  tag
                </span>
                <input
                  type="text"
                  value={searchCodigo}
                  onChange={(e) => setSearchCodigo(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl pl-9 pr-3 py-2 text-sm text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>
            </div>

            {/* Search Nome */}
            <div className="md:col-span-6">
              <label className="block text-[11px] font-semibold text-[#707881] mb-1">
                Pesquisar por Nome do Convênio
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#707881]">
                  search
                </span>
                <input
                  type="text"
                  value={searchNome}
                  onChange={(e) => setSearchNome(e.target.value)}
                  placeholder="Ex: Unimed"
                  className="w-full bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl pl-9 pr-3 py-2 text-sm text-[#111c2d] focus:outline-none focus:border-[#006194]"
                />
              </div>
            </div>

            {/* Filter Status */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-[#707881] mb-1">
                Filtro por Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl px-3 py-2 text-sm text-[#111c2d] focus:outline-none focus:border-[#006194]"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Apenas Ativos</option>
                <option value="inativo">Apenas Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#3f4850] font-semibold text-xs border-b border-[#e7eeff] uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('codigo')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'codigo'
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
                    <span>Nome do Convênio</span>
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
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'status'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('dataCadastro')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data de Cadastro</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'dataCadastro'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('ultimaAlteracao')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-[#e7eeff] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Última Alteração</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sortField === 'ultimaAlteracao'
                        ? sortDirection === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'swap_vert'}
                    </span>
                  </div>
                </th>

                <th className="py-3.5 px-6 text-right font-semibold">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e7eeff]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#707881]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-[#006194]">
                        progress_activity
                      </span>
                      <span>Carregando dados dos convênios...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredConvenios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#707881]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-[#bfc7d2]">
                        search_off
                      </span>
                      <p className="font-semibold text-sm">Nenhum convênio encontrado.</p>
                      <p className="text-xs text-[#707881]">
                        Tente ajustar os filtros de pesquisa acima ou adicione um novo convênio.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredConvenios.map((conv) => {
                  const isSelected = codigo === conv.codigo;
                  return (
                    <tr
                      key={conv.codigo}
                      onClick={() => handleSelectRow(conv)}
                      className={`cursor-pointer transition-colors hover:bg-[#e7eeff]/60 ${
                        isSelected ? 'bg-[#e7eeff] font-medium' : 'even:bg-[#f9f9ff]'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-bold text-[#006194]">
                        #{conv.codigo}
                      </td>

                      <td className="py-3.5 px-6 text-[#111c2d] font-semibold">
                        {conv.nome}
                      </td>

                      <td className="py-3.5 px-6">
                        {conv.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e7f4e8] text-[#1e7e34] border border-[#c3e6cb]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#28a745]"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f8f9fa] text-[#6c757d] border border-[#dee2e6]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6c757d]"></span>
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-[#3f4850] text-xs">
                        {formatDate(conv.dataCadastro)}
                      </td>

                      <td className="py-3.5 px-6 text-[#3f4850] text-xs">
                        {formatDate(conv.ultimaAlteracao)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(conv);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006194] text-white hover:bg-[#004b73] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          title="Editar Convênio"
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
    </div>
  );
};
