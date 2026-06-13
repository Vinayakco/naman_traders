"""Backend tests for NAMAN TRADERS billing API"""
import os
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://billing-tracker-pro-2.preview.emergentagent.com').rstrip('/')
PASSWORD = "naman123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0
    assert data["business"]["name"] == "NAMAN TRADERS"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# Auth tests
def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "wrong"}, timeout=20)
    assert r.status_code == 401


def test_me_requires_auth():
    r = requests.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert r.status_code == 401


def test_me_ok(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert r.json()["authenticated"] is True


# Bills CRUD
def test_next_number(auth_headers):
    r = requests.get(f"{BASE_URL}/api/bills/next-number", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert r.json()["invoice_number"].startswith("INV-")


@pytest.fixture(scope="module")
def created_bill(auth_headers):
    payload = {
        "customer_name": "TEST_Customer A",
        "customer_phone": "9999999999",
        "customer_address": "Test Address",
        "invoice_date": date.today().isoformat(),
        "items": [
            {"description": "Item 1", "quantity": 2, "rate": 100, "amount": 200},
            {"description": "Item 2", "quantity": 3, "rate": 50, "amount": 150},
        ],
        "gst_percent": 18.0,
        "notes": "test"
    }
    r = requests.post(f"{BASE_URL}/api/bills", json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    bill = r.json()
    assert bill["subtotal"] == 350.0
    assert bill["gst_amount"] == 63.0
    assert bill["total"] == 413.0
    assert bill["invoice_number"].startswith("INV-")
    assert "_id" not in bill
    return bill


def test_get_bill(auth_headers, created_bill):
    r = requests.get(f"{BASE_URL}/api/bills/{created_bill['id']}", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert r.json()["customer_name"] == "TEST_Customer A"


def test_list_bills_search(auth_headers, created_bill):
    r = requests.get(f"{BASE_URL}/api/bills?q=TEST_Customer", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    arr = r.json()
    assert any(b["id"] == created_bill["id"] for b in arr)


def test_list_bills_date_filter(auth_headers, created_bill):
    today = date.today().isoformat()
    r = requests.get(f"{BASE_URL}/api/bills?start_date={today}&end_date={today}", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_analytics_summary(auth_headers, created_bill):
    r = requests.get(f"{BASE_URL}/api/analytics/summary", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    for k in ["today", "week", "month", "year", "all_time", "top_customers"]:
        assert k in data
    assert data["all_time"]["count"] >= 1


@pytest.mark.parametrize("period", ["day", "week", "month", "year"])
def test_analytics_timeseries(auth_headers, period):
    r = requests.get(f"{BASE_URL}/api/analytics/timeseries?period={period}", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["period"] == period
    assert isinstance(data["series"], list) and len(data["series"]) > 0


def test_delete_bill(auth_headers, created_bill):
    r = requests.delete(f"{BASE_URL}/api/bills/{created_bill['id']}", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    # Verify deleted
    r2 = requests.get(f"{BASE_URL}/api/bills/{created_bill['id']}", headers=auth_headers, timeout=20)
    assert r2.status_code == 404
