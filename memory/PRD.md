# Naman Traders Billing System — PRD

## Original Problem Statement
User wants a billing system for Naman Traders (website + app) with:
1. Bill form with auto-calculation (rate × qty per row, subtotal, total)
2. Print bill / PDF / share via WhatsApp to customer phone
3. Storage of all bills with customer name and date; ability to search/fetch bills with filters
4. Analytics dashboard for business growth, sales, products, profit/selling
5. Stock/inventory management: products with stock count, auto-decrement on bill creation, manual restock

## User Choices
- GST: No GST by default, optional custom GST % per bill
- Auth: Simple password protected (single owner, password=naman123)
- WhatsApp: wa.me link (manual PDF attach by user)
- Analytics: Just sales/growth/valuation (no profit/cost tracking)

## Architecture
- **Backend**: FastAPI + MongoDB (motor async), JWT bearer auth, single owner password in `.env`
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui, axios with token interceptor
- **PDF**: Client-side via `window.print()` with print-only CSS targeting `.print-area`
- **Charts**: Recharts (AreaChart, BarChart, LineChart)

## Implemented (2026-02-13)
- [x] Owner password login (JWT, 7-day token in localStorage)
- [x] Sidebar layout with Dashboard / New Bill / All Bills / Products / Analytics / Logout
- [x] Dashboard: 4 metric cards (Today/Week/Month/All time), 14-day area chart, recent bills, top customers
- [x] Create Bill: customer details, dynamic line items, per-row auto amount, subtotal+GST+total auto-calc, sticky summary sidebar
- [x] Bill detail / preview: Naman Traders branded blue invoice template, Print, WhatsApp share (wa.me with formatted text), Delete
- [x] Bills list with search (customer/phone/invoice#) and date range filter
- [x] Analytics: period switcher (day/week/month/year), revenue bar chart, bill count line chart, overall snapshot
- [x] Products & Stock page: add/edit/delete, restock dialog with note, stock history (sale/restock/initial/reverse audit)
- [x] Auto stock decrement when bill saved (only for items linked to a product)
- [x] Stock restored when a bill is deleted (full audit trail)
- [x] Low stock badge and "Low stock only" filter
- [x] Product picker (Command/Popover) inside Create Bill — fills description+rate from selected product

## API Endpoints
- `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/business`
- `GET/POST /api/bills`, `GET/DELETE /api/bills/{id}`, `GET /api/bills/next-number`
- `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/{id}`
- `POST /api/products/{id}/restock`, `GET /api/products/{id}/movements`
- `GET /api/analytics/summary`, `GET /api/analytics/timeseries?period=`

## Backlog / Next Phase
- P1: Per-product sales analytics (best sellers, slow movers)
- P1: Customer mini-CRM (customer page with their bill history)
- P1: Edit existing bill (currently only delete & re-create)
- P2: Multi-currency / multiple business profiles
- P2: Twilio WhatsApp API for direct PDF delivery
- P2: Export bills CSV/Excel for accountant
- P2: Bulk product import (CSV)

## Test Credentials
See `/app/memory/test_credentials.md`
