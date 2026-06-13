import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatINR, formatDate } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Printer, Share2, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const [bill, setBill] = useState(null);

  useEffect(() => {
    api.get(`/bills/${id}`).then((r) => setBill(r.data)).catch(() => {
      toast.error("Bill not found");
      navigate("/bills");
    });
  }, [id, navigate]);

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    if (!bill?.customer_phone) {
      toast.error("No customer phone number");
      return;
    }
    const phone = bill.customer_phone.replace(/[^\d]/g, "");
    const lines = [
      `*${business?.name || "NAMAN TRADERS"}*`,
      ``,
      `Invoice: *${bill.invoice_number}*`,
      `Date: ${formatDate(bill.invoice_date)}`,
      ``,
      `Dear ${bill.customer_name},`,
      `Here is your bill summary:`,
      ``,
      ...bill.items.map((it) => `• ${it.description} — ${it.quantity} x ${formatINR(it.rate)} = ${formatINR(it.amount)}`),
      ``,
      `Subtotal: ${formatINR(bill.subtotal)}`,
      bill.gst_percent > 0 ? `GST (${bill.gst_percent}%): ${formatINR(bill.gst_amount)}` : null,
      `*Total: ${formatINR(bill.total)}*`,
      ``,
      `Thank you for your business!`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this bill permanently?")) return;
    try {
      await api.delete(`/bills/${id}`);
      toast.success("Bill deleted");
      navigate("/bills");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (!bill) return <div className="p-10 text-zinc-500">Loading...</div>;

  return (
    <div className="bg-zinc-100 min-h-screen">
      {/* Action bar */}
      <div className="no-print bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/bills")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to bills
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDelete} data-testid="delete-bill-button" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
            <Button variant="outline" onClick={handleWhatsApp} data-testid="whatsapp-share-button" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Share2 className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button onClick={handlePrint} data-testid="print-bill-button" className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" /> Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="p-4 md:p-10 flex justify-center">
        <div className="print-area invoice-paper w-full max-w-[820px] shadow-sm border border-zinc-200" data-testid="invoice-preview">
          {/* Header band */}
          <div className="bg-blue-600 h-3 w-full" />
          <div className="px-10 pt-10 pb-6 grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-blue-600 text-white flex items-center justify-center font-display font-bold text-lg">NT</div>
                <div>
                  <div className="font-display font-bold text-2xl text-zinc-900">{business?.name}</div>
                  {business?.gstin && <div className="text-xs text-zinc-500 mt-0.5">GSTIN: {business.gstin}</div>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-4xl text-blue-600 font-bold tracking-tight">INVOICE</div>
              <div className="text-xs text-zinc-500 mt-2 font-mono">{bill.invoice_number}</div>
            </div>
          </div>

          <div className="px-10 grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold mb-2">Bill To</div>
              <div className="font-semibold text-zinc-900">{bill.customer_name}</div>
              {bill.customer_phone && <div className="text-sm text-zinc-600 mt-1">{bill.customer_phone}</div>}
              {bill.customer_address && <div className="text-sm text-zinc-600 mt-1 whitespace-pre-line">{bill.customer_address}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold mb-2">Invoice details</div>
              <div className="text-sm text-zinc-700"><span className="text-zinc-500">Date:</span> {formatDate(bill.invoice_date)}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold mt-4 mb-2">From</div>
              <div className="text-sm text-zinc-700">{business?.address}</div>
              <div className="text-sm text-zinc-700">{business?.phone}</div>
              <div className="text-sm text-zinc-700">{business?.email}</div>
            </div>
          </div>

          {/* Items table */}
          <div className="px-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wider">Description</th>
                  <th className="text-center px-4 py-3 font-semibold uppercase text-xs tracking-wider w-24">Weight</th>
                  <th className="text-center px-4 py-3 font-semibold uppercase text-xs tracking-wider w-16">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase text-xs tracking-wider w-28">Rate</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase text-xs tracking-wider w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((it, i) => (
                  <tr key={i} className="border-b border-zinc-200">
                    <td className="px-4 py-3 text-zinc-800">{it.description}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{it.weight ? `${it.weight} ${it.weight_unit || ""}` : "—"}</td>
                    <td className="px-4 py-3 text-center font-mono">{it.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(it.rate)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatINR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals + terms */}
          <div className="px-10 mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold mb-2">Terms & Notes</div>
              <div className="text-sm text-zinc-600 whitespace-pre-line">
                {bill.notes || "Thank you for your business. Payment due upon receipt."}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-mono">{formatINR(bill.subtotal)}</span>
              </div>
              {bill.gst_percent > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">GST ({bill.gst_percent}%)</span>
                  <span className="font-mono">{formatINR(bill.gst_amount)}</span>
                </div>
              )}
              <div className="border-t-2 border-blue-600 pt-2 mt-2 flex justify-between items-baseline">
                <span className="font-display font-semibold text-blue-600 uppercase tracking-wider">Total Due</span>
                <span className="font-mono text-2xl font-bold text-blue-600">{formatINR(bill.total)}</span>
              </div>
            </div>
          </div>

          {/* Signature & footer */}
          <div className="px-10 mt-12 grid grid-cols-2 gap-6 pb-8">
            <div></div>
            <div className="text-right">
              <div className="font-display italic text-2xl text-zinc-800">{business?.owner || ""}</div>
              <div className="border-t border-zinc-300 pt-2 mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Authorised Signature</div>
            </div>
          </div>

          <div className="bg-blue-600 text-white text-xs px-10 py-3 flex justify-between flex-wrap gap-2">
            <span>{business?.email}</span>
            <span>{business?.phone}</span>
            <span>{business?.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
