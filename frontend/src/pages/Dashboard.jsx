import { useEffect, useState } from "react";
import api, { formatINR, formatDate } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { ArrowUpRight, Receipt, Wallet, Users, TrendingUp, Plus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get("/analytics/summary").then((r) => setSummary(r.data));
    api.get("/analytics/timeseries?period=day").then((r) => setSeries(r.data.series));
    api.get("/bills?limit=5").then((r) => setRecent(r.data));
  }, []);

  const metrics = [
    { label: "Today", value: summary?.today.total, count: summary?.today.count, icon: Wallet, accent: "text-blue-600" },
    { label: "This Week", value: summary?.week.total, count: summary?.week.count, icon: TrendingUp, accent: "text-emerald-600" },
    { label: "This Month", value: summary?.month.total, count: summary?.month.count, icon: Receipt, accent: "text-violet-600" },
    { label: "All Time", value: summary?.all_time.total, count: summary?.all_time.count, icon: Users, accent: "text-amber-600" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Dashboard</div>
          <h1 className="font-display text-4xl mt-1">Business overview</h1>
          <p className="text-zinc-500 mt-2">Track sales, customers and growth in real time.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="dashboard-new-bill-btn">
          <Link to="/bills/new"><Plus className="h-4 w-4 mr-2" />New Bill</Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5 border border-zinc-200 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all" data-testid={`metric-${m.label.toLowerCase().replace(/ /g, '-')}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{m.label}</div>
                <div className="font-display text-3xl mt-2">{summary ? formatINR(m.value) : "—"}</div>
                <div className="text-sm text-zinc-500 mt-1">{summary ? `${m.count} bills` : ""}</div>
              </div>
              <m.icon className={`h-5 w-5 ${m.accent}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-6 border border-zinc-200 bg-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl">Last 14 days</h2>
            <p className="text-sm text-zinc-500">Daily sales trend</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/analytics">Full analytics <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="label" stroke="#71717A" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#71717A" fontSize={11} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 6 }}
                formatter={(v) => [formatINR(v), "Sales"]}
              />
              <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent + Top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border border-zinc-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Recent bills</h2>
            <Button variant="ghost" size="sm" asChild data-testid="dashboard-view-all-bills">
              <Link to="/bills">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-zinc-500 py-8 text-center">No bills yet. Create your first one!</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recent.map((b) => (
                <Link key={b.id} to={`/bills/${b.id}`} className="flex items-center justify-between py-3 hover:bg-zinc-50 px-2 rounded" data-testid={`recent-bill-${b.invoice_number}`}>
                  <div>
                    <div className="font-medium">{b.invoice_number} · {b.customer_name}</div>
                    <div className="text-xs text-zinc-500">{formatDate(b.invoice_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">{formatINR(b.total)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 border border-zinc-200 bg-white">
          <h2 className="font-display text-xl mb-4">Top customers</h2>
          {!summary || summary.top_customers.length === 0 ? (
            <div className="text-sm text-zinc-500 py-8 text-center">No data yet</div>
          ) : (
            <div className="space-y-3">
              {summary.top_customers.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">{idx + 1}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-zinc-500">{c.count} bills</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold">{formatINR(c.total)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
