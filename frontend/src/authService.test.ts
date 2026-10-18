import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STORAGE_KEY, clearSession, exportAccountData, getSavedSessionToken, loginAccount, registerAccount, resolveApiBase, restoreAccount, saveSession, type AuthStorage } from './authService.ts';

function memoryStorage(): AuthStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('API base honors VITE_API_URL, removes a trailing /api, and uses safe environment fallbacks', () => {
  assert.equal(resolveApiBase(' https://finpilotai-b62i.onrender.com/ ', false), 'https://finpilotai-b62i.onrender.com');
  assert.equal(resolveApiBase('https://finpilotai-b62i.onrender.com/api/', false), 'https://finpilotai-b62i.onrender.com');
  assert.equal(`${resolveApiBase('https://finpilotai-b62i.onrender.com/api/', false)}/api/auth/login`, 'https://finpilotai-b62i.onrender.com/api/auth/login');
  assert.equal(resolveApiBase(undefined, true), 'http://localhost:4000');
  assert.equal(resolveApiBase(undefined, false), 'https://finpilotai-b62i.onrender.com');
});

test('registration and login save the returned account session', async () => {
  const verifySavedSession = async (invoke: (storage: AuthStorage) => Promise<{ token: string; user: { id: string; name: string; email: string } }>) => {
    const storage = memoryStorage();
    const session = { token: 'signed-token', user: { id: 'user-1', name: 'Asha', email: 'asha@example.test' } };
    const result = await invoke(storage);
    assert.deepEqual(result, session);
    assert.equal(getSavedSessionToken(storage), 'signed-token');
  };
  await verifySavedSession(storage => registerAccount({ name: 'Asha', email: 'asha@example.test', password: 'secure-pass-1' }, storage, async () => reply({ token: 'signed-token', user: { id: 'user-1', name: 'Asha', email: 'asha@example.test' } })));
  await verifySavedSession(storage => loginAccount({ email: 'asha@example.test', password: 'secure-pass-1' }, storage, async () => reply({ token: 'signed-token', user: { id: 'user-1', name: 'Asha', email: 'asha@example.test' } })));
});

test('invalid credentials surface a useful server message and do not save a session', async () => {
  const storage = memoryStorage();
  await assert.rejects(loginAccount({ email: 'asha@example.test', password: 'wrong-pass' }, storage, async () => reply({ error: 'Email or password is incorrect' }, 401)), /Email or password is incorrect/);
  assert.equal(getSavedSessionToken(storage), null);
});

test('restores profile and account records from authenticated API endpoints', async () => {
  const storage = memoryStorage();
  saveSession({ token: 'valid', user: { id: 'user-1', name: 'Asha', email: 'asha@example.test' } }, storage);
  const responses: Record<string, unknown> = {
    '/api/profile': { user: { id: 'user-1', name: 'Asha', email: 'asha@example.test' } },
    '/api/transactions': [{ _id: 'tx1', description: 'Rent', amount: 25000, type: 'expense', category: 'Housing', date: '2026-10-01T00:00:00.000Z' }],
    '/api/budgets': [{ _id: 'b1', category: 'Housing', monthlyLimit: 30000 }],
    '/api/goals': [{ _id: 'g1', name: 'Reserve', target: 100000, saved: 12000 }],
    '/api/assets': [{ _id: 'a1', name: 'Savings', kind: 'bank-savings', value: 50000 }],
    '/api/liabilities': [{ _id: 'l1', name: 'Home loan', kind: 'home-loan', value: 12000 }],
  };
  const seen: string[] = [];
  const result = await restoreAccount(getSavedSessionToken(storage)!, async (input, init) => {
    const url = new URL(String(input));
    seen.push(`${url.pathname}:${new Headers(init?.headers).get('authorization')}`);
    return reply(responses[url.pathname]);
  });
  assert.equal(result.user.name, 'Asha');
  assert.equal(result.data.transactions[0]?.amount, -25000);
  assert.equal(result.data.budgets[0]?.id, 'b1');
  assert.equal(result.data.goals[0]?.saved, 12000);
  assert.equal(result.data.assets[0]?.value, 50000);
  assert.equal(result.data.liabilities[0]?.kind, 'home-loan');
  assert.equal(seen.length, 6);
  assert.ok(seen.every(path => path.endsWith(':Bearer valid')));
});

test('logout removes the account token without touching demo storage', () => {
  const storage = memoryStorage();
  storage.setItem(AUTH_STORAGE_KEY, 'token');
  storage.setItem('finpilot.demo-data.v1', 'demo-records');
  clearSession(storage);
  assert.equal(getSavedSessionToken(storage), null);
  assert.equal(storage.getItem('finpilot.demo-data.v1'), 'demo-records');
});

test('account export requests the authenticated backend export', async () => {
  let requested = '';
  const result = await exportAccountData('account-token', async (input, init) => {
    requested = `${new URL(String(input)).pathname}:${new Headers(init?.headers).get('authorization')}`;
    return reply({ transactions: [], budgets: [], goals: [], assets: [], liabilities: [], recurring: [] });
  });
  assert.equal(requested, '/api/export:Bearer account-token');
  assert.ok('recurring' in result);
});
