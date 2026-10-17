import assert from 'node:assert/strict';
import test from 'node:test';
import {
  budgetSpend, contributeToGoal, createBudget, createGoal, createInitialDemoData,
  createTransaction, deleteBudget, deleteGoal, deleteTransaction, DEMO_STORAGE_KEY,
  loadDemoData, saveDemoData, updateBudget, updateGoal, updateTransaction,
  netWorthTotals, validateNetWorthRecord,
  summarizeMonth, percentChange,
} from './demoStore.ts';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
};

test('transactions validate entered values and support create, edit, delete, and reload', () => {
  const data = createInitialDemoData();
  const created = createTransaction({ description: '  Bus pass ', amount: 1250, type: 'expense', category: 'Transport', date: '2026-10-10' }, 'tx-1');
  assert.deepEqual([created.description, created.amount, created.type, created.category, created.date], ['Bus pass', -1250, 'expense', 'Transport', '2026-10-10']);
  const withCreated = [...data.transactions, created];
  const edited = updateTransaction(withCreated, 'tx-1', { description: 'Salary', amount: 90000, type: 'income', category: 'Salary', date: '2026-10-11' });
  assert.equal(edited[edited.length - 1]?.amount, 90000);
  assert.equal(edited[edited.length - 1]?.description, 'Salary');
  const storage = memoryStorage();
  saveDemoData({ ...data, transactions: edited }, storage);
  assert.equal(loadDemoData(storage).transactions[loadDemoData(storage).transactions.length - 1]?.id, 'tx-1');
  const afterDelete = deleteTransaction(edited, 'tx-1');
  assert.equal(afterDelete.some((item) => item.id === 'tx-1'), false);
  saveDemoData({ ...data, transactions: afterDelete }, storage);
  assert.equal(loadDemoData(storage).transactions.some((item) => item.id === 'tx-1'), false);
  assert.throws(() => createTransaction({ description: ' ', amount: 0, type: 'expense', category: '', date: 'bad' }, 'bad'), /Description is required/);
  assert.throws(() => createTransaction({ description: 'Invalid date', amount: 1, type: 'expense', category: 'Other', date: '2026-02-31' }, 'bad-date'), /valid transaction date/);
  assert.equal(storage.getItem(DEMO_STORAGE_KEY) !== null, true);
});

test('net worth demo records start empty, validate values, and calculate from saved entries only', () => {
  const data = createInitialDemoData();
  assert.deepEqual(data.assets, []);
  assert.deepEqual(data.liabilities, []);
  assert.deepEqual(netWorthTotals(data.assets, data.liabilities), { totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
  validateNetWorthRecord('Savings', 50000);
  assert.throws(() => validateNetWorthRecord(' ', 500), /Name is required/);
  assert.throws(() => validateNetWorthRecord('Savings', 0), /greater than/);
  assert.deepEqual(netWorthTotals([{ id: 'a', name: 'Savings', kind: 'bank-savings', value: 50000 }], [{ id: 'l', name: 'Loan', kind: 'home-loan', value: 12500 }]), { totalAssets: 50000, totalLiabilities: 12500, netWorth: 37500 });
});

test('asset and liability demo entries persist in the separate demo store', () => {
  const storage = memoryStorage();
  const data = createInitialDemoData();
  data.assets.push({ id: 'a1', name: 'Savings', kind: 'bank-savings', value: 25000 });
  data.liabilities.push({ id: 'l1', name: 'Card balance', kind: 'credit-card', value: 3000 });
  saveDemoData(data, storage);
  const restored = loadDemoData(storage);
  assert.equal(restored.assets[0]?.value, 25000);
  assert.equal(restored.liabilities[0]?.kind, 'credit-card');
});

test('monthly summary and comparison use only matching-period income and expenses', () => {
  const rows = [
    { id:'i1',description:'Salary',amount:100000,type:'income' as const,category:'Salary',date:'2026-10-02' },
    { id:'e1',description:'Rent',amount:-25000,type:'expense' as const,category:'Housing',date:'2026-10-03' },
    { id:'e2',description:'Food',amount:-5000,type:'expense' as const,category:'Food',date:'2026-09-03' },
  ];
  const month = summarizeMonth(rows, '2026-10');
  assert.equal(month.income, 100000);
  assert.equal(month.spending, 25000);
  assert.equal(month.savingsRate, 75);
  assert.deepEqual(month.categories, { Housing: 25000 });
  assert.equal(percentChange(110, 100), 10);
  assert.equal(percentChange(100, 0), null);
});

test('budgets create, edit, delete, reject duplicates, and calculate current-month spend', () => {
  const start = createBudget([], { category: 'Food', monthlyLimit: 10000 }, 'b1');
  assert.throws(() => createBudget(start, { category: ' food ', monthlyLimit: 2000 }, 'b2'), /already exists/);
  const changed = updateBudget(start, 'b1', { category: 'Dining', monthlyLimit: 12000 });
  assert.equal(changed[0].monthlyLimit, 12000);
  assert.equal(deleteBudget(changed, 'b1').length, 0);
  const storage = memoryStorage();
  const seeded = createInitialDemoData();
  saveDemoData({ ...seeded, budgets: changed }, storage);
  assert.equal(loadDemoData(storage).budgets[0].category, 'Dining');
  saveDemoData({ ...seeded, budgets: deleteBudget(changed, 'b1') }, storage);
  assert.equal(loadDemoData(storage).budgets.length, 0);
  const transactions = [
    { id: '1', description: 'Lunch', amount: -800, type: 'expense' as const, category: 'Food', date: '2026-10-04' },
    { id: '2', description: 'Pay', amount: 50000, type: 'income' as const, category: 'Food', date: '2026-10-04' },
    { id: '3', description: 'Old', amount: -900, type: 'expense' as const, category: 'Food', date: '2026-09-04' },
  ];
  assert.equal(budgetSpend(transactions, 'food', '2026-10'), 800);
});

test('goals create, edit, receive contributions, delete, and validate amounts', () => {
  const first = createGoal([], { name: 'Trip', target: 100000, saved: 10000, targetDate: '2027-01-01' }, 'g1');
  const contributed = contributeToGoal(first, 'g1', 5000);
  assert.equal(contributed[0].saved, 15000);
  const edited = updateGoal(contributed, 'g1', { name: 'Family trip', target: 120000, saved: contributed[0].saved, targetDate: '2027-02-01' });
  assert.equal(edited[0].name, 'Family trip');
  assert.equal(deleteGoal(edited, 'g1').length, 0);
  const storage = memoryStorage();
  const seeded = createInitialDemoData();
  saveDemoData({ ...seeded, goals: edited }, storage);
  assert.equal(loadDemoData(storage).goals[0].saved, 15000);
  saveDemoData({ ...seeded, goals: deleteGoal(edited, 'g1') }, storage);
  assert.equal(loadDemoData(storage).goals.length, 0);
  assert.throws(() => contributeToGoal(first, 'g1', 0), /contribution greater than/);
  assert.throws(() => createGoal([], { name: '', target: 1, saved: 0, targetDate: '' }, 'bad'), /Goal name is required/);
});

test('malformed demo storage falls back to a clean seed', () => {
  const storage = memoryStorage();
  storage.setItem(DEMO_STORAGE_KEY, '{bad json');
  assert.equal(loadDemoData(storage).version, 1);
  assert.equal(loadDemoData(storage).budgets.length, 5);
  assert.equal(loadDemoData(storage).goals.length, 3);
});
