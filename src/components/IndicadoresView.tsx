import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Patient } from '../types';
import {
  fetchTotalPatientsCount,
  fetchMonthlyPatientsCount,
  fetchTodayPatientsCount,
  fetchPatientsEvolution6Months,
  fetchPatientsAgeDistribution,
  fetchPatientsGenderDistribution,
  fetchPatientsGeographicDistribution,
  calculateLocalAgeDistribution,
  calculateLocalGenderDistribution,
  calculateLocalGeographicDistribution,
  generateLast6MonthsSlots,
  MonthlyEvolutionItem,
  AgeGroupDistributionItem,
  GenderDistributionItem,
  GeographicItem,
  getIsSupabaseConfigured,
} from '../lib/supabase';

interface IndicadoresViewProps {
  onNavigateToPatients?: () => void;
  onNavigateToNewPatient?: () => void;
  fallbackPatientsCount?: number;
  fallbackPatients?: Patient[];
}

export const IndicadoresView: React.FC<IndicadoresViewProps> = ({
  onNavigateToPatients,
  onNavigateToNewPatient,
  fallbackPatientsCount,
  fallbackPatients,
}) => {
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [monthlyPatients, setMonthlyPatients] = useState<number | null>(null);
  const [todayPatients, setTodayPatients] = useState<number | null>(null);
  const [evolutionData, setEvolutionData] = useState<MonthlyEvolutionItem[]>(() =>
    generateLast6MonthsSlots()
  );
  const [ageDistribution, setAgeDistribution] = useState<AgeGroupDistributionItem[]>([
    { id: 'criancas', name: 'Crianças', rangeLabel: '0 a 11 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#006194' },
    { id: 'jovens', name: 'Jovens', rangeLabel: '12 a 17 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#00a389' },
    { id: 'adultos', name: 'Adultos', rangeLabel: '18 a 59 anos', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#325da8' },
    { id: 'idosos', name: 'Idosos', rangeLabel: '60 anos ou mais', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#7b52ab' },
  ]);
  const [totalValidAgePatients, setTotalValidAgePatients] = useState<number>(0);

  const [genderDistribution, setGenderDistribution] = useState<GenderDistributionItem[]>([
    { id: 'feminino', name: 'Feminino', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#e0245e' },
    { id: 'masculino', name: 'Masculino', total: 0, percentage: 0, percentageFormatted: '0,0%', color: '#006194' },
  ]);
  const [totalValidGenderPatients, setTotalValidGenderPatients] = useState<number>(0);

  // Indicador 7: Pacientes por Cidade / Bairro
  const [geoMode, setGeoMode] = useState<'city' | 'neighborhood'>('city');
  const [geoCities, setGeoCities] = useState<GeographicItem[]>([]);
  const [geoNeighborhoods, setGeoNeighborhoods] = useState<GeographicItem[]>([]);
  const [totalValidCityPatients, setTotalValidCityPatients] = useState<number>(0);
  const [totalValidNeighborhoodPatients, setTotalValidNeighborhoodPatients] = useState<number>(0);
  const [isGeoExpanded, setIsGeoExpanded] = useState<boolean>(false);

  const [monthLabel, setMonthLabel] = useState<string>(() => {
    const now = new Date();
    const rawMonth = now.toLocaleDateString('pt-BR', { month: 'long' });
    return `${rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)} de ${now.getFullYear()}`;
  });

  const [todayLabel, setTodayLabel] = useState<string>(() => {
    const now = new Date();
    const rawMonth = now.toLocaleDateString('pt-BR', { month: 'long' });
    return `${now.getDate()} de ${rawMonth} de ${now.getFullYear()}`;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Carrega os indicadores diretamente da camada de dados / banco Supabase
  const loadIndicators = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const configured = getIsSupabaseConfigured();
    setIsSupabaseConnected(configured);

    try {
      const [totalResult, monthlyResult, todayResult, evolutionResult, ageResult, genderResult, geoResult] = await Promise.all([
        fetchTotalPatientsCount(),
        fetchMonthlyPatientsCount(),
        fetchTodayPatientsCount(),
        fetchPatientsEvolution6Months(),
        fetchPatientsAgeDistribution(),
        fetchPatientsGenderDistribution(),
        fetchPatientsGeographicDistribution(),
      ]);

      // 1. Processa Total de Pacientes
      if (totalResult.success) {
        if (totalResult.isFromSupabase) {
          setTotalPatients(totalResult.count);
        } else {
          setTotalPatients(fallbackPatientsCount ?? fallbackPatients?.length ?? totalResult.count ?? 0);
        }
      } else {
        if (fallbackPatientsCount !== undefined) {
          setTotalPatients(fallbackPatientsCount);
        } else if (fallbackPatients) {
          setTotalPatients(fallbackPatients.length);
        }
      }

      // 2. Processa Pacientes do Mês
      if (monthlyResult.monthLabel) {
        setMonthLabel(monthlyResult.monthLabel);
      }

      if (monthlyResult.success) {
        if (monthlyResult.isFromSupabase) {
          setMonthlyPatients(monthlyResult.count);
        } else {
          const now = new Date();
          const curY = now.getFullYear();
          const curM = now.getMonth();
          const localCount = fallbackPatients
            ? fallbackPatients.filter((p) => {
                if (!p.registrationDate) return false;
                const d = new Date(p.registrationDate);
                return d.getFullYear() === curY && d.getMonth() === curM;
              }).length
            : 0;
          setMonthlyPatients(localCount);
        }
      } else {
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth();
        const localCount = fallbackPatients
          ? fallbackPatients.filter((p) => {
              if (!p.registrationDate) return false;
              const d = new Date(p.registrationDate);
              return d.getFullYear() === curY && d.getMonth() === curM;
            }).length
          : 0;
        setMonthlyPatients(localCount);
      }

      // 3. Processa Pacientes de Hoje
      if (todayResult.todayLabel) {
        setTodayLabel(todayResult.todayLabel);
      }

      if (todayResult.success) {
        if (todayResult.isFromSupabase) {
          setTodayPatients(todayResult.count);
        } else {
          const now = new Date();
          const curY = now.getFullYear();
          const curM = now.getMonth();
          const curD = now.getDate();
          const localTodayCount = fallbackPatients
            ? fallbackPatients.filter((p) => {
                if (!p.registrationDate) return false;
                const d = new Date(p.registrationDate);
                return d.getFullYear() === curY && d.getMonth() === curM && d.getDate() === curD;
              }).length
            : 0;
          setTodayPatients(localTodayCount);
        }
      } else {
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth();
        const curD = now.getDate();
        const localTodayCount = fallbackPatients
          ? fallbackPatients.filter((p) => {
              if (!p.registrationDate) return false;
              const d = new Date(p.registrationDate);
              return d.getFullYear() === curY && d.getMonth() === curM && d.getDate() === curD;
            }).length
          : 0;
        setTodayPatients(localTodayCount);
      }

      // 4. Processa Evolução dos Últimos 6 Meses
      if (evolutionResult.success) {
        if (evolutionResult.isFromSupabase) {
          setEvolutionData(evolutionResult.data);
        } else if (fallbackPatients) {
          const slots = generateLast6MonthsSlots();
          fallbackPatients.forEach((p) => {
            if (p.registrationDate) {
              const key = p.registrationDate.slice(0, 7);
              const targetSlot = slots.find((s) => s.monthKey === key);
              if (targetSlot) {
                targetSlot.total += 1;
              }
            }
          });
          setEvolutionData(slots);
        } else {
          setEvolutionData(evolutionResult.data);
        }
      } else if (fallbackPatients) {
        const slots = generateLast6MonthsSlots();
        fallbackPatients.forEach((p) => {
          if (p.registrationDate) {
            const key = p.registrationDate.slice(0, 7);
            const targetSlot = slots.find((s) => s.monthKey === key);
            if (targetSlot) {
              targetSlot.total += 1;
            }
          }
        });
        setEvolutionData(slots);
      }

      // 5. Processa Pacientes por Faixa Etária
      if (ageResult.success) {
        if (ageResult.isFromSupabase) {
          setAgeDistribution(ageResult.data);
          setTotalValidAgePatients(ageResult.totalValidPatients);
        } else if (fallbackPatients) {
          const localAge = calculateLocalAgeDistribution(fallbackPatients);
          setAgeDistribution(localAge.data);
          setTotalValidAgePatients(localAge.totalValidPatients);
        } else {
          setAgeDistribution(ageResult.data);
          setTotalValidAgePatients(ageResult.totalValidPatients);
        }
      } else if (fallbackPatients) {
        const localAge = calculateLocalAgeDistribution(fallbackPatients);
        setAgeDistribution(localAge.data);
        setTotalValidAgePatients(localAge.totalValidPatients);
      }

      // 6. Processa Pacientes por Sexo
      if (genderResult.success) {
        if (genderResult.isFromSupabase) {
          setGenderDistribution(genderResult.data);
          setTotalValidGenderPatients(genderResult.totalValidPatients);
        } else if (fallbackPatients) {
          const localGender = calculateLocalGenderDistribution(fallbackPatients);
          setGenderDistribution(localGender.data);
          setTotalValidGenderPatients(localGender.totalValidPatients);
        } else {
          setGenderDistribution(genderResult.data);
          setTotalValidGenderPatients(genderResult.totalValidPatients);
        }
      } else if (fallbackPatients) {
        const localGender = calculateLocalGenderDistribution(fallbackPatients);
        setGenderDistribution(localGender.data);
        setTotalValidGenderPatients(localGender.totalValidPatients);
      }

      // 7. Processa Pacientes por Cidade / Bairro (Geográfico)
      if (geoResult.success) {
        if (geoResult.isFromSupabase) {
          setGeoCities(geoResult.byCity);
          setGeoNeighborhoods(geoResult.byNeighborhood);
          setTotalValidCityPatients(geoResult.totalValidCityPatients);
          setTotalValidNeighborhoodPatients(geoResult.totalValidNeighborhoodPatients);
        } else if (fallbackPatients) {
          const localGeo = calculateLocalGeographicDistribution(fallbackPatients);
          setGeoCities(localGeo.byCity);
          setGeoNeighborhoods(localGeo.byNeighborhood);
          setTotalValidCityPatients(localGeo.totalValidCityPatients);
          setTotalValidNeighborhoodPatients(localGeo.totalValidNeighborhoodPatients);
        } else {
          setGeoCities(geoResult.byCity);
          setGeoNeighborhoods(geoResult.byNeighborhood);
          setTotalValidCityPatients(geoResult.totalValidCityPatients);
          setTotalValidNeighborhoodPatients(geoResult.totalValidNeighborhoodPatients);
        }
      } else if (fallbackPatients) {
        const localGeo = calculateLocalGeographicDistribution(fallbackPatients);
        setGeoCities(localGeo.byCity);
        setGeoNeighborhoods(localGeo.byNeighborhood);
        setTotalValidCityPatients(localGeo.totalValidCityPatients);
        setTotalValidNeighborhoodPatients(localGeo.totalValidNeighborhoodPatients);
      }

      // Notificação de erro amigável se alguma consulta falhou
      if (
        !totalResult.success ||
        !monthlyResult.success ||
        !todayResult.success ||
        !evolutionResult.success ||
        !ageResult.success ||
        !genderResult.success ||
        !geoResult.success
      ) {
        const err =
          totalResult.error ||
          monthlyResult.error ||
          todayResult.error ||
          evolutionResult.error ||
          ageResult.error ||
          genderResult.error ||
          geoResult.error;
        let friendlyMsg = 'Não foi possível conectar ao banco de dados para consultar os indicadores.';
        const rawError = String(err?.message || err || '');
        if (rawError.includes('Failed to fetch') || rawError.includes('NetworkError') || rawError.includes('TypeError')) {
          friendlyMsg = 'Não foi possível estabelecer conexão com o servidor do Supabase. Verifique sua conexão com a internet ou as credenciais em Configurações.';
        } else if (err?.message) {
          friendlyMsg = `Erro do banco: ${err.message}`;
        }
        setErrorMessage(friendlyMsg);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      setErrorMessage('Não foi possível estabelecer conexão com o servidor do Supabase. Verifique as credenciais em Configurações.');
      if (fallbackPatientsCount !== undefined) {
        setTotalPatients(fallbackPatientsCount);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fallbackPatientsCount, fallbackPatients]);

  // Atualiza automaticamente toda vez que a tela for carregada
  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Total acumulado nos últimos 6 meses
  const total6Months = evolutionData.reduce((acc, curr) => acc + curr.total, 0);
  const maxEvolutionValue = Math.max(...evolutionData.map((d) => d.total), 5);
  const maxAgeValue = Math.max(...ageDistribution.map((d) => d.total), 5);

  // Lista geográfica atual e fatiamento
  const currentGeoList = geoMode === 'city' ? geoCities : geoNeighborhoods;
  const displayedGeoItems = isGeoExpanded ? currentGeoList : currentGeoList.slice(0, 10);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e7eeff]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">query_stats</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111c2d] tracking-tight">
                Indicadores Gerenciais
              </h1>
              <p className="text-xs sm:text-sm text-[#707881]">
                Métricas operacionais e dados estratégicos do consultório em tempo real
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & DB Status */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb]">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConnected ? 'bg-[#006c49] animate-pulse' : 'bg-[#ba1a1a]'
              }`}
            />
            <span>{isSupabaseConnected ? 'Supabase Conectado' : 'Modo Offline / Local'}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadIndicators(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#f0f3ff] text-[#006194] border border-[#bfc7d2] hover:border-[#006194] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            title="Atualizar dados agora"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert Message if applicable */}
      {errorMessage && (
        <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-2xl flex items-start justify-between gap-3 text-[#410002] animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] mt-0.5">
              error
            </span>
            <div>
              <p className="text-sm font-semibold text-[#ba1a1a]">Erro ao carregar indicadores</p>
              <p className="text-xs text-[#3f4850] mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => loadIndicators(true)}
            className="px-3 py-1 bg-white text-[#ba1a1a] hover:bg-[#ffdad6] border border-[#ba1a1a]/40 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Main Indicators Section: KPI Cards */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Total de Pacientes */}
          <div className="bg-white rounded-2xl p-6 border border-[#d8e3fb] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#3f4850]">
                Total de Pacientes
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="h-10 w-20 bg-[#f0f3ff] rounded-lg animate-pulse" />
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-[#111c2d]">
                  {totalPatients !== null ? totalPatients : 0}
                </div>
              )}
              <p className="text-xs text-[#707881] mt-1">
                Pacientes cadastrados no sistema
              </p>
            </div>
          </div>

          {/* Card 2: Pacientes Cadastrados no Mês */}
          <div className="bg-white rounded-2xl p-6 border border-[#d8e3fb] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#3f4850]">
                Pacientes Cadastrados no Mês
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">person_add</span>
              </div>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="h-10 w-20 bg-[#f0f3ff] rounded-lg animate-pulse" />
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-[#111c2d]">
                  {monthlyPatients !== null ? monthlyPatients : 0}
                </div>
              )}
              <p className="text-xs font-semibold text-[#006194] mt-1">
                {monthLabel}
              </p>
            </div>
          </div>

          {/* Card 3: Pacientes Cadastrados Hoje */}
          <div className="bg-white rounded-2xl p-6 border border-[#d8e3fb] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#3f4850]">
                Pacientes Cadastrados Hoje
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">today</span>
              </div>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="h-10 w-20 bg-[#f0f3ff] rounded-lg animate-pulse" />
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-[#111c2d]">
                  {todayPatients !== null ? todayPatients : 0}
                </div>
              )}
              <p className="text-xs font-semibold text-[#006194] mt-1">
                {todayLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Indicator 4: Evolução de Novos Pacientes (Line Chart) */}
      <section className="bg-white rounded-2xl border border-[#d8e3fb] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0f3ff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111c2d] tracking-tight">
                Evolução de Novos Pacientes
              </h2>
              <p className="text-xs sm:text-sm text-[#707881] mt-0.5">
                Histórico comparativo mês a mês dos novos cadastros.
              </p>
            </div>
          </div>

          {/* Quick Metrics / Tag */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e7eeff] text-[#006194] border border-[#d8e3fb]">
              Últimos 6 meses
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb]">
              Total no período: <strong className="text-[#111c2d] font-bold">{total6Months}</strong>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="w-full h-72 sm:h-80">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#f8faff] rounded-xl animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-[#006194] border-t-transparent animate-spin" />
              <span className="text-xs text-[#707881]">Carregando histórico dos últimos 6 meses...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={evolutionData}
                margin={{ top: 20, right: 20, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="patientEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006194" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#006194" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eeff" />
                <XAxis
                  dataKey="monthShortLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#d8e3fb' }}
                  tick={({ x, y, payload }) => {
                    const item = evolutionData[payload.index];
                    const isCurrent = item?.isCurrentMonth;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="middle"
                          fill={isCurrent ? '#006194' : '#707881'}
                          fontWeight={isCurrent ? 700 : 500}
                          fontSize={12}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxEvolutionValue > 5 ? maxEvolutionValue + 2 : 5]}
                  tickLine={false}
                  axisLine={{ stroke: '#d8e3fb' }}
                  tick={{ fill: '#707881', fontSize: 12 }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#006194"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#patientEvolutionGradient)"
                  dot={<CustomDot />}
                  activeDot={{
                    r: 7,
                    fill: '#006194',
                    stroke: '#ffffff',
                    strokeWidth: 2.5,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend / Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f0f3ff] text-xs text-[#707881]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#006194]" />
              <span>Novos Pacientes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#006194] bg-[#006194]" />
              <span className="font-semibold text-[#006194]">Mês Atual em Destaque</span>
            </div>
          </div>
          <span>Exibindo os 6 meses mais recentes em ordem cronológica</span>
        </div>
      </section>

      {/* Indicator 5: Pacientes por Faixa Etária (Bar Chart) */}
      <section className="bg-white rounded-2xl border border-[#d8e3fb] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0f3ff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">family_restroom</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111c2d] tracking-tight">
                Pacientes por Faixa Etária
              </h2>
              <p className="text-xs sm:text-sm text-[#707881] mt-0.5">
                Distribuição etária dos pacientes cadastrados no sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e7eeff] text-[#006194] border border-[#d8e3fb]">
              Classificação Dinâmica
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb]">
              Total com data de nascimento: <strong className="text-[#111c2d] font-bold">{totalValidAgePatients}</strong>
            </div>
          </div>
        </div>

        {/* Content: Bar Chart & Summary Cards */}
        {isLoading ? (
          <div className="w-full h-72 flex flex-col items-center justify-center gap-3 bg-[#f8faff] rounded-xl animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-[#006194] border-t-transparent animate-spin" />
            <span className="text-xs text-[#707881]">Calculando faixas etárias dos pacientes...</span>
          </div>
        ) : totalValidAgePatients === 0 ? (
          <div className="p-8 text-center bg-[#f8faff] border border-dashed border-[#d8e3fb] rounded-2xl space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[#707881]">info</span>
            <p className="text-sm font-semibold text-[#111c2d]">Não há dados suficientes para gerar o indicador</p>
            <p className="text-xs text-[#707881] max-w-md mx-auto">
              Nenhum paciente cadastrado possui data de nascimento válida registrada. Ao preencher a data de nascimento no prontuário, a distribuição etária será exibida automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Bar Chart (7 cols on lg) */}
            <div className="lg:col-span-7 h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageDistribution}
                  margin={{ top: 20, right: 20, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eeff" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#d8e3fb' }}
                    tick={{ fill: '#111c2d', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, maxAgeValue > 5 ? maxAgeValue + 2 : 5]}
                    tickLine={false}
                    axisLine={{ stroke: '#d8e3fb' }}
                    tick={{ fill: '#707881', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomAgeTooltip />} />
                  <Bar
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  >
                    {ageDistribution.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Cards Grid (5 cols on lg) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {ageDistribution.map((group) => (
                <div
                  key={group.id}
                  className="p-4 rounded-xl border border-[#d8e3fb] bg-[#f8faff] hover:bg-white hover:border-[#006194]/40 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-md shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#111c2d]">{group.name}</span>
                        <span className="text-[11px] text-[#707881] font-medium">({group.rangeLabel})</span>
                      </div>
                      <p className="text-xs text-[#707881] mt-0.5">
                        <strong className="text-[#111c2d] font-semibold">{group.total}</strong> {group.total === 1 ? 'paciente' : 'pacientes'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `${group.color}15`,
                        color: group.color,
                      }}
                    >
                      {group.percentageFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend / Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f0f3ff] text-xs text-[#707881]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-[#111c2d]">Classificação:</span>
            <span>Crianças (0-11)</span>
            <span>•</span>
            <span>Jovens (12-17)</span>
            <span>•</span>
            <span>Adultos (18-59)</span>
            <span>•</span>
            <span>Idosos (60+)</span>
          </div>
          <span>Percentual calculado sobre o total de pacientes com data de nascimento</span>
        </div>
      </section>

      {/* Indicator 6: Pacientes por Sexo (Donut Chart) */}
      <section className="bg-white rounded-2xl border border-[#d8e3fb] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0f3ff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">wc</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111c2d] tracking-tight">
                Pacientes por Sexo
              </h2>
              <p className="text-xs sm:text-sm text-[#707881] mt-0.5">
                Proporção estatística entre pacientes femininos e masculinos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e7eeff] text-[#006194] border border-[#d8e3fb]">
              Proporção Estatística
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb]">
              Total com sexo informado: <strong className="text-[#111c2d] font-bold">{totalValidGenderPatients}</strong>
            </div>
          </div>
        </div>

        {/* Content: Donut Chart & Summary Cards */}
        {isLoading ? (
          <div className="w-full h-72 flex flex-col items-center justify-center gap-3 bg-[#f8faff] rounded-xl animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-[#006194] border-t-transparent animate-spin" />
            <span className="text-xs text-[#707881]">Calculando distribuição por sexo dos pacientes...</span>
          </div>
        ) : totalValidGenderPatients === 0 ? (
          <div className="p-8 text-center bg-[#f8faff] border border-dashed border-[#d8e3fb] rounded-2xl space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[#707881]">info</span>
            <p className="text-sm font-semibold text-[#111c2d]">Não há dados suficientes para gerar o indicador</p>
            <p className="text-xs text-[#707881] max-w-md mx-auto">
              Nenhum paciente cadastrado possui o sexo informado no cadastro. Ao selecionar o sexo no formulário de pacientes, a distribuição proporcional será exibida automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut Chart with Center Total (7 cols on lg) */}
            <div className="lg:col-span-7 h-72 sm:h-80 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomGenderTooltip />} />
                  <Pie
                    data={genderDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="total"
                    nameKey="name"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {genderDistribution.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Label inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-[#111c2d] tracking-tight">
                  {totalValidGenderPatients}
                </span>
                <span className="text-[11px] font-semibold text-[#707881] mt-0.5 text-center max-w-[110px] leading-tight">
                  pacientes analisados
                </span>
              </div>
            </div>

            {/* Summary Cards Grid (5 cols on lg) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {genderDistribution.map((item) => (
                <div
                  key={item.id}
                  className="p-4.5 rounded-xl border border-[#d8e3fb] bg-[#f8faff] hover:bg-white hover:border-[#006194]/40 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {item.id === 'feminino' ? 'female' : 'male'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#111c2d]">{item.name}</span>
                      </div>
                      <p className="text-xs text-[#707881] mt-0.5">
                        <strong className="text-[#111c2d] font-bold text-sm">{item.total}</strong> {item.total === 1 ? 'paciente' : 'pacientes'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs"
                      style={{
                        backgroundColor: `${item.color}18`,
                        color: item.color,
                        border: `1px solid ${item.color}30`,
                      }}
                    >
                      {item.percentageFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend / Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f0f3ff] text-xs text-[#707881]">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e0245e]" />
              <span className="font-medium text-[#111c2d]">Feminino</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#006194]" />
              <span className="font-medium text-[#111c2d]">Masculino</span>
            </div>
          </div>
          <span>Percentual calculado exclusivamente sobre pacientes com sexo informado</span>
        </div>
      </section>

      {/* Indicator 7: Pacientes por Cidade / Bairro */}
      <section className="bg-white rounded-2xl border border-[#d8e3fb] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f3ff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#006194] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">location_on</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111c2d] tracking-tight">
                Pacientes por Cidade / Bairro
              </h2>
              <p className="text-xs sm:text-sm text-[#707881] mt-0.5">
                Distribuição geográfica dos pacientes cadastrados por cidade, estado e bairro.
              </p>
            </div>
          </div>

          {/* Toggle Switch: Por Cidade vs Por Bairro & Counter Badge */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <div className="inline-flex p-1 bg-[#f0f3ff] rounded-xl border border-[#d8e3fb]">
              <button
                type="button"
                onClick={() => {
                  setGeoMode('city');
                  setIsGeoExpanded(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  geoMode === 'city'
                    ? 'bg-[#006194] text-white shadow-xs'
                    : 'text-[#3f4850] hover:text-[#111c2d] hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apartment</span>
                <span>Por Cidade</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeoMode('neighborhood');
                  setIsGeoExpanded(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  geoMode === 'neighborhood'
                    ? 'bg-[#006194] text-white shadow-xs'
                    : 'text-[#3f4850] hover:text-[#111c2d] hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">signpost</span>
                <span>Por Bairro</span>
              </button>
            </div>

            <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb]">
              {geoMode === 'city' ? (
                <span>Total com cidade: <strong className="text-[#111c2d] font-bold">{totalValidCityPatients}</strong></span>
              ) : (
                <span>Total com bairro: <strong className="text-[#111c2d] font-bold">{totalValidNeighborhoodPatients}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Content: Ordered List / Table */}
        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-[#f8faff] rounded-xl animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-[#006194] border-t-transparent animate-spin" />
            <span className="text-xs text-[#707881]">Calculando distribuição geográfica dos pacientes...</span>
          </div>
        ) : (geoMode === 'city' ? geoCities.length === 0 : geoNeighborhoods.length === 0) ? (
          <div className="p-8 text-center bg-[#f8faff] border border-dashed border-[#d8e3fb] rounded-2xl space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[#707881]">location_off</span>
            <p className="text-sm font-semibold text-[#111c2d]">Não há dados suficientes para gerar o indicador</p>
            <p className="text-xs text-[#707881] max-w-md mx-auto">
              {geoMode === 'city'
                ? 'Nenhum paciente cadastrado possui cidade/estado informados no cadastro.'
                : 'Nenhum paciente cadastrado possui bairro informado no cadastro.'}
              {' '}Ao preencher o endereço no formulário de pacientes, a listagem será atualizada automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table / Ordered List */}
            <div className="divide-y divide-[#f0f3ff] border border-[#d8e3fb] rounded-2xl overflow-hidden bg-white shadow-2xs">
              {displayedGeoItems.map((item, idx) => {
                const rank = idx + 1;
                const maxCount = currentGeoList[0]?.total || 1;
                const ratioPercent = Math.max(8, Math.round((item.total / maxCount) * 100));

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 hover:bg-[#f8faff] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative group"
                  >
                    {/* Left Side: Rank + Location Name */}
                    <div className="flex items-center gap-3 min-w-[200px] sm:w-2/5">
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          rank === 1
                            ? 'bg-[#006194] text-white shadow-xs'
                            : rank === 2
                            ? 'bg-[#325da8] text-white shadow-xs'
                            : rank === 3
                            ? 'bg-[#e7eeff] text-[#006194] font-extrabold border border-[#d8e3fb]'
                            : 'bg-[#f0f3ff] text-[#707881]'
                        }`}
                      >
                        #{rank}
                      </span>
                      <div className="truncate">
                        <span className="text-sm font-bold text-[#111c2d] block truncate">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-[#707881]">
                          {geoMode === 'city' ? (item.secondaryName ? `Estado: ${item.secondaryName}` : 'Cidade') : 'Bairro cadastrado'}
                        </span>
                      </div>
                    </div>

                    {/* Center: Visual Progress Bar */}
                    <div className="flex-1 max-w-md hidden md:block px-4">
                      <div className="h-2.5 w-full bg-[#f0f3ff] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#006194] to-[#00a389] transition-all duration-500"
                          style={{ width: `${ratioPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Right Side: Exact Total & Percentage Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-sm font-bold text-[#111c2d]">
                        {item.total} <span className="text-xs font-normal text-[#707881]">{item.total === 1 ? 'paciente' : 'pacientes'}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#e7eeff] text-[#006194] border border-[#d8e3fb] min-w-[54px] text-center">
                        {item.percentageFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* "Ver todos" / "Ver menos" Expand Button */}
            {currentGeoList.length > 10 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsGeoExpanded(!isGeoExpanded)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-[#006194] bg-[#e7eeff] hover:bg-[#d8e3fb] transition-all cursor-pointer border border-[#d8e3fb] shadow-2xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isGeoExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>
                    {isGeoExpanded
                      ? 'Ver menos (mostrar os 10 primeiros)'
                      : `Ver todos (${currentGeoList.length} ${geoMode === 'city' ? 'cidades' : 'bairros'})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer / Summary Note */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f0f3ff] text-xs text-[#707881]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111c2d]">Ordenação:</span>
            <span>Maior quantidade de pacientes para o menor</span>
          </div>
          <span>
            {geoMode === 'city'
              ? 'Percentual relativo ao total de pacientes com cidade informada'
              : 'Percentual relativo ao total de pacientes com bairro informado'}
          </span>
        </div>
      </section>

      {/* Future Expansion Structure - Prepared for upcoming KPIs */}
      <section className="space-y-4 pt-4 border-t border-[#e7eeff]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base font-semibold text-[#111c2d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#707881] text-[20px]">
                dashboard_customize
              </span>
              Painel de Expansão de Indicadores
            </h2>
            <p className="text-xs text-[#707881]">
              Módulos preparados para adição dos próximos relatórios e métricas de desempenho
            </p>
          </div>
          <span className="text-xs bg-[#f0f3ff] text-[#3f4850] border border-[#d8e3fb] px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            6 Indicadores em Estruturação
          </span>
        </div>

        {/* Group 1: Atendimentos & Consultas */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-[#3f4850] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#006194]">calendar_month</span>
            Atendimentos e Consultas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExpansionCard
              icon="event_available"
              title="Total de Atendimentos"
              description="Histórico consolidado de atendimentos clínicos"
            />
            <ExpansionCard
              icon="more_time"
              title="Atendimentos Realizados Hoje"
              description="Consultas concluídas ao longo do dia atual"
            />
            <ExpansionCard
              icon="date_range"
              title="Atendimentos no Mês"
              description="Volume total de procedimentos executados no mês"
            />
            <ExpansionCard
              icon="event_upcoming"
              title="Consultas Agendadas"
              description="Próximas consultas futuras na agenda"
            />
            <ExpansionCard
              icon="task_alt"
              title="Consultas Realizadas"
              description="Atendimentos finalizados com sucesso"
            />
            <ExpansionCard
              icon="event_busy"
              title="Consultas Canceladas"
              description="Desistências ou cancelamentos com justificativa"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// Custom Dot para os pontos da linha
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const isCurrent = payload?.isCurrentMonth;
  return (
    <g>
      {isCurrent && (
        <circle cx={cx} cy={cy} r={9} fill="#006194" fillOpacity={0.2} />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isCurrent ? 5.5 : 4}
        fill={isCurrent ? '#006194' : '#ffffff'}
        stroke="#006194"
        strokeWidth={isCurrent ? 2.5 : 2}
      />
    </g>
  );
};

// Custom Tooltip para o gráfico de evolução
const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyEvolutionItem;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#d8e3fb] rounded-xl shadow-lg p-3 text-xs pointer-events-none space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#111c2d]">
          <span>{data.monthFullLabel}</span>
          {data.isCurrentMonth && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#e7eeff] text-[#006194]">
              Mês atual
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[#3f4850] pt-0.5">
          <span className="w-2 h-2 rounded-full bg-[#006194]" />
          <span>
            Novos pacientes: <strong className="text-[#006194] font-bold text-sm">{data.total}</strong>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip para o gráfico de faixa etária
const CustomAgeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AgeGroupDistributionItem;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#d8e3fb] rounded-xl shadow-lg p-3 text-xs pointer-events-none space-y-1">
        <div className="flex items-center justify-between gap-3 font-bold text-[#111c2d]">
          <span>{data.name}</span>
          <span className="text-[11px] font-normal text-[#707881]">({data.rangeLabel})</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#3f4850] pt-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span>
            Pacientes: <strong className="text-[#111c2d] font-bold text-sm">{data.total}</strong>
          </span>
        </div>
        <div className="text-[11px] text-[#707881] pt-0.5 font-medium">
          Representa <strong className="text-[#006194] font-semibold">{data.percentageFormatted}</strong> dos pacientes com data informada
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip para o gráfico de sexo (Donut)
const CustomGenderTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as GenderDistributionItem;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#d8e3fb] rounded-xl shadow-lg p-3 text-xs pointer-events-none space-y-1">
        <div className="flex items-center justify-between gap-3 font-bold text-[#111c2d]">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span>{data.name}</span>
          </div>
          <span className="text-xs font-bold text-[#006194]">{data.percentageFormatted}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#3f4850] pt-0.5">
          <span>
            Quantidade: <strong className="text-[#111c2d] font-bold text-sm">{data.total}</strong> {data.total === 1 ? 'paciente' : 'pacientes'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Componente para estruturação dos cards futuros
interface ExpansionCardProps {
  icon: string;
  title: string;
  description: string;
}

const ExpansionCard: React.FC<ExpansionCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white/70 border border-dashed border-[#bfc7d2] rounded-2xl p-4.5 flex flex-col justify-between hover:bg-white hover:border-[#006194]/40 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] text-[#707881] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f0f3ff] text-[#707881] border border-[#d8e3fb]">
          Em breve
        </span>
      </div>
      <div className="mt-3">
        <h4 className="text-sm font-semibold text-[#111c2d] leading-snug">{title}</h4>
        <p className="text-xs text-[#707881] mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
