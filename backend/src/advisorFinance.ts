export type AdvisorTransaction = {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date | string;
};

export type SpendingCategoryTotal = { category: string; amount: number; records: number };

export function indiaMonth(date: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date(date));
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`;
}

export function summarizeAdvisorMonth(rows: AdvisorTransaction[], month: string) {
  const matching = rows.filter(row => indiaMonth(row.date) === month);
  const incomeRows = matching.filter(row => row.type === 'income');
  const expenseRows = matching.filter(row => row.type === 'expense');
  const categoryTotals = new Map<string, SpendingCategoryTotal>();
  for (const row of expenseRows) {
    const category = row.category.trim() || 'Uncategorized';
    const total = categoryTotals.get(category) ?? { category, amount: 0, records: 0 };
    total.amount += Math.abs(row.amount);
    total.records += 1;
    categoryTotals.set(category, total);
  }
  const income = incomeRows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const expenses = expenseRows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const categories = [...categoryTotals.values()].sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  return {
    month,
    income,
    expenses,
    netCashFlow: income - expenses,
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : null,
    incomeRecords: incomeRows.length,
    expenseRecords: expenseRows.length,
    transactionRecords: matching.length,
    categoryCount: categories.length,
    spendingByCategory: categories,
    highestSpendingCategory: categories[0] ?? null,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

export function buildTopSpendingAnswer(summary: ReturnType<typeof summarizeAdvisorMonth>): string {
  if (summary.expenseRecords === 0) {
    return `### This month's recorded spending\n\nThere are no expense transactions recorded for ${summary.month}, so I can't identify a highest-spending category. This describes the records available here, not necessarily all of your spending.`;
  }
  const top = summary.highestSpendingCategory!;
  return `### Summary\n\nYour highest recorded spending category this month is **${top.category}**, at **${formatINR(top.amount)}**.\n\n### Recorded figures\n\n- Total recorded expenses: **${formatINR(summary.expenses)}**\n- Expense transactions: **${summary.expenseRecords}** across ${summary.categoryCount} categories\n\nReview the transactions in ${top.category} to see which entries contribute most to that total.`;
}

export function summarizeNetWorth(assets: Array<{ value: number }>, liabilities: Array<{ value: number }>) {
  const totalAssets = assets.reduce((sum, row) => sum + row.value, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.value, 0);
  const hasRecords = assets.length + liabilities.length > 0;
  return {
    available: hasRecords,
    totalAssets: hasRecords ? totalAssets : null,
    totalLiabilities: hasRecords ? totalLiabilities : null,
    netWorth: hasRecords ? totalAssets - totalLiabilities : null,
    assetRecords: assets.length,
    liabilityRecords: liabilities.length,
  };
}
