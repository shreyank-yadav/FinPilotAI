import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTopSpendingAnswer, indiaMonth, summarizeAdvisorMonth, summarizeNetWorth } from './advisorFinance.js';

test('month summaries use Asia/Kolkata date boundaries and expense categories only', () => {
  const rows = [
    { amount: 100000, type: 'income' as const, category: 'Salary', date: '2026-03-31T19:00:00.000Z' }, // April in India
    { amount: 4200, type: 'expense' as const, category: 'Groceries', date: '2026-04-02T10:00:00.000Z' },
    { amount: 1600, type: 'expense' as const, category: 'Dining', date: '2026-04-03T10:00:00.000Z' },
    { amount: 999, type: 'expense' as const, category: 'March item', date: '2026-03-31T18:29:59.000Z' },
  ];
  assert.equal(indiaMonth(rows[0].date), '2026-04');
  const april = summarizeAdvisorMonth(rows, '2026-04');
  assert.equal(april.income, 100000);
  assert.equal(april.expenses, 5800);
  assert.equal(april.savingsRate, 94.2);
  assert.equal(april.highestSpendingCategory?.category, 'Groceries');
  assert.deepEqual(april.spendingByCategory.map(row => row.category), ['Groceries', 'Dining']);
  assert.equal(summarizeAdvisorMonth(rows, '2026-03').expenses, 999);
});

test('top spending answer is data-grounded, INR formatted, and honest when records are absent', () => {
  const current = indiaMonth(new Date());
  const summary = summarizeAdvisorMonth([{ amount: 4200, type: 'expense', category: 'Groceries', date: new Date() }], current);
  assert.match(buildTopSpendingAnswer(summary), /Groceries/);
  assert.match(buildTopSpendingAnswer(summary), /₹4,200/);
  const empty = summarizeAdvisorMonth([], current);
  assert.match(buildTopSpendingAnswer(empty), /no expense transactions recorded/);
});

test('current-month selection excludes records from the previous Indian calendar month', () => {
  const current = indiaMonth(new Date());
  const rows = [
    { amount: 700, type: 'expense' as const, category: 'Current', date: new Date() },
    { amount: 9000, type: 'expense' as const, category: 'Previous', date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
  ];
  const summary = summarizeAdvisorMonth(rows, current);
  assert.equal(summary.expenses, 700);
  assert.equal(summary.highestSpendingCategory?.category, 'Current');
});

test('net worth is not stated as zero when no asset or liability records exist', () => {
  assert.deepEqual(summarizeNetWorth([], []), { available: false, totalAssets: null, totalLiabilities: null, netWorth: null, assetRecords: 0, liabilityRecords: 0 });
  assert.deepEqual(summarizeNetWorth([{ value: 50000 }], [{ value: 12500 }]).netWorth, 37500);
});
