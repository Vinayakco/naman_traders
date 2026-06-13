import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatINR, formatDate } from "../lib/api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Search, Plus, FileText } from "lucide-react";

export default function BillsList() {
  const [bills, setBills] = useState([]);
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchBills = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await api.get("/bills", { params });
    setBills(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setQ("");
    setStartDate("");
    setEndDate("");
    setTimeout(fetchBills, 0);
  };

  const totalShown = bills.reduce((s, b) => s + (b.total || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Bills</div>
          <h1 className="font-display text-4xl mt-1">All invoices</h1>
          <p className="text-zinc-500 mt-2">Search and filter your billing history.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to="/bills/new" data-testid="bills-new-bill-btn"><Plus className="h-4 w-4 mr-2" />New Bill</Link>
        </Button>
      </div>

      <Card className="p-5 border border-zinc-200 bg-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input data-testid="bills-search-input" placeholder="Customer, phone, invoice #" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchBills()} />
            </div>
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">From</Label>
            <Input data-testid="bills-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">To</Label>
            <Input data-testid="bills-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="md:col-span-1 flex gap-2">
            <Button onClick={fetchBills} className="bg-blue-600 hover:bg-blue-700 w-full" data-testid="bills-apply-filter">Apply</Button>
          </div>
        </div>
        {(q || startDate || endDate) && (
          <button onClick={clearFilters} className="mt-3 text-xs text-blue-600 hover:underline" data-testid="bills-clear-filters">Clear filters</button>
        )}
      </Card>

      <Card className="border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="text-sm text-zinc-600">
            {loading ? "Loading..." : `${bills.length} bills`}
          </div>
          <div className="text-sm">
            <span className="text-zinc-500">Total shown:</span> <span className="font-mono font-semibold ml-2">{formatINR(totalShown)}</span>
          </div>
        </div>
        {bills.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p>No bills found.</p>
            <Button asChild variant="link" className="text-blue-600 mt-2"><Link to="/bills/new">Create your first bill</Link></Button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            <div className="hidden md:grid grid-cols-12 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-500 bg-white">
              <div className="col-span-2">Invoice #</div>
              <div className="col-span-4">Customer</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Items</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {bills.map((b) => (
              <Link key={b.id} to={`/bills/${b.id}`} className="grid grid-cols-12 px-5 py-4 hover:bg-blue-50/50 transition-colors items-center" data-testid={`bill-row-${b.invoice_number}`}>
                <div className="col-span-12 md:col-span-2 font-mono font-semibold text-blue-600">{b.invoice_number}</div>
                <div className="col-span-12 md:col-span-4">
                  <div className="font-medium">{b.customer_name}</div>
                  {b.customer_phone && <div className="text-xs text-zinc-500">{b.customer_phone}</div>}
                </div>
                <div className="col-span-6 md:col-span-2 text-sm text-zinc-600">{formatDate(b.invoice_date)}</div>
                <div className="col-span-3 md:col-span-2 text-right text-sm">{b.items.length}</div>
                <div className="col-span-3 md:col-span-2 text-right font-mono font-semibold">{formatINR(b.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
