import { FormEvent, useState } from 'react';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  budgetSpend, DemoBudget, DemoGoal, DemoTransaction, localDay, localMonthKey,
  GoalInput, TransactionInput,
} from './demoStore';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Could not save this change. Please try again.';

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-scrim" onClick={onClose}><section className="modal card" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" onClick={onClose} aria-label="Close">×</button><h2>{title}</h2><p>{subtitle}</p>{children}</section></div>;
}

function ErrorNote({ message }: { message: string }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}

export function TransactionForm({ initial, categories, onClose, onSave }: { initial?: DemoTransaction; categories: string[]; onClose: () => void; onSave: (input: TransactionInput) => void | Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setBusy(true); setError('');
      await onSave({ description: String(form.get('description') ?? ''), amount: Number(form.get('amount')), type: form.get('type') as TransactionInput['type'], category: String(form.get('category') ?? ''), date: String(form.get('date') ?? '') });
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  return <Modal title={initial ? 'Edit transaction' : 'Add transaction'} subtitle="Record activity in your private demo ledger." onClose={onClose}><form onSubmit={submit} noValidate>
    <label>Description<input name="description" maxLength={100} required defaultValue={initial?.description ?? ''} autoFocus/></label>
    <label>Amount (₹)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue={initial ? Math.abs(initial.amount) : ''}/></label>
    <label>Type<select name="type" defaultValue={initial?.type ?? 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label>
    <label>Category<input name="category" list="transaction-categories" maxLength={60} required defaultValue={initial?.category ?? ''} placeholder="e.g. Food & dining"/><datalist id="transaction-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist></label>
    <label>Date<input name="date" type="date" required defaultValue={initial?.date ?? localDay()}/></label>
    <ErrorNote message={error}/><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Save transaction'} <ArrowRight size={16}/></button>
    <small>Demo data stays in this browser and does not connect to or move money.</small>
  </form></Modal>;
}

function TransactionRow({ transaction, onEdit, onDelete }: { transaction: DemoTransaction; onEdit: () => void; onDelete: () => void }) {
  return <div className="transaction-row"><div className={`tx-icon ${transaction.type === 'income' ? 'income' : ''}`}>{transaction.type === 'income' ? '↗' : transaction.category.slice(0, 1).toUpperCase()}</div>
    <div className="tx-name"><b>{transaction.description}</b><small>{transaction.category} · {transaction.type === 'income' ? 'Income' : 'Expense'}</small></div>
    <span className="tx-date">{dateLabel(transaction.date)}</span><b className={`tx-amount ${transaction.type === 'income' ? 'income-text' : ''}`}>{transaction.amount < 0 ? '−' : '+'}{money(Math.abs(transaction.amount))}</b>
    <div className="row-actions"><button className="icon-button" aria-label={`Edit ${transaction.description}`} onClick={onEdit}><Pencil size={14}/></button><button className="icon-button danger-action" aria-label={`Delete ${transaction.description}`} onClick={onDelete}><Trash2 size={14}/></button></div>
  </div>;
}

export function TransactionsPage({ transactions, query, onQuery, onAdd, onEdit, onDelete }: { transactions: DemoTransaction[]; query: string; onQuery: (value: string) => void; onAdd: () => void; onEdit: (transaction: DemoTransaction) => void; onDelete: (transaction: DemoTransaction) => void }) {
  const visible = transactions.filter((item) => `${item.description} ${item.category} ${item.type}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="card full-card"><div className="card-head"><div><h2>Transactions</h2><p>Review and manage activity in the current workspace.</p></div><div className="inline-actions"><label className="search-field">⌕<input id="searchbox" placeholder="Search transactions" value={query} onChange={(event) => onQuery(event.target.value)}/></label><button className="primary-button" onClick={onAdd}><Plus size={16}/> Add</button></div></div>
    <div className="table-head"><span>TRANSACTION</span><span>DATE</span><span>AMOUNT</span><span>TYPE</span><span/></div>
    {visible.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={() => onEdit(transaction)} onDelete={() => onDelete(transaction)}/>)}
    {visible.length === 0 && <div className="empty-state">{transactions.length ? 'No transactions match that search.' : 'No transactions yet. Add one to get started.'}</div>}
  </section>;
}

export function BudgetsPage({ budgets, transactions, onAdd, onEdit, onDelete }: { budgets: DemoBudget[]; transactions: DemoTransaction[]; onAdd: () => void; onEdit: (budget: DemoBudget) => void; onDelete: (budget: DemoBudget) => void }) {
  const month = localMonthKey();
  return <section className="card full-card"><div className="card-head"><div><h2>Monthly budgets</h2><p>Progress uses this month’s recorded expense transactions.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16}/> New budget</button></div>
    {budgets.map((budget) => { const spent = budgetSpend(transactions, budget.category, month); const pct = budget.monthlyLimit ? Math.min(100, Math.round(spent / budget.monthlyLimit * 100)) : 0; return <div className="budget-line" key={budget.id}>
      <div className="budget-line-head"><b>{budget.category}</b><span>{money(spent)} <small>of {money(budget.monthlyLimit)} · {pct}%</small></span><div className="row-actions"><button className="icon-button" aria-label={`Edit ${budget.category} budget`} onClick={() => onEdit(budget)}><Pencil size={14}/></button><button className="icon-button danger-action" aria-label={`Delete ${budget.category} budget`} onClick={() => onDelete(budget)}><Trash2 size={14}/></button></div></div>
      <div className="progress"><i style={{ width: `${pct}%`, background: pct >= 100 ? '#e87e9b' : undefined }}/></div></div>; })}
    {budgets.length === 0 && <div className="empty-state">No budgets yet. Create a budget to track category spending.</div>}
  </section>;
}

export function BudgetForm({ initial, categories, onClose, onSave }: { initial?: DemoBudget; categories: string[]; onClose: () => void; onSave: (input: { category: string; monthlyLimit: number }) => void | Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setBusy(true); setError(''); await onSave({ category: String(form.get('category') ?? ''), monthlyLimit: Number(form.get('monthlyLimit')) }); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <Modal title={initial ? 'Edit budget' : 'Create budget'} subtitle="Choose a category and a monthly spending limit." onClose={onClose}><form onSubmit={submit} noValidate>
    <label>Category<input name="category" list="budget-categories" maxLength={60} required defaultValue={initial?.category ?? ''}/><datalist id="budget-categories">{categories.map((category) => <option key={category} value={category}/>)}</datalist></label>
    <label>Monthly limit (₹)<input name="monthlyLimit" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue={initial?.monthlyLimit ?? ''}/></label>
    <ErrorNote message={error}/><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create budget'} <ArrowRight size={16}/></button>
  </form></Modal>;
}

export function GoalsPage({ goals, onAdd, onEdit, onContribute, onDelete }: { goals: DemoGoal[]; onAdd: () => void; onEdit: (goal: DemoGoal) => void; onContribute: (goal: DemoGoal) => void; onDelete: (goal: DemoGoal) => void }) {
  return <div className="goal-grid">{goals.map((goal) => { const pct = goal.target ? Math.min(100, Math.round(goal.saved / goal.target * 100)) : 0; return <section className="card goal-card" key={goal.id}>
    <div className="goal-icon"><GoalIcon name={goal.name}/></div><div className="goal-date">{goal.targetDate ? `Target · ${dateLabel(goal.targetDate)}` : 'No target date'}</div><h2>{goal.name}</h2><p>{money(goal.saved)} <span>saved of {money(goal.target)}</span></p><div className="progress"><i style={{ width: `${pct}%` }}/></div><div className="goal-bottom"><span>{pct}% complete</span><button onClick={() => onContribute(goal)}>Add money <Plus size={14}/></button></div>
    <div className="goal-actions"><button className="outline-button" onClick={() => onEdit(goal)}><Pencil size={13}/> Edit</button><button className="outline-button danger-action" onClick={() => onDelete(goal)}><Trash2 size={13}/> Delete</button></div>
  </section>; })}
    <button className="card add-goal" onClick={onAdd}><Plus size={22}/><b>Create a goal</b><span>Make a plan for something that matters</span></button>
  </div>;
}

function GoalIcon({ name }: { name: string }) { return <span aria-hidden="true">{name.toLowerCase().includes('trip') ? '✈' : name.toLowerCase().includes('emergency') ? '✚' : '◎'}</span>; }

export function GoalForm({ initial, onClose, onSave }: { initial?: DemoGoal; onClose: () => void; onSave: (input: GoalInput) => void | Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setBusy(true); setError(''); await onSave({ name: String(form.get('name') ?? ''), target: Number(form.get('target')), saved: Number(form.get('saved') || 0), targetDate: String(form.get('targetDate') ?? '') }); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <Modal title={initial ? 'Edit goal' : 'Create goal'} subtitle="Set a target and track progress over time." onClose={onClose}><form onSubmit={submit} noValidate>
    <label>Goal name<input name="name" maxLength={80} required defaultValue={initial?.name ?? ''} autoFocus/></label>
    <label>Target amount (₹)<input name="target" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue={initial?.target ?? ''}/></label>
    <label>Already saved (₹)<input name="saved" type="number" min="0" max="1000000000" step="0.01" defaultValue={initial?.saved ?? 0}/></label>
    <label>Target date<input name="targetDate" type="date" defaultValue={initial?.targetDate ?? ''}/></label>
    <ErrorNote message={error}/><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create goal'} <ArrowRight size={16}/></button>
  </form></Modal>;
}

export function ContributionForm({ goal, onClose, onSave }: { goal: DemoGoal; onClose: () => void; onSave: (amount: number) => void | Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { setBusy(true); setError(''); await onSave(Number(form.get('amount'))); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <Modal title={`Contribute to ${goal.name}`} subtitle={`Saved so far: ${money(goal.saved)} of ${money(goal.target)}.`} onClose={onClose}><form onSubmit={submit} noValidate>
    <label>Contribution amount (₹)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required autoFocus/></label>
    <ErrorNote message={error}/><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add contribution'} <ArrowRight size={16}/></button>
  </form></Modal>;
}
