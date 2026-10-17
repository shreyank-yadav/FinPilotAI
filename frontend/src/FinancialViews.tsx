import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import type { ForecastResult } from './authService';

const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
type DemoMonth={month:string;income:number;spend:number};

export function ForecastPage({mode,result,loading,error,demoHistory,onRetry}:{mode:'demo'|'account';result:ForecastResult|null;loading:boolean;error:string;demoHistory:DemoMonth[];onRetry:()=>void}) {
  const chartData=mode==='account'?(result?.history??[]).map(row=>({month:row.month,income:row.income/1000,spend:row.spending/1000})):demoHistory;
  const net=demoHistory.map(row=>row.income-row.spend),average=net.length?net.reduce((sum,n)=>sum+n,0)/net.length:0;
  const spread=net.length>1?Math.sqrt(net.reduce((sum,n)=>sum+(n-average)**2,0)/(net.length-1)):0;
  return <section className="card full-card"><div className="card-head"><div><h2>Cash-flow forecast</h2><p>{mode==='account'?'Based on your recorded monthly income and expenses':'Synthetic demo history Â· illustrative only'}</p></div><span className="beta-pill">ESTIMATE</span></div>
    {mode==='account'&&loading?<div className="empty-state" role="status">Loading your recorded historyâ€¦</div>:null}
    {mode==='account'&&error?<div className="empty-state" role="alert">{error}<button className="text-link" onClick={onRetry}>Retry <RefreshCw size={13}/></button></div>:null}
    {mode==='account'&&!loading&&!error&&result&&!result.available?<div className="forecast-callout"><TrendingUp size={18}/><div><b>More history is needed</b><span>{result.limitation} Current history: {result.historyMonths} month{result.historyMonths===1?'':'s'}.</span></div></div>:null}
    {mode==='account'&&result?.available?<div className="forecast-callout"><TrendingUp size={18}/><div><b>Estimated monthly net cash flow: {money(result.baseline_monthly_net??0)}</b><span>Approximate historical range: {money(result.monthly_range?.[0]??0)} to {money(result.monthly_range?.[1]??0)}. {result.limitation}</span></div></div>:null}
    {mode==='demo'?<div className="forecast-callout"><TrendingUp size={18}/><div><b>Illustrative three-month net cash flow: {money(average*3)}</b><span>Calculated from a synthetic six-month sample. This is not an account forecast or a guaranteed outcome. Approximate monthly variation: {money(spread)}.</span></div></div>:null}
    {chartData.length>0?<div className="chart cash-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:8,left:-20,bottom:0}}><CartesianGrid stroke="#202a3b" vertical={false}/><XAxis dataKey="month" tick={{fill:'#778399',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#778399',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(value)=>`â‚¹${Number(value).toFixed(1)}k`} contentStyle={{background:'#121b2a',border:'1px solid #2b374b',borderRadius:10}}/><Bar dataKey="income" name="Income" fill="#7892ff" radius={[4,4,0,0]}/><Bar dataKey="spend" name="Spending" fill="#56cdb5" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:null}
    {mode==='account'&&result?.available&&result.method?<p className="muted-text">Method: {result.method}. Range is an approximate historical variability estimate, not a confidence guarantee.</p>:null}
    {mode==='account'&&!loading&&!error&&(!result||!result.history.length)?<div className="empty-state">No transactions have been recorded for the forecast window.</div>:null}
  </section>;
}
