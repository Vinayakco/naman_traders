from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict


# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://vinayakoffical18_db_user:naman123@cluster0.nw2bn9y.mongodb.net/naman_traders')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'naman_traders')]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'namantraders_secret_key_2024')
OWNER_PASSWORD = os.environ.get('OWNER_PASSWORD', 'naman123')

OWNER_PASSWORD = os.environ.get('OWNER_PASSWORD', 'naman123')

BUSINESS = {
    "name": os.environ.get('BUSINESS_NAME', 'NAMAN TRADERS'),
    "gstin": os.environ.get('BUSINESS_GSTIN', ''),
    "address": os.environ.get('BUSINESS_ADDRESS', ''),
    "phone": os.environ.get('BUSINESS_PHONE', ''),
    "email": os.environ.get('BUSINESS_EMAIL', ''),
    "owner": os.environ.get('BUSINESS_OWNER', ''),
}

app = FastAPI(title="Naman Traders Billing API")
api_router = APIRouter(prefix="/api")


# ============== Models ==============
class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    token: str
    business: dict


class BillItem(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float
    product_id: Optional[str] = None
    unit: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None


# ---- Product / Stock models ----
class ProductCreate(BaseModel):
    name: str
    unit: str = "pcs"
    rate: float = 0.0
    stock: float = 0.0
    low_stock_threshold: float = 5.0
    notes: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    rate: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    notes: Optional[str] = None


class RestockRequest(BaseModel):
    quantity: float
    note: str = ""
    supplier_id: Optional[str] = None


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    unit: str = "pcs"
    rate: float = 0.0
    stock: float = 0.0
    low_stock_threshold: float = 5.0
    notes: str = ""
    created_at: str
    updated_at: str


# ---- Customer / Supplier models ----
class ContactCreate(BaseModel):
    name: str
    phone: str = ""
    address: str = ""
    notes: str = ""


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str = ""
    address: str = ""
    notes: str = ""
    total_amount: float = 0.0
    total_count: int = 0
    created_at: str
    updated_at: str


class BillCreate(BaseModel):
    customer_name: str
    customer_phone: str = ""
    customer_address: str = ""
    invoice_date: str  # ISO date string YYYY-MM-DD
    items: List[BillItem]
    gst_percent: float = 0.0
    notes: str = ""


class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    invoice_number: str
    customer_name: str
    customer_phone: str = ""
    customer_address: str = ""
    invoice_date: str
    items: List[BillItem]
    subtotal: float
    gst_percent: float
    gst_amount: float
    total: float
    notes: str = ""
    created_at: str


# ============== Auth ==============
def create_token() -> str:
    payload = {
        "sub": "owner",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_auth(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if req.password != OWNER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    return TokenResponse(token=create_token(), business=BUSINESS)


@api_router.get("/auth/me")
async def me(user=Depends(require_auth)):
    return {"authenticated": True, "business": BUSINESS}


@api_router.get("/business")
async def get_business():
    return BUSINESS


# ============== Bills ==============
def calc_totals(items: List[BillItem], gst_percent: float):
    subtotal = sum(round(i.quantity * i.rate, 2) for i in items)
    gst_amount = round(subtotal * (gst_percent / 100.0), 2)
    total = round(subtotal + gst_amount, 2)
    return round(subtotal, 2), gst_amount, total


# Conversion factors to grams (base unit for weight conversions)
UNIT_TO_GRAMS = {
    "quintal": 100000.0,
    "ton": 1000000.0,
    "kg": 1000.0,
    "g": 1.0,
    "gram": 1.0,
    "lbs": 453.592,
}


def convert_qty(qty: float, from_unit: Optional[str], to_unit: Optional[str]) -> float:
    """Convert qty from one unit to another. If units are not weight-compatible, returns qty unchanged."""
    if not from_unit or not to_unit or from_unit == to_unit:
        return qty
    f = UNIT_TO_GRAMS.get(from_unit.lower())
    t = UNIT_TO_GRAMS.get(to_unit.lower())
    if f is None or t is None:
        return qty
    return round(qty * f / t, 6)


async def next_invoice_number() -> str:
    # Find current max invoice number
    counter = await db.counters.find_one_and_update(
        {"_id": "invoice"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1) if counter else 1
    return f"INV-{seq:04d}"


@api_router.get("/bills/next-number")
async def get_next_number(user=Depends(require_auth)):
    # Peek without incrementing
    counter = await db.counters.find_one({"_id": "invoice"})
    seq = (counter.get("seq", 0) if counter else 0) + 1
    return {"invoice_number": f"INV-{seq:04d}"}


@api_router.post("/bills", response_model=Bill)
async def create_bill(payload: BillCreate, user=Depends(require_auth)):
    # Recalculate amounts server-side
    normalized_items = []
    for it in payload.items:
        amt = round(it.quantity * it.rate, 2)
        normalized_items.append(BillItem(
            description=it.description,
            quantity=it.quantity,
            rate=it.rate,
            amount=amt,
            unit=it.unit,
            product_id=it.product_id,
            weight=it.weight,
            weight_unit=it.weight_unit,
        ))
    subtotal, gst_amount, total = calc_totals(normalized_items, payload.gst_percent)

    invoice_number = await next_invoice_number()
    bill = Bill(
        id=str(uuid.uuid4()),
        invoice_number=invoice_number,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_address=payload.customer_address,
        invoice_date=payload.invoice_date,
        items=normalized_items,
        subtotal=subtotal,
        gst_percent=payload.gst_percent,
        gst_amount=gst_amount,
        total=total,
        notes=payload.notes,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    doc = bill.model_dump()
    await db.bills.insert_one(doc)

    # Decrement stock for items linked to products (with unit conversion)
    now_iso = datetime.now(timezone.utc).isoformat()
    for it in normalized_items:
        if it.product_id:
            product = await db.products.find_one({"id": it.product_id}, {"_id": 0})
            if product:
                product_unit = product.get("unit") or "pcs"
                sold_unit = it.unit or product_unit
                decrement = convert_qty(it.quantity, sold_unit, product_unit)
                await db.products.update_one(
                    {"id": it.product_id},
                    {"$inc": {"stock": -decrement}, "$set": {"updated_at": now_iso}},
                )
                await db.stock_movements.insert_one({
                    "id": str(uuid.uuid4()),
                    "product_id": it.product_id,
                    "type": "sale",
                    "quantity": -decrement,
                    "note": f"Sold via {invoice_number} ({it.quantity} {sold_unit})",
                    "bill_id": bill.id,
                    "created_at": now_iso,
                })

    # Upsert customer record (auto-track all customers we've billed)
    if payload.customer_name.strip():
        await db.customers.update_one(
            {"name": payload.customer_name.strip()},
            {
                "$set": {
                    "name": payload.customer_name.strip(),
                    "phone": payload.customer_phone,
                    "address": payload.customer_address,
                    "updated_at": now_iso,
                },
                "$inc": {"total_amount": total, "total_count": 1},
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "notes": "",
                    "created_at": now_iso,
                },
            },
            upsert=True,
        )
    return bill


@api_router.get("/bills", response_model=List[Bill])
async def list_bills(
    user=Depends(require_auth),
    q: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
):
    query = {}
    if q:
        query["$or"] = [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_phone": {"$regex": q, "$options": "i"}},
            {"invoice_number": {"$regex": q, "$options": "i"}},
        ]
    if start_date or end_date:
        date_q = {}
        if start_date:
            date_q["$gte"] = start_date
        if end_date:
            date_q["$lte"] = end_date
        query["invoice_date"] = date_q

    cursor = db.bills.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    bills = await cursor.to_list(limit)
    return bills


@api_router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(bill_id: str, user=Depends(require_auth)):
    doc = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Bill not found")
    return doc


@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, user=Depends(require_auth)):
    doc = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Bill not found")
    now_iso = datetime.now(timezone.utc).isoformat()
    for it in doc.get("items", []):
        pid = it.get("product_id")
        if pid:
            product = await db.products.find_one({"id": pid}, {"_id": 0})
            if product:
                product_unit = product.get("unit") or "pcs"
                sold_unit = it.get("unit") or product_unit
                restore = convert_qty(it.get("quantity", 0), sold_unit, product_unit)
                await db.products.update_one(
                    {"id": pid},
                    {"$inc": {"stock": restore}, "$set": {"updated_at": now_iso}},
                )
                await db.stock_movements.insert_one({
                    "id": str(uuid.uuid4()),
                    "product_id": pid,
                    "type": "reverse",
                    "quantity": restore,
                    "note": f"Reversed from deleted bill {doc.get('invoice_number')}",
                    "bill_id": bill_id,
                    "created_at": now_iso,
                })
    await db.bills.delete_one({"id": bill_id})
    return {"deleted": True}


# ============== Products / Stock ==============
@api_router.get("/products", response_model=List[Product])
async def list_products(user=Depends(require_auth), q: Optional[str] = None, low_only: bool = False):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    cursor = db.products.find(query, {"_id": 0}).sort("name", 1)
    products = await cursor.to_list(500)
    if low_only:
        products = [p for p in products if p.get("stock", 0) <= p.get("low_stock_threshold", 0)]
    return products


@api_router.post("/products", response_model=Product)
async def create_product(payload: ProductCreate, user=Depends(require_auth)):
    now_iso = datetime.now(timezone.utc).isoformat()
    product = Product(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        unit=payload.unit,
        rate=payload.rate,
        stock=payload.stock,
        low_stock_threshold=payload.low_stock_threshold,
        notes=payload.notes,
        created_at=now_iso,
        updated_at=now_iso,
    )
    await db.products.insert_one(product.model_dump())
    if payload.stock > 0:
        await db.stock_movements.insert_one({
            "id": str(uuid.uuid4()),
            "product_id": product.id,
            "type": "initial",
            "quantity": payload.stock,
            "note": "Initial stock on product creation",
            "bill_id": None,
            "created_at": now_iso,
        })
    return product


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user=Depends(require_auth)):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


@api_router.patch("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductUpdate, user=Depends(require_auth)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        doc = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Product not found")
        return doc
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.products.update_one({"id": product_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(require_auth)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


@api_router.post("/products/{product_id}/restock", response_model=Product)
async def restock_product(product_id: str, payload: RestockRequest, user=Depends(require_auth)):
    if payload.quantity == 0:
        raise HTTPException(status_code=400, detail="Quantity must be non-zero")
    now_iso = datetime.now(timezone.utc).isoformat()
    res = await db.products.find_one_and_update(
        {"id": product_id},
        {"$inc": {"stock": payload.quantity}, "$set": {"updated_at": now_iso}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.stock_movements.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "type": "restock" if payload.quantity > 0 else "adjust",
        "quantity": payload.quantity,
        "note": payload.note or ("Restock" if payload.quantity > 0 else "Adjustment"),
        "bill_id": None,
        "supplier_id": payload.supplier_id,
        "created_at": now_iso,
    })
    # Update supplier aggregate
    if payload.supplier_id and payload.quantity > 0:
        await db.suppliers.update_one(
            {"id": payload.supplier_id},
            {"$inc": {"total_count": 1}, "$set": {"updated_at": now_iso}},
        )
    res.pop("_id", None)
    return res


@api_router.get("/products/{product_id}/movements")
async def product_movements(product_id: str, user=Depends(require_auth), limit: int = 50):
    cursor = db.stock_movements.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


# ============== Customers ==============
@api_router.get("/customers", response_model=List[Contact])
async def list_customers(user=Depends(require_auth), q: Optional[str] = None):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.customers.find(query, {"_id": 0}).sort("total_amount", -1)
    return await cursor.to_list(500)


@api_router.post("/customers", response_model=Contact)
async def create_customer(payload: ContactCreate, user=Depends(require_auth)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    existing = await db.customers.find_one({"name": name}, {"_id": 0})
    if existing:
        return existing
    now_iso = datetime.now(timezone.utc).isoformat()
    contact = Contact(
        id=str(uuid.uuid4()),
        name=name,
        phone=payload.phone,
        address=payload.address,
        notes=payload.notes,
        total_amount=0,
        total_count=0,
        created_at=now_iso,
        updated_at=now_iso,
    )
    await db.customers.insert_one(contact.model_dump())
    return contact


@api_router.patch("/customers/{customer_id}", response_model=Contact)
async def update_customer(customer_id: str, payload: ContactUpdate, user=Depends(require_auth)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        doc = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Customer not found")
        return doc
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.customers.update_one({"id": customer_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    doc = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return doc


@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user=Depends(require_auth)):
    res = await db.customers.delete_one({"id": customer_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"deleted": True}


# ============== Suppliers ==============
@api_router.get("/suppliers", response_model=List[Contact])
async def list_suppliers(user=Depends(require_auth), q: Optional[str] = None):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.suppliers.find(query, {"_id": 0}).sort("name", 1)
    return await cursor.to_list(500)


@api_router.post("/suppliers", response_model=Contact)
async def create_supplier(payload: ContactCreate, user=Depends(require_auth)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    existing = await db.suppliers.find_one({"name": name}, {"_id": 0})
    if existing:
        return existing
    now_iso = datetime.now(timezone.utc).isoformat()
    contact = Contact(
        id=str(uuid.uuid4()),
        name=name,
        phone=payload.phone,
        address=payload.address,
        notes=payload.notes,
        total_amount=0,
        total_count=0,
        created_at=now_iso,
        updated_at=now_iso,
    )
    await db.suppliers.insert_one(contact.model_dump())
    return contact


@api_router.patch("/suppliers/{supplier_id}", response_model=Contact)
async def update_supplier(supplier_id: str, payload: ContactUpdate, user=Depends(require_auth)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        doc = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Supplier not found")
        return doc
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.suppliers.update_one({"id": supplier_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    doc = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    return doc


@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, user=Depends(require_auth)):
    res = await db.suppliers.delete_one({"id": supplier_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"deleted": True}


# ============== Analytics ==============
@api_router.get("/analytics/summary")
async def analytics_summary(user=Depends(require_auth)):
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    week_ago = (today - timedelta(days=6)).isoformat()
    month_start = today.replace(day=1).isoformat()
    year_start = today.replace(month=1, day=1).isoformat()

    async def sum_period(start: str):
        pipeline = [
            {"$match": {"invoice_date": {"$gte": start}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        ]
        res = await db.bills.aggregate(pipeline).to_list(1)
        if res:
            return {"total": round(res[0]["total"], 2), "count": res[0]["count"]}
        return {"total": 0, "count": 0}

    today_data = await sum_period(today_str)
    week_data = await sum_period(week_ago)
    month_data = await sum_period(month_start)
    year_data = await sum_period(year_start)
    all_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}]
    all_res = await db.bills.aggregate(all_pipeline).to_list(1)
    all_time = {"total": round(all_res[0]["total"], 2), "count": all_res[0]["count"]} if all_res else {"total": 0, "count": 0}

    # Top customers (all time)
    top_pipeline = [
        {"$group": {"_id": "$customer_name", "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": 5},
    ]
    top_customers_raw = await db.bills.aggregate(top_pipeline).to_list(5)
    top_customers = [{"name": x["_id"], "total": round(x["total"], 2), "count": x["count"]} for x in top_customers_raw]

    return {
        "today": today_data,
        "week": week_data,
        "month": month_data,
        "year": year_data,
        "all_time": all_time,
        "top_customers": top_customers,
    }


@api_router.get("/analytics/timeseries")
async def analytics_timeseries(
    user=Depends(require_auth),
    period: str = Query("day", regex="^(day|week|month|year)$"),
):
    today = datetime.now(timezone.utc).date()

    if period == "day":
        # last 14 days, group by day
        start = (today - timedelta(days=13)).isoformat()
        group_format = "%Y-%m-%d"
        buckets = [(today - timedelta(days=i)).isoformat() for i in range(13, -1, -1)]
    elif period == "week":
        # last 8 weeks
        start = (today - timedelta(weeks=7)).isoformat()
        group_format = "%Y-%U"  # week number
        buckets = []
        for i in range(7, -1, -1):
            d = today - timedelta(weeks=i)
            buckets.append(d.strftime("%Y-%U"))
    elif period == "month":
        # last 12 months
        start_d = today.replace(day=1)
        for _ in range(11):
            y, m = start_d.year, start_d.month - 1
            if m == 0:
                y, m = y - 1, 12
            start_d = start_d.replace(year=y, month=m)
        start = start_d.isoformat()
        group_format = "%Y-%m"
        # build 12 month buckets
        buckets = []
        cur = start_d
        for _ in range(12):
            buckets.append(cur.strftime("%Y-%m"))
            y, m = cur.year, cur.month + 1
            if m == 13:
                y, m = y + 1, 1
            cur = cur.replace(year=y, month=m)
    else:  # year
        start = today.replace(year=today.year - 4, month=1, day=1).isoformat()
        group_format = "%Y"
        buckets = [str(today.year - i) for i in range(4, -1, -1)]

    pipeline = [
        {"$match": {"invoice_date": {"$gte": start}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": group_format, "date": {"$dateFromString": {"dateString": "$invoice_date"}}}},
                "total": {"$sum": "$total"},
                "count": {"$sum": 1},
            }
        },
    ]
    rows = await db.bills.aggregate(pipeline).to_list(1000)
    by_key = {r["_id"]: r for r in rows}
    series = []
    for b in buckets:
        r = by_key.get(b)
        series.append({"label": b, "total": round(r["total"], 2) if r else 0, "count": r["count"] if r else 0})
    return {"period": period, "series": series}


# ============== Root ==============
@api_router.get("/")
async def root():
    return {"message": "Naman Traders Billing API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.bills.create_index("invoice_date")
    await db.bills.create_index("customer_name")
    await db.bills.create_index("created_at")
    await db.products.create_index("name")
    await db.stock_movements.create_index("product_id")
    await db.customers.create_index("name", unique=True)
    await db.suppliers.create_index("name", unique=True)
    logger.info("Naman Traders billing API started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
