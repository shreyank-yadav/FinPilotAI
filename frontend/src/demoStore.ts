export type TransactionKind = 'income' | 'expense';

export interface DemoTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionKind;
  category: string;
  date: string;
}

export interface DemoBudget {
  id: string;
  category: string;
  monthlyLimit: number;
}

export interface DemoGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
}

export type AssetKind = 'bank-savings' | 'cash' | 'investment' | 'property' | 'vehicle';
export type LiabilityKind = 'home-loan' | 'personal-loan' | 'credit-card';
export interface DemoAsset { id: string; name: string; kind: AssetKind; value: number }
export interface DemoLiability { id: string; name: string; kind: LiabilityKind; value: number }
export function validateNetWorthRecord(name: string, value: number): void {
  if (!name.trim() || name.trim().length > 100) throw new Error('Name is required and must be 100 characters or fewer.');
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000_000) throw new Error('Enter a value greater than ₹0 and no more than ₹10,00,00,00,00,000.');
}
export function netWorthTotals(assets: DemoAsset[], liabilities: DemoLiability[]) {
  const totalAssets = assets.reduce((sum, row) => sum + row.value, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.value, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

export interface DemoData {
  version: 1;
  transactions: DemoTransaction[];
  budgets: DemoBudget[];
  goals: DemoGoal[];
  assets: DemoAsset[];
  liabilities: DemoLiability[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEMO_STORAGE_KEY = 'finpilot.demo-data.v1';
const DEFAULT_CATEGORIES = ['Housing', 'Food & dining', 'Transport', 'Shopping', 'Utilities'];
const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localDay = (date = new Date()) => isoDay(date);
export const localMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const relativeDay = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return isoDay(date);
};

export function createInitialDemoData(): DemoData {
  return {
    version: 1,
    transactions: [
      { id: 'seed-salary', description: 'Monthly salary', amount: 125000, type: 'income', category: 'Salary', date: relativeDay(0) },
      { id: 'seed-zepto', description: 'Zepto', amount: -842, type: 'expense', category: 'Groceries', date: relativeDay(0) },
      { id: 'seed-home-loan', description: 'HDFC Home Loan', amount: -28500, type: 'expense', category: 'Housing', date: relativeDay(1) },
      { id: 'seed-swiggy', description: 'Swiggy', amount: -640, type: 'expense', category: 'Food & dining', date: relativeDay(1) },
      { id: 'seed-electricity', description: 'Electricity bill', amount: -1840, type: 'expense', category: 'Utilities', date: relativeDay(3) },
    ],
    budgets: [
      { id: 'seed-budget-housing', category: 'Housing', monthlyLimit: 35000 },
      { id: 'seed-budget-food', category: 'Food & dining', monthlyLimit: 12000 },
      { id: 'seed-budget-transport', category: 'Transport', monthlyLimit: 8000 },
      { id: 'seed-budget-shopping', category: 'Shopping', monthlyLimit: 10000 },
      { id: 'seed-budget-utilities', category: 'Utilities', monthlyLimit: 5000 },
    ],
    goals: [
      { id: 'seed-goal-emergency', name: 'Emergency fund', target: 300000, saved: 182000, targetDate: '2027-03-01' },
      { id: 'seed-goal-japan', name: 'Japan trip', target: 150000, saved: 78500, targetDate: '2026-12-01' },
      { id: 'seed-goal-laptop', name: 'New laptop', target: 120000, saved: 96000, targetDate: '2027-01-01' },
    ],
    assets: [],
    liabilities: [],
  };
}

function validData(value: unknown): value is DemoData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<DemoData>;
  return data.version === 1 && Array.isArray(data.transactions) && data.transactions.every((t) =>
    typeof t.id === 'string' && typeof t.description === 'string' && Number.isFinite(t.amount) &&
    (t.type === 'income' || t.type === 'expense') && typeof t.category === 'string' && isIsoDay(t.date) &&
    (t.type === 'income' ? t.amount >= 0 : t.amount <= 0)) &&
    Array.isArray(data.budgets) && data.budgets.every((b) => typeof b.id === 'string' && typeof b.category === 'string' && Number.isFinite(b.monthlyLimit) && b.monthlyLimit > 0) &&
    Array.isArray(data.goals) && data.goals.every((g) => typeof g.id === 'string' && typeof g.name === 'string' && Number.isFinite(g.target) && g.target > 0 && Number.isFinite(g.saved) && g.saved >= 0 && typeof g.targetDate === 'string' && (!g.targetDate || isIsoDay(g.targetDate))) &&
    (data.assets === undefined || (Array.isArray(data.assets) && data.assets.every((r) => typeof r.id === 'string' && typeof r.name === 'string' && ['bank-savings','cash','investment','property','vehicle'].includes(r.kind) && Number.isFinite(r.value) && r.value > 0))) &&
    (data.liabilities === undefined || (Array.isArray(data.liabilities) && data.liabilities.every((r) => typeof r.id === 'string' && typeof r.name === 'string' && ['home-loan','personal-loan','credit-card'].includes(r.kind) && Number.isFinite(r.value) && r.value > 0)));
}

export function loadDemoData(storage?: StorageLike): DemoData {
  try {
    const source = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const raw = source?.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (validData(parsed)) return { ...parsed, assets: parsed.assets ?? [], liabilities: parsed.liabilities ?? [] };
    }
  } catch {
    // Storage can be unavailable or contain malformed data; fall back to a clean demo.
  }
  return createInitialDemoData();
}

export function saveDemoData(data: DemoData, storage?: StorageLike): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!target) return;
  target.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

