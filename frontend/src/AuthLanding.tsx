import { FormEvent, useState } from 'react';
import { Activity, ArrowRight, Check, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

export interface AuthFields { name?: string; email: string; password: string }
export type AuthMode = 'login'|'register';

export function AuthLanding({ busy, error, onDemo, onAuthenticate }: { busy: boolean; error: string; onDemo: () => void; onAuthenticate: (mode: AuthMode, fields: AuthFields) => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [validationError, setValidationError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirmPassword') ?? '');
    if (mode === 'register' && (!name || name.length > 80)) { setValidationError('Enter your name (80 characters or fewer).'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) { setValidationError('Enter a valid email address.'); return; }
    if (password.length < 8 || password.length > 100) { setValidationError('Password must be between 8 and 100 characters.'); return; }
    if (mode === 'register' && password !== confirm) { setValidationError('Passwords do not match.'); return; }
    setValidationError('');
    void onAuthenticate(mode, { name, email, password });
  };
  return <div className="landing"><header className="landing-header"><div className="brand"><div className="brand-mark"><Activity size={19}/></div><span>finpilot<span className="brand-ai">.ai</span></span></div><span className="demo-pill"><i/> Private demo workspace</span></header>
    <main className="landing-main"><div className="landing-copy"><div className="eyebrow"><span className="period-dot"/> PERSONAL FINANCE, IN FOCUS</div><h1>Make your money<br/><em>make more sense.</em></h1><p>One calm, clear view of your money. Understand today, plan for what’s next, and make confident financial decisions.</p><div className="landing-points"><span><Check size={15}/> Built for India, in INR</span><span><Check size={15}/> No bank connection needed</span><span><Check size={15}/> Account records stay separate from demo data</span></div><button className="primary-button landing-cta" onClick={onDemo} disabled={busy}>Explore the demo <ArrowRight size={16}/></button><small>Synthetic example data · Nothing moves money</small></div>
      <div className="landing-preview"><div className="preview-orbit orbit-one"/><div className="preview-orbit orbit-two"/><div className="preview-card"><div className="preview-top"><span>YOUR FINANCIAL SNAPSHOT</span><span className="demo-pill"><i/> DEMO</span></div><div className="preview-balance">₹18,42,650</div><div className="preview-caption">Net worth <span>↗ 8.4%</span></div><div className="preview-chart">{['36%','51%','43%','66%','58%','82%','72%','94%'].map((height,index)=><div key={index} style={{height}}/>)}</div><div className="preview-bottom"><span>Income <b>₹1,25,000</b></span><span>Spending <b>₹74,280</b></span></div></div><div className="floating-insight"><Sparkles size={15}/><span><b>Savings rate</b><small>Sample data</small></span><TrendingUp size={15}/></div></div>
    </main><section className="landing-footer"><span>Thoughtful tools for your financial life.</span><div><span><ShieldCheck size={14}/> Private by design</span><span>Educational use only</span></div></section>
    <div className="login-drawer"><form onSubmit={submit} noValidate><div className="auth-form-heading"><div><b>{mode === 'login' ? 'Welcome back' : 'Create your account'}</b><small>{mode === 'login' ? 'Sign in to your private workspace.' : 'Your records are stored in your account.'}</small></div><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setValidationError(''); }}>Login</button><button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setValidationError(''); }}>Sign up</button></div></div>
      {mode === 'register' && <label>Your name<input autoComplete="name" name="name" placeholder="Full name" maxLength={80} required/></label>}
      <label>Email address<input autoComplete="email" type="email" name="email" placeholder="you@example.com" maxLength={254} required/></label>
      <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" name="password" placeholder="At least 8 characters" minLength={8} maxLength={100} required/></label>
      {mode === 'register' && <label>Confirm password<input autoComplete="new-password" type="password" name="confirmPassword" placeholder="Enter password again" minLength={8} maxLength={100} required/></label>}
      {(validationError || error) && <small className="auth-error" role="alert">{validationError || error}</small>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={15}/></button>
      <p className="auth-footnote">Account sign-in requires the FinPilot API and MongoDB. Your demo data remains in this browser only.</p>
    </form></div>
  </div>;
}
