/**
 * Fonte única da versão do sistema OdontoSys / Dra. Karine Nogueira Ramos
 */
export const APP_VERSION = 'v2.5.0';
export const APP_VERSION_CODE = '2.5.0';
export const APP_EDITION = 'Clinical Precision + Supabase';
export const APP_VERSION_FULL = `${APP_VERSION} • ${APP_EDITION}`;
export const APP_BUILD_TIMESTAMP = typeof window !== 'undefined' ? new Date().toLocaleDateString('pt-BR') : '';