export interface TransactionInput {
  description: string;
  amount: number;
  type: TransactionKind;
  category: string;
  date: string;
}

export function validateTransaction(input: TransactionInput): void {
  if (!input.description.trim() || input.description.trim().length > 100) throw new Error('Description is required and must be 100 characters or fewer.');
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000) throw new Error('Enter an amount greater than ₹0 and no more than ₹1,00,00,00,000.');
  if (input.type !== 'income' && input.type !== 'expense') throw new Error('Choose income or expense.');
  if (!input.category.trim() || input.category.trim().length > 60) throw new Error('Choose a category (60 characters or fewer).');
  if (!isIsoDay(input.date)) throw new Error('Choose a valid transaction date.');
}

export function createTransaction(input: TransactionInput, id: string): DemoTransaction {
  validateTransaction(input);
  return { id, description: input.description.trim(), amount: input.type === 'expense' ? -input.amount : input.amount, type: input.type, category: input.category.trim(), date: input.date };
}

export function updateTransaction(transactions: DemoTransaction[], id: string, input: TransactionInput): DemoTransaction[] {
  validateTransaction(input);
  if (!transactions.some((item) => item.id === id)) throw new Error('Transaction was not found. Refresh and try again.');
  return transactions.map((item) => item.id === id ? { ...createTransaction(input, id) } : item);
}

export function deleteTransaction(transactions: DemoTransaction[], id: string): DemoTransaction[] {
  return transactions.filter((item) => item.id !== id);
}

export interface BudgetInput { category: string; monthlyLimit: number }

export function validateBudget(input: BudgetInput, budgets: DemoBudget[], editingId?: string): void {
  if (!input.category.trim() || input.category.trim().length > 60) throw new Error('Budget category is required and must be 60 characters or fewer.');
  if (!Number.isFinite(input.monthlyLimit) || input.monthlyLimit <= 0 || input.monthlyLimit > 1_000_000_000) throw new Error('Enter a monthly limit greater than ₹0 and no more than ₹1,00,00,00,000.');
  if (budgets.some((budget) => budget.id !== editingId && budget.category.toLowerCase() === input.category.trim().toLowerCase())) throw new Error('A budget for this category already exists. Edit the existing budget instead.');
}

