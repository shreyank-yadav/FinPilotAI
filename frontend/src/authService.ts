import type { DemoAsset, DemoData, DemoLiability } from './demoStore';

export const AUTH_STORAGE_KEY = 'finpilot-account-session.v1';
const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000';

export interface AccountUser { id: string; name: string; email: string }
export interface AccountSession { token: string; user: AccountUser }
export interface AuthStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface AccountSnapshot { user: AccountUser; data: DemoData }
export interface ForecastMonth { month:string; income:number; spending:number }
export interface ForecastResult { available: boolean; historyMonths: number; history:ForecastMonth[]; baseline_monthly_net?: number; monthly_range?: [number, number]; months?: number; projected_net_total?: number; confidence?: string; method?: string; limitation: string; error?:string }
export interface InsightsResult { monthly: Array<{month:string;income:number;spending:number}>; unusual: Array<{description:string;amount:number;category:string}>; recurring: Array<{description:string;average_amount:number;occurrences:number;cadence:string}>; budgetProgress:Array<{category:string;limit:number;spent:number}>; goals:Array<{name:string;target:number;saved:number}>; limitations:string[]; error?:string }
type Fetcher = typeof fetch;

interface ApiTransaction { _id: string; description: string; amount: number; type: 'income'|'expense'; category: string; date: string }
interface ApiBudget { _id: string; category: string; monthlyLimit: number }
interface ApiGoal { _id: string; name: string; target: number; saved: number; targetDate?: string }
interface ApiAsset { _id: string; name: string; kind: DemoAsset['kind']; value: number }
interface ApiLiability { _id: string; name: string; kind: DemoLiability['kind']; value: number }

function browserStorage(): AuthStorage {
  if (typeof localStorage === 'undefined') throw new Error('Browser storage is unavailable. Enable local storage and try again.');
  return localStorage;
}

export function getSavedSessionToken(storage: AuthStorage = browserStorage()): string | null {
  return storage.getItem(AUTH_STORAGE_KEY);
}

export function saveSession(session: AccountSession, storage: AuthStorage = browserStorage()): void {
  storage.setItem(AUTH_STORAGE_KEY, session.token);
}

export function clearSession(storage: AuthStorage = browserStorage()): void {
  storage.removeItem(AUTH_STORAGE_KEY);
  storage.removeItem('finpilot-token');
}

async function api<T>(path: string, token?: string, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new Error('FinPilot could not reach the backend. Check that the API is running and try again.');
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed. Please try again.');
  return payload;
}

async function authenticate(path: '/api/auth/register'|'/api/auth/login', fields: Record<string, string>, storage = browserStorage(), fetcher: Fetcher = fetch): Promise<AccountSession> {
  const result = await api<AccountSession>(path, undefined, { method: 'POST', body: JSON.stringify(fields) }, fetcher);
  if (!result.token || !result.user?.id) throw new Error('The server returned an incomplete sign-in response. Please try again.');
  saveSession(result, storage);
  return result;
}

export function registerAccount(fields: { name: string; email: string; password: string }, storage?: AuthStorage, fetcher?: Fetcher): Promise<AccountSession> {
  return authenticate('/api/auth/register', fields, storage, fetcher);
}

export function loginAccount(fields: { email: string; password: string }, storage?: AuthStorage, fetcher?: Fetcher): Promise<AccountSession> {
  return authenticate('/api/auth/login', fields, storage, fetcher);
}

export async function restoreAccount(token: string, fetcher: Fetcher = fetch): Promise<AccountSnapshot> {
  const [profile, transactions, budgets, goals, assets, liabilities] = await Promise.all([
    api<{ user: AccountUser }>('/api/profile', token, {}, fetcher),
    api<ApiTransaction[]>('/api/transactions', token, {}, fetcher),
    api<ApiBudget[]>('/api/budgets', token, {}, fetcher),
    api<ApiGoal[]>('/api/goals', token, {}, fetcher),
    api<ApiAsset[]>('/api/assets', token, {}, fetcher),
    api<ApiLiability[]>('/api/liabilities', token, {}, fetcher),
  ]);
  return {
    user: profile.user,
    data: {
      version: 1,
      transactions: transactions.map(row => ({ id: row._id, description: row.description, amount: row.type === 'expense' ? -Math.abs(row.amount) : Math.abs(row.amount), type: row.type, category: row.category, date: row.date.slice(0, 10) })),
      budgets: budgets.map(row => ({ id: row._id, category: row.category, monthlyLimit: row.monthlyLimit })),
      goals: goals.map(row => ({ id: row._id, name: row.name, target: row.target, saved: row.saved, targetDate: row.targetDate?.slice(0, 10) ?? '' })),
      assets: assets.map(row => ({ id: row._id, name: row.name, kind: row.kind, value: row.value })),
      liabilities: liabilities.map(row => ({ id: row._id, name: row.name, kind: row.kind, value: row.value })),
    },
  };
}

export function createAccountRecord<T>(resource: 'transactions'|'budgets'|'goals'|'assets'|'liabilities', input: unknown, token: string): Promise<T> {
  return api<T>(`/api/${resource}`, token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateAccountRecord<T>(resource: 'transactions'|'budgets'|'goals'|'assets'|'liabilities', id: string, input: unknown, token: string): Promise<T> {
  return api<T>(`/api/${resource}/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteAccountRecord(resource: 'transactions'|'budgets'|'goals'|'assets'|'liabilities', id: string, token: string): Promise<void> {
  return api<void>(`/api/${resource}/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
}

export function contributeToAccountGoal(id: string, amount: number, token: string): Promise<void> {
  return api<void>(`/api/goals/${encodeURIComponent(id)}/contributions`, token, { method: 'POST', body: JSON.stringify({ amount }) });
}

export function updateAccountProfile(name: string, token: string): Promise<{user:AccountUser}> {
  return api('/api/profile', token, { method:'PATCH', body:JSON.stringify({name}) });
}
export function getAccountForecast(token: string): Promise<ForecastResult> {
  return api('/api/forecast', token);
}
export function getAccountInsights(token: string): Promise<InsightsResult> {
  return api('/api/insights', token);
}
export function askAccountAdvisor(question: string, token: string): Promise<{answer:string;disclaimer:string}> {
  return api('/api/advisor', token, { method:'POST', body:JSON.stringify({question}) });
}
export function exportAccountData(token: string, fetcher: Fetcher = fetch): Promise<Record<string, unknown>> {
  return api('/api/export', token, {}, fetcher);
}

