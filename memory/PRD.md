# NAMAN TRADERS Billing System — PRD

## Original Problem
Build website + app for Naman Traders billing: auto-calculated bill form, PDF/print/WhatsApp share, MongoDB bill history with filter/search, analytics dashboard (sales/growth per day/week/month/year).

## Architecture
- Backend: FastAPI + MongoDB (Motor)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts
- Auth: Single owner password (JWT, stored localStorage)

## Implemented (Feb 2026)
- [x] Owner password login (`OWNER_PASSWORD` in .env)
- [x] Bill form: auto-row amount, auto-subtotal, optional GST %, grand total
- [x] Bill items now include optional **weight + unit** (kg/g/ton/lbs/ltr/ml)
- [x] Invoice preview (blue NAMAN TRADERS template) with Print and WhatsApp share (wa.me)
- [x] Bills list with search (name/phone/invoice#) + date range
- [x] Analytics dashboard (day/week/month/year revenue + bill count + top customers)
- [x] **Products / Inventory** management with stock + low-stock alert
- [x] **Restock** flow with optional **Supplier** linking
- [x] Stock auto-decrements on bill creation, auto-restores on bill deletion
- [x] **Customers** page: auto-tracks all billed customers with spend
- [x] **Suppliers** page: vendors you buy stock from

## P1 (next)
- Bill edit (currently only create + delete)
- Bulk import products via CSV
- Export bills as Excel
- Multi-user with role-based access
- Backup/restore DB

## Credentials
See /app/memory/test_credentials.md

## Update (Feb 2026 — Quintal/Unit Conversion)
- Products now have a unit dropdown: quintal, kg, g, ton, lbs, bag, pcs, box, ltr, ml
- Bill items now have a Unit dropdown alongside Qty (default = product unit)
- Server-side conversion (UNIT_TO_GRAMS) ensures stock decrement is accurate even when sold unit ≠ stocked unit (e.g., stock in quintal, billed in kg)
- Inline hint shows the converted stock impact (e.g., "= 0.50 quintal stock") while billing
- Verified: 10 quintal stock → sold 2 quintal (8) → 50 kg (7.5) → 500 g (7.495) ✓
