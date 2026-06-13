import { useEffect, useState } from "react";
import api, { formatINR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

const periods = [
  { key: "day", label: "Daily (14d)" },
  { key: "week", label: "Weekly (8w)" },
  { key: "month", label: "Monthly (12m)" },
  { key: "year", label: "Yearly (5y)" },
];

export default function Analytics() {
  const [period, setPeriod] = useState("day");
  const [series, setSeries] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get(`/analytics/timeseries?period=${period}`).then((r) => setSeries(r.data.series));
  }, [period]);

  useEffect(() => {
    api.get("/analytics/summary").then((r) => setSummary(r.data));
  }, []);

  const totalShown = series.reduce((s, x) => s + x.total, 0);
  const billsShown = series.reduce((s, x) => s + x.count, 0);
  const avgBill = billsShown > 0 ? totalShown / billsShown : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Analytics</div>
        <h1 className="font-display text-4xl mt-1">Business growth</h1>
        <p className="text-zinc-500 mt-2">Track revenue across day, week, month and year.</p>
      </div>

      {/* Period switcher */}
      <div className="flex flex-wrap gap-2 mb-6">
        {periods.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            onClick={() => setPeriod(p.key)}
            className={period === p.key ? "bg-blue-600 hover:bg-blue-700" : ""}
            data-testid={`period-${p.key}`}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Stats for selected period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-zinc-200 bg-white">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Revenue (range)</div>
          <div className="font-display text-3xl mt-2 text-blue-600">{formatINR(totalShown)}</div>
        </Card>
        <Card className="p-5 border border-zinc-200 bg-white">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Bills (range)</div>
          <div className="font-display text-3xl mt-2">{billsShown}</div>
        </Card>
        <Card className="p-5 border border-zinc-200 bg-white">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Avg bill value</div>
          <div className="font-display text-3xl mt-2">{formatINR(avgBill)}</div>
        </Card>
      </div>

      {/* Bar chart - revenue */}
      <Card className="p-6 border border-zinc-200 bg-white mb-6">
        <h2 className="font-display text-xl mb-4">Revenue by period</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="label" stroke="#71717A" fontSize={11} />
              <YAxis stroke="#71717A" fontSize={11} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 6 }}
                formatter={(v) => [formatINR(v), "Revenue"]}
              />
              <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Line chart - bill count */}
      <Card className="p-6 border border-zinc-200 bg-white mb-6">
        <h2 className="font-display text-xl mb-4">Bill count trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="label" stroke="#71717A" fontSize={11} />
              <YAxis stroke="#71717A" fontSize={11} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 6 }} />
              <Line type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Overall snapshot */}
      {summary && (
        <Card className="p-6 border border-zinc-200 bg-white">
          <h2 className="font-display text-xl mb-4">Overall snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["today", "week", "month", "year"].map((k) => (
              <div key={k} className="border border-zinc-200 rounded p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 capitalize">{k}</div>
                <div className="font-display text-2xl mt-1">{formatINR(summary[k].total)}</div>
                <div className="text-xs text-zinc-500 mt-1">{summary[k].count} bills</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