export function createBudget(budgets: DemoBudget[], input: BudgetInput, id: string): DemoBudget[] {
  validateBudget(input, budgets);
  return [...budgets, { id, category: input.category.trim(), monthlyLimit: input.monthlyLimit }];
}

export function updateBudget(budgets: DemoBudget[], id: string, input: BudgetInput): DemoBudget[] {
  validateBudget(input, budgets, id);
  if (!budgets.some((item) => item.id === id)) throw new Error('Budget was not found. Refresh and try again.');
  return budgets.map((item) => item.id === id ? { ...item, category: input.category.trim(), monthlyLimit: input.monthlyLimit } : item);
}

export function deleteBudget(budgets: DemoBudget[], id: string): DemoBudget[] {
  return budgets.filter((item) => item.id !== id);
}

export interface GoalInput { name: string; target: number; saved: number; targetDate: string }

export function validateGoal(input: GoalInput): void {
  if (!input.name.trim() || input.name.trim().length > 80) throw new Error('Goal name is required and must be 80 characters or fewer.');
  if (!Number.isFinite(input.target) || input.target <= 0 || input.target > 1_000_000_000) throw new Error('Enter a target greater than ₹0 and no more than ₹1,00,00,00,000.');
  if (!Number.isFinite(input.saved) || input.saved < 0 || input.saved > 1_000_000_000) throw new Error('Saved amount must be zero or more.');
  if (input.targetDate && !isIsoDay(input.targetDate)) throw new Error('Choose a valid target date.');
}

function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function createGoal(goals: DemoGoal[], input: GoalInput, id: string): DemoGoal[] {
  validateGoal(input);
  return [...goals, { id, name: input.name.trim(), target: input.target, saved: input.saved, targetDate: input.targetDate }];
}

export function updateGoal(goals: DemoGoal[], id: string, input: GoalInput): DemoGoal[] {
  validateGoal(input);
  if (!goals.some((item) => item.id === id)) throw new Error('Goal was not found. Refresh and try again.');
  return goals.map((item) => item.id === id ? { ...item, name: input.name.trim(), target: input.target, saved: input.saved, targetDate: input.targetDate } : item);
}

export function contributeToGoal(goals: DemoGoal[], id: string, amount: number): DemoGoal[] {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) throw new Error('Enter a contribution greater than ₹0.');
  if (!goals.some((item) => item.id === id)) throw new Error('Goal was not found. Refresh and try again.');
  return goals.map((item) => item.id === id ? { ...item, saved: item.saved + amount } : item);
}

export function deleteGoal(goals: DemoGoal[], id: string): DemoGoal[] {
  return goals.filter((item) => item.id !== id);
}

export function budgetSpend(transactions: DemoTransaction[], category: string, month = localMonthKey()): number {
  return transactions.reduce((total, transaction) => transaction.type === 'expense' && transaction.category.toLowerCase() === category.toLowerCase() && transaction.date.slice(0, 7) === month ? total + Math.abs(transaction.amount) : total, 0);
}

export function summarizeMonth(transactions: DemoTransaction[], month = localMonthKey()) {
  const rows = transactions.filter(transaction => transaction.date.slice(0, 7) === month);
  const income = rows.filter(row => row.type === 'income').reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const spending = rows.filter(row => row.type === 'expense').reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const categories = rows.filter(row => row.type === 'expense').reduce<Record<string, number>>((result, row) => {
    result[row.category] = (result[row.category] ?? 0) + Math.abs(row.amount);
    return result;
  }, {});
  return { month, income, spending, netCashFlow: income - spending, savingsRate: income ? (income - spending) / income * 100 : null, categories, transactionCount: rows.length };
}

export function previousMonthKey(date = new Date()): string {
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return localMonthKey(previous);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous) * 100;
}

export function budgetCategories(existing: string[] = []): string[] {
  return [...new Set([...DEFAULT_CATEGORIES, ...existing.filter(Boolean)])];
}
