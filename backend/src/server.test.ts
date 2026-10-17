import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'finpilot-test-secret-only-not-for-production-123456';
process.env.MONGODB_URI = process.env.FINPILOT_TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/finpilot_auth_test';

const { app, connectDatabase, mongoose, User } = await import('./server.js');
let server: ReturnType<typeof app.listen>;
let baseUrl = '';
let testEmail = '';
let secondTestEmail = '';

before(async () => {
  await connectDatabase();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start auth test server.');
  baseUrl = `http://127.0.0.1:${address.port}`;
  testEmail = `auth-${crypto.randomUUID()}@example.test`;
  secondTestEmail = `auth-${crypto.randomUUID()}@example.test`;
});

after(async () => {
  server?.close();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('Mongo registration, invalid login, login, and session restoration work end to end', async () => {
  const configuredSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  const unconfiguredAuth = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'No Secret', email: testEmail, password: 'correct-horse-battery' }) });
  process.env.JWT_SECRET = configuredSecret;
  assert.equal(unconfiguredAuth.status, 503);

  const registered = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Demo Tester', email: testEmail, password: 'correct-horse-battery' }),
  });
  assert.equal(registered.status, 201);
  const registration = await registered.json() as { token: string; user: { id: string; email: string } };
  assert.ok(registration.token);
  assert.equal(registration.user.email, testEmail);
  const persisted = await User.findOne({ email: testEmail }).lean();
  assert.ok(persisted);
  assert.notEqual(persisted.passwordHash, 'correct-horse-battery');

  const invalid = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'incorrect-password' }),
  });
  assert.equal(invalid.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail.toUpperCase(), password: 'correct-horse-battery' }),
  });
  assert.equal(login.status, 200);
  const session = await login.json() as { token: string; user: { id: string } };
  assert.equal(session.user.id, registration.user.id);

  const profile = await fetch(`${baseUrl}/api/profile`, { headers: { authorization: `Bearer ${session.token}` } });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json() as { user: { email: string } }).user.email, testEmail);
  const profileEdit = await fetch(`${baseUrl}/api/profile`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }, body: JSON.stringify({ name: 'Updated Tester' }) });
  assert.equal((await profileEdit.json() as { user: { name: string } }).user.name, 'Updated Tester');

  const created = await fetch(`${baseUrl}/api/transactions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }, body: JSON.stringify({ description: 'Paycheck', amount: 85000, type: 'income', category: 'Salary', date: new Date().toISOString() }) });
  assert.equal(created.status, 201);
  const savedTransaction = await created.json() as { _id: string };
  const ownRecords = await fetch(`${baseUrl}/api/transactions`, { headers: { authorization: `Bearer ${session.token}` } });
  assert.equal((await ownRecords.json() as unknown[]).length, 1);
  const ownDashboardForSalary = await fetch(`${baseUrl}/api/dashboard`, { headers: { authorization: `Bearer ${session.token}` } });
  assert.equal((await ownDashboardForSalary.json() as { income: number }).income, 85000);
  const insufficientForecast = await fetch(`${baseUrl}/api/forecast`, { headers: { authorization: `Bearer ${session.token}` } });
  assert.equal((await insufficientForecast.json() as { available: boolean }).available, false);

  const second = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Second User', email: secondTestEmail, password: 'another-secure-pass' }) });
  assert.equal(second.status, 201);
  const secondSession = await second.json() as { token: string };
  const secondRecords = await fetch(`${baseUrl}/api/transactions`, { headers: { authorization: `Bearer ${secondSession.token}` } });
  assert.equal((await secondRecords.json() as unknown[]).length, 0);
  const crossUserEdit = await fetch(`${baseUrl}/api/transactions/${savedTransaction._id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${secondSession.token}` }, body: JSON.stringify({ description: 'Tamper', amount: 1, type: 'income', category: 'Other', date: new Date().toISOString() }) });
  assert.equal(crossUserEdit.status, 404);
  const ownEdit = await fetch(`${baseUrl}/api/transactions/${savedTransaction._id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }, body: JSON.stringify({ description: 'Updated paycheck', amount: 85000, type: 'income', category: 'Salary', date: new Date().toISOString() }) });
  assert.equal(ownEdit.status, 200);
  const exported = await fetch(`${baseUrl}/api/export`, { headers: { authorization: `Bearer ${session.token}` } });
  const exportBody = await exported.json() as { transactions: unknown[]; profile: Record<string, unknown> };
  assert.equal(exportBody.transactions.length, 1);
  assert.equal(Object.keys(exportBody.profile).includes('passwordHash'), false);

  const accountHeaders = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` };
  const otherHeaders = { authorization: `Bearer ${secondSession.token}` };
  for (const [headers, description, amount, category] of [
    [accountHeaders, 'My groceries', 4200, 'Groceries'],
    [accountHeaders, 'My cafe', 1200, 'Dining'],
    [otherHeaders, 'Other users private expense', 99999, 'Private'],
  ] as const) {
    const expense = await fetch(`${baseUrl}/api/transactions`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ description, amount, type: 'expense', category, date: new Date().toISOString() }) });
    assert.equal(expense.status, 201);
  }
  const topSpending = await fetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question: 'Where did I spend the most this month?' }) });
  assert.equal(topSpending.status, 200);
  const topSpendingAnswer = (await topSpending.json() as { answer: string }).answer;
  assert.match(topSpendingAnswer, /Groceries/);
  assert.match(topSpendingAnswer, /₹4,200/);
  assert.equal(topSpendingAnswer.includes('Other users private expense'), false);
  assert.equal(topSpendingAnswer.includes('Private'), false);
  const budgetCreate = await fetch(`${baseUrl}/api/budgets`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ category: 'Food', monthlyLimit: 10000 }) });
  assert.equal(budgetCreate.status, 201);
  const budget = await budgetCreate.json() as { _id: string };
  const budgetEdit = await fetch(`${baseUrl}/api/budgets/${budget._id}`, { method: 'PATCH', headers: accountHeaders, body: JSON.stringify({ category: 'Dining', monthlyLimit: 12000 }) });
  assert.equal(budgetEdit.status, 200);
  assert.equal((await (await fetch(`${baseUrl}/api/budgets`, { headers: otherHeaders })).json() as unknown[]).length, 0);
  assert.equal((await fetch(`${baseUrl}/api/budgets/${budget._id}`, { method: 'DELETE', headers: otherHeaders })).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/budgets/${budget._id}`, { method: 'DELETE', headers: accountHeaders })).status, 204);
  const goalCreate = await fetch(`${baseUrl}/api/goals`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ name: 'Emergency fund', target: 50000, saved: 1000 }) });
  assert.equal(goalCreate.status, 201);
  const goal = await goalCreate.json() as { _id: string; saved: number };
  const goalContribution = await fetch(`${baseUrl}/api/goals/${goal._id}/contributions`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ amount: 500 }) });
  assert.equal(goalContribution.status, 200);
  assert.equal((await goalContribution.json() as { saved: number }).saved, 1500);
  assert.equal((await fetch(`${baseUrl}/api/goals/${goal._id}/contributions`, { method: 'POST', headers: { ...otherHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 100 }) })).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/goals/${goal._id}`, { method: 'DELETE', headers: accountHeaders })).status, 204);
  const previousKey = process.env.LLM_API_KEY;
  const previousProvider = process.env.LLM_PROVIDER;
  const previousModel = process.env.LLM_MODEL;
  delete process.env.LLM_API_KEY;
  const unavailableAdvisor = await fetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question: 'How is my cash flow?' }) });
  assert.equal(unavailableAdvisor.status, 503);
  process.env.LLM_API_KEY = 'unit-test-only-key';
  process.env.LLM_PROVIDER = 'google';
  process.env.LLM_MODEL = 'gemini-test-model';
  const realFetch = globalThis.fetch;
  const apiFetch = realFetch.bind(globalThis);
  let mockedProviderCall = false;
  let providerRequestCount = 0;
  let mockedProviderStatus = 200;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    providerRequestCount++;
    mockedProviderCall = String(input).includes('/models/gemini-test-model:generateContent') && new Headers(init?.headers).get('x-goog-api-key') === 'unit-test-only-key';
    const body = mockedProviderStatus === 200 ? { candidates: [{ content: { parts: [{ text: 'This is a mocked answer.' }] } }] } : { error: { message: 'unit-test-only-key must never be returned to the client', status: 'UNAUTHENTICATED' } };
    return new Response(JSON.stringify(body), { status: mockedProviderStatus, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    for (const question of ['Explain Docker', 'What is Python?', 'Tell me a joke']) {
      const unrelated = await apiFetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question }) });
      assert.equal(unrelated.status, 200);
      assert.equal((await unrelated.json() as { answer: string }).answer, "I can only help with FinPilot AI's features and your personal financial data. Ask me about your expenses, budgets, savings, goals, assets, liabilities, or net worth.");
    }
    assert.equal(providerRequestCount, 0, 'out-of-scope requests must not reach the AI provider');
    const featureHelp = await apiFetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question: 'How do I create a budget in FinPilot AI?' }) });
    assert.equal(featureHelp.status, 200);
    assert.equal((await featureHelp.json() as { answer: string }).answer, 'This is a mocked answer.');
    assert.equal(providerRequestCount, 1);
    const advisor = await apiFetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question: 'How is my savings goal progressing?' }) });
    assert.equal(advisor.status, 200);
    assert.equal((await advisor.json() as { answer: string }).answer, 'This is a mocked answer.');
    assert.equal(mockedProviderCall, true);
    mockedProviderStatus = 401;
    const rejectedKey = await apiFetch(`${baseUrl}/api/advisor`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ question: 'How is my recorded savings?' }) });
    assert.equal(rejectedKey.status, 502);
    const providerError = await rejectedKey.json() as { error: string };
    assert.match(providerError.error, /Gemini rejected the configured API key/);
    assert.equal(JSON.stringify(providerError).includes('unit-test-only-key'), false);
  } finally {
    globalThis.fetch = realFetch;
    if (previousKey === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = previousKey;
    if (previousProvider === undefined) delete process.env.LLM_PROVIDER; else process.env.LLM_PROVIDER = previousProvider;
    if (previousModel === undefined) delete process.env.LLM_MODEL; else process.env.LLM_MODEL = previousModel;
  }
  const assetCreate = await fetch(`${baseUrl}/api/assets`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ name: 'Savings account', kind: 'bank-savings', value: 50000 }) });
  assert.equal(assetCreate.status, 201);
  const asset = await assetCreate.json() as { _id: string };
  const liabilityCreate = await fetch(`${baseUrl}/api/liabilities`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ name: 'Home loan', kind: 'home-loan', value: 12500 }) });
  assert.equal(liabilityCreate.status, 201);
  const liability = await liabilityCreate.json() as { _id: string };
  const invalidAsset = await fetch(`${baseUrl}/api/assets`, { method: 'POST', headers: accountHeaders, body: JSON.stringify({ name: '', kind: 'bank-savings', value: -4 }) });
  assert.equal(invalidAsset.status, 400);
  for (const resource of ['assets', 'liabilities']) {
    const otherRows = await fetch(`${baseUrl}/api/${resource}`, { headers: otherHeaders });
    assert.equal((await otherRows.json() as unknown[]).length, 0);
  }
  const crossUserAsset = await fetch(`${baseUrl}/api/assets/${asset._id}`, { method: 'PATCH', headers: { ...otherHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tamper', kind: 'cash', value: 1 }) });
  assert.equal(crossUserAsset.status, 404);
  const updateAsset = await fetch(`${baseUrl}/api/assets/${asset._id}`, { method: 'PATCH', headers: accountHeaders, body: JSON.stringify({ name: 'Updated savings', kind: 'bank-savings', value: 60000 }) });
  assert.equal(updateAsset.status, 200);
  const updateLiability = await fetch(`${baseUrl}/api/liabilities/${liability._id}`, { method: 'PATCH', headers: accountHeaders, body: JSON.stringify({ name: 'Updated loan', kind: 'home-loan', value: 15000 }) });
  assert.equal(updateLiability.status, 200);
  const dashboard = await fetch(`${baseUrl}/api/dashboard`, { headers: otherHeaders });
  assert.equal(dashboard.status, 200);
  assert.equal((await dashboard.json() as { netWorth: number }).netWorth, 0);
  const ownDashboard = await fetch(`${baseUrl}/api/dashboard`, { headers: accountHeaders });
  assert.equal((await ownDashboard.json() as { netWorth: number; totalAssets: number; totalLiabilities: number }).netWorth, 45000);
  for (const [resource, id] of [['assets', asset._id], ['liabilities', liability._id]]) {
    const response = await fetch(`${baseUrl}/api/${resource}/${id}`, { method: 'DELETE', headers: otherHeaders });
    assert.equal(response.status, 404);
  }
  for (const [resource, id] of [['assets', asset._id], ['liabilities', liability._id]]) {
    const response = await fetch(`${baseUrl}/api/${resource}/${id}`, { method: 'DELETE', headers: accountHeaders });
    assert.equal(response.status, 204);
  }
  assert.equal((await fetch(`${baseUrl}/api/transactions/${savedTransaction._id}`, { method: 'DELETE', headers: { authorization: `Bearer ${session.token}` } })).status, 204);
});
