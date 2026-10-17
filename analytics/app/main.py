import os
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="FinPilot Analytics", version="1.0.0", description="Transparent financial calculations; estimates are not guarantees.")

class Transaction(BaseModel):
    amount: float = Field(gt=0, le=1_000_000_000)
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=160)
    date: str

class ForecastRequest(BaseModel):
    monthly_income: list[float] = Field(min_length=1, max_length=60)
    monthly_spending: list[float] = Field(min_length=1, max_length=60)
    months: int = Field(default=3, ge=1, le=12)

class AnalysisRequest(BaseModel):
    transactions: list[Transaction] = Field(max_length=10000)

class WhatIfRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_spending: float = Field(ge=0)
    new_monthly_payment: float = Field(ge=0)
    months: int = Field(default=12, ge=1, le=600)

def protect(x_api_key: str | None):
    expected = os.getenv("ANALYTICS_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid analytics service key")

@app.get("/health")
def health():
    return {"status": "ok", "model": "transparent-baseline", "trained_model_loaded": False}

@app.post("/summaries")
def summaries(body: AnalysisRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    rows = [t.model_dump() for t in body.transactions]
    if not rows:
        return {"monthly": [], "savings_rate": None, "limitation": "No transactions supplied."}
    df = pd.DataFrame(rows)
    df["month"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m")
    df = df.dropna(subset=["month"])
    if df.empty:
        return {"monthly": [], "savings_rate": None, "limitation": "Transaction dates could not be parsed."}
    df["income"] = np.where(df.type == "income", df.amount, 0)
    df["spending"] = np.where(df.type == "expense", df.amount, 0)
    monthly = df.groupby("month", as_index=False)[["income", "spending"]].sum().sort_values("month").to_dict("records")
    inc, spent = float(df.income.sum()), float(df.spending.sum())
    return {"monthly": monthly, "income_total": inc, "spending_total": spent, "savings_rate": round((inc-spent)/inc*100, 1) if inc else None, "limitation": None}

@app.post("/forecast")
def forecast(body: ForecastRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    n = min(len(body.monthly_income), len(body.monthly_spending))
    income = np.array(body.monthly_income[-n:], dtype=float)
    spending = np.array(body.monthly_spending[-n:], dtype=float)
    if not np.isfinite(income).all() or not np.isfinite(spending).all() or (income < 0).any() or (spending < 0).any():
        raise HTTPException(status_code=422, detail="Monthly values must be finite and non-negative")
    net = income - spending
    mean = float(net.mean())
    # Use observed sample variability for a transparent approximate interval.
    spread = float(net.std(ddof=1)) if len(net) > 1 else abs(mean) * 0.2
    enough = len(net) >= 3
    return {"baseline_monthly_net": round(mean, 2), "monthly_range": [round(mean-1.96*spread, 2), round(mean+1.96*spread, 2)], "months": body.months, "projected_net_total": round(mean*body.months, 2), "confidence": "low" if not enough else "moderate", "method": "historical mean with sample standard deviation; no trained model", "limitation": "Fewer than three months supplied; range is especially uncertain." if not enough else "Assumes recent monthly patterns continue; unexpected bills and income changes are not modeled."}

@app.post("/categorize")
def categorize(body: AnalysisRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    rules = {"housing": ["rent", "mortgage", "home loan"], "emi": ["emi", "loan installment"], "groceries": ["grocery", "zepto", "blinkit", "bigbasket"], "food & dining": ["swiggy", "zomato", "restaurant", "cafe"], "transport": ["uber", "ola", "metro", "fuel"], "utilities": ["electricity", "bescom", "water", "internet"]}
    result=[]
    for t in body.transactions:
        text=f"{t.description} {t.category}".lower()
        label=next((name for name,terms in rules.items() if any(term in text for term in terms)), t.category)
        result.append({"description":t.description,"category":label,"method":"transparent-keyword-rule"})
    return {"results":result,"trained_model_loaded":False}

@app.post("/recurring")
def recurring(body: AnalysisRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    rows=[t.model_dump() for t in body.transactions if t.type=="expense"]
    if not rows:return {"payments":[],"limitation":"No expense transactions supplied."}
    df=pd.DataFrame(rows);df["date"]=pd.to_datetime(df.date,errors="coerce"); findings=[]
    for desc,g in df.dropna(subset=["date"]).groupby(df.description.str.lower()):
        dates=sorted(g.date.tolist()); amounts=g.amount.tolist()
        if len(dates)>=2:
            gaps=np.diff([d.timestamp() for d in dates])/86400
            if np.mean(gaps)>=25 and np.mean(gaps)<=35 and np.std(gaps)<8:
                findings.append({"description":desc,"average_amount":round(float(np.mean(amounts)),2),"occurrences":len(dates),"cadence":"monthly","confidence":"moderate" if len(dates)>=3 else "low"})
    return {"payments":findings,"limitation":"Recurring patterns require repeated, consistently described transactions."}

@app.post("/what-if")
def what_if(body: WhatIfRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    baseline=body.monthly_income-body.monthly_spending
    after=baseline-body.new_monthly_payment
    return {"baseline_monthly_savings":round(baseline,2),"monthly_savings_after_payment":round(after,2),"annual_cash_impact":round(body.new_monthly_payment*12,2),"remaining_monthly_margin":round(after,2),"months":body.months,"limitation":"Static scenario assumes income and current spending remain unchanged; excludes interest, fees, and emergencies."}

@app.post("/emergency-fund")
def emergency(body: WhatIfRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    expenses=body.monthly_spending
    target=expenses*6
    contribution=max(0,body.monthly_income-expenses)
    return {"target_six_months":round(target,2),"monthly_contribution_capacity":round(contribution,2),"months_to_target":int(np.ceil(target/contribution)) if contribution else None,"limitation":"Uses the submitted spending as monthly essential expenses and assumes the full surplus can be saved. Adjust for essentials and existing savings."}

@app.post("/unusual-spending")
def unusual(body: AnalysisRequest, x_api_key: str | None = Header(default=None)):
    protect(x_api_key)
    expenses=[t.model_dump() for t in body.transactions if t.type=="expense"]
    if len(expenses)<5:return {"items":[],"limitation":"At least five expense records are needed for a useful relative-spend screen."}
    df=pd.DataFrame(expenses); groups=[]
    for category,g in df.groupby("category"):
        vals=g.amount.to_numpy(dtype=float)
        if len(vals)>=4:
            med=float(np.median(vals)); mad=float(np.median(np.abs(vals-med)))
            for row in g.to_dict("records"):
                score=(row["amount"]-med)/(1.4826*mad) if mad else 0
                if score>3: groups.append({"description":row["description"],"amount":row["amount"],"category":category,"screen":"robust median deviation","score":round(float(score),2)})
    return {"items":groups,"limitation":"Flags are statistical prompts for review, not evidence of fraud or error."}
