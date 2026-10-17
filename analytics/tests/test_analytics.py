from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_forecast_baseline_and_insufficient_data():
    r=client.post('/forecast',json={'monthly_income':[1000,1000],'monthly_spending':[600,800],'months':2})
    assert r.status_code==200
    assert r.json()['baseline_monthly_net']==300
    assert r.json()['confidence']=='low'
    assert 'Fewer than three' in r.json()['limitation']

def test_summary_savings_rate():
    rows=[{'amount':1000,'type':'income','category':'Salary','description':'Pay','date':'2026-10-01'}, {'amount':400,'type':'expense','category':'Food','description':'Cafe','date':'2026-10-02'}]
    r=client.post('/summaries',json={'transactions':rows})
    assert r.status_code==200 and r.json()['savings_rate']==60

def test_what_if_explains_assumptions():
    r=client.post('/what-if',json={'monthly_income':100000,'monthly_spending':60000,'new_monthly_payment':10000,'months':12})
    assert r.json()['monthly_savings_after_payment']==30000
    assert 'Static scenario' in r.json()['limitation']

def test_category_rules_are_transparent():
    row={'amount':300,'type':'expense','category':'Other','description':'Swiggy dinner','date':'2026-10-01'}
    result=client.post('/categorize',json={'transactions':[row]}).json()
    assert result['results'][0]['category']=='food & dining'
    assert result['results'][0]['method']=='transparent-keyword-rule'

def test_invalid_amount_and_malformed_date_are_handled_explicitly():
    row={'amount':-1,'type':'expense','category':'Food','description':'Cafe','date':'not-a-date'}
    assert client.post('/summaries',json={'transactions':[row]}).status_code==422
    valid={'amount':10,'type':'expense','category':'Food','description':'Cafe','date':'not-a-date'}
    result=client.post('/summaries',json={'transactions':[valid]})
    assert result.status_code==200
    assert result.json()['monthly']==[]
    assert 'could not be parsed' in result.json()['limitation']

def test_recurring_detection_requires_repeated_monthly_records():
    rows=[{'amount':1200,'type':'expense','category':'Housing','description':'Rent','date':f'2026-0{month}-01'} for month in (1,2,3)]
    result=client.post('/recurring',json={'transactions':rows})
    assert result.status_code==200
    assert result.json()['payments'][0]['cadence']=='monthly'
    assert result.json()['payments'][0]['occurrences']==3

def test_analytics_key_is_enforced_when_configured(monkeypatch):
    monkeypatch.setenv('ANALYTICS_API_KEY','test-only-key')
    assert client.post('/forecast',headers={'x-api-key':'wrong'},json={'monthly_income':[1000],'monthly_spending':[500]}).status_code==401
    assert client.post('/forecast',headers={'x-api-key':'test-only-key'},json={'monthly_income':[1000],'monthly_spending':[500]}).status_code==200
