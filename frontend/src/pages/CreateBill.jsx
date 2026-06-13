import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatINR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { Plus, Trash2, Save, ArrowLeft, Package, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Weight conversion: all values are factors to grams
export const UNIT_TO_GRAMS = {
  quintal: 100000,
  ton: 1000000,
  kg: 1000,
  g: 1,
  gram: 1,
  lbs: 453.592,
};
export const WEIGHT_UNITS = ["quintal", "kg", "g", "ton", "lbs"];
export const ALL_UNITS = ["quintal", "kg", "g", "ton", "lbs", "bag", "pcs", "box", "ltr", "ml"];

export function convertQty(qty, fromU, toU) {
  if (!fromU || !toU || fromU === toU) return Number(qty || 0);
  const f = UNIT_TO_GRAMS[fromU];
  const t = UNIT_TO_GRAMS[toU];
  if (f == null || t == null) return Number(qty || 0);
  return (Number(qty || 0) * f) / t;
}

const emptyItem = () => ({
  description: "",
  quantity: 1,
  rate: 0,
  unit: "quintal",
  product_id: null,
});

export default function CreateBill() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState("...");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([emptyItem()]);
  const [gstPercent, setGstPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [openProductIdx, setOpenProductIdx] = useState(null);
  const [openCustomer, setOpenCustomer] = useState(false);

  useEffect(() => {
    api.get("/bills/next-number").then((r) => setInvoiceNumber(r.data.invoice_number));
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
  }, []);

  const updateItem = (idx, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const pickProduct = (idx, product) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, description: product.name, rate: product.rate, product_id: product.id, unit: product.unit || it.unit }
          : it
      )
    );
    setOpenProductIdx(null);
  };
  const clearProduct = (idx) => updateItem(idx, "product_id", null);

  const pickCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
    setCustomerAddress(c.address || "");
    setOpenCustomer(false);
  };

  const addItem = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (idx) => setItems((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0);
  const gstAmount = subtotal * (Number(gstPercent || 0) / 100);
  const total = subtotal + gstAmount;

  const handleSave = async () => {
    if (!customerName.trim()) return toast.error("Customer name required");
    const validItems = items.filter((it) => it.description.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) return toast.error("Add at least one item");

    // Stock check (convert sold qty to product unit first)
    for (const it of validItems) {
      if (it.product_id) {
        const p = products.find((x) => x.id === it.product_id);
        if (p) {
          const deductInProductUnit = convertQty(it.quantity, it.unit, p.unit);
          if (deductInProductUnit > p.stock) {
            if (!window.confirm(`"${p.name}" stock is ${p.stock} ${p.unit}. You are billing ${deductInProductUnit.toFixed(2)} ${p.unit}. Continue anyway?`))
              return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        invoice_date: invoiceDate,
        items: validItems.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          amount: Number(it.quantity) * Number(it.rate),
          unit: it.unit || null,
          product_id: it.product_id || null,
        })),
        gst_percent: Number(gstPercent || 0),
        notes,
      };
      const { data } = await api.post("/bills", payload);
      toast.success(`Bill ${data.invoice_number} saved`);
      navigate(`/bills/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-3">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Create Bill</div>
          <h1 className="font-display text-4xl mt-1">
            New Invoice <span className="text-blue-600 font-mono text-2xl ml-2">{invoiceNumber}</span>
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-bill-button">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save & Preview"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card className="p-6 border border-zinc-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Customer details</h2>
              {customers.length > 0 && (
                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="pick-customer-btn">
                      Pick existing <ChevronsUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem key={c.id} onSelect={() => pickCustomer(c)} value={c.name}>
                              <div className="flex flex-col">
                                <span className="font-medium">{c.name}</span>
                                {c.phone && <span className="text-xs text-zinc-500">{c.phone}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Name *</Label>
                <Input data-testid="customer-name-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Phone (WhatsApp)</Label>
                <Input data-testid="customer-phone-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="91XXXXXXXXXX" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Address</Label>
                <Textarea data-testid="customer-address-input" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Customer address" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Invoice date</Label>
                <Input data-testid="invoice-date-input" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6 border border-zinc-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Items</h2>
              <Button variant="outline" size="sm" onClick={addItem} data-testid="add-item-button">
                <Plus className="h-4 w-4 mr-1" /> Add row
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((it, idx) => {
                const amount = Number(it.quantity || 0) * Number(it.rate || 0);
                const linkedProduct = it.product_id ? products.find((p) => p.id === it.product_id) : null;

                let deductInProductUnit = null;
                let stockWarn = false;
                let convertedHint = null;
                if (linkedProduct) {
                  deductInProductUnit = convertQty(Number(it.quantity || 0), it.unit, linkedProduct.unit);
                  stockWarn = deductInProductUnit > linkedProduct.stock;
                  if (it.unit !== linkedProduct.unit) {
                    convertedHint = `= ${deductInProductUnit.toFixed(2)} ${linkedProduct.unit} stock`;
                  }
                } else if (it.unit && WEIGHT_UNITS.includes(it.unit) && it.unit !== "kg") {
                  // Show kg equivalent for clarity
                  const kg = convertQty(Number(it.quantity || 0), it.unit, "kg");
                  if (kg > 0) convertedHint = `≈ ${kg.toFixed(2)} kg`;
                }

                return (
                  <div key={idx} className="border border-zinc-200 rounded p-4 space-y-3" data-testid={`item-row-${idx}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Popover open={openProductIdx === idx} onOpenChange={(o) => setOpenProductIdx(o ? idx : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-8" data-testid={`pick-product-${idx}`}>
                            <Package className="h-3 w-3 mr-1" />
                            {linkedProduct ? `Linked: ${linkedProduct.name} (Stock: ${linkedProduct.stock} ${linkedProduct.unit})` : "Pick from products (optional)"}
                            <ChevronsUpDown className="h-3 w-3 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search products..." />
                            <CommandList>
                              <CommandEmpty>No products found. Add some in Products page.</CommandEmpty>
                              <CommandGroup>
                                {products.map((p) => (
                                  <CommandItem key={p.id} onSelect={() => pickProduct(idx, p)} value={p.name}>
                                    <Check className={`h-4 w-4 mr-2 ${linkedProduct?.id === p.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium">{p.name}</span>
                                      <span className="text-xs text-zinc-500">{formatINR(p.rate)} / {p.unit} · Stock: {p.stock} {p.unit}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex gap-1">
                        {linkedProduct && (
                          <Button variant="ghost" size="sm" className="text-xs h-8 text-zinc-500" onClick={() => clearProduct(idx)}>Unlink</Button>
                        )}
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                          data-testid={`remove-item-${idx}`}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-4 space-y-1">
                        <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Description</Label>
                        <Input placeholder="e.g., Potato" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} data-testid={`item-desc-${idx}`} />
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Qty</Label>
                        <Input type="number" min="0" step="any" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} data-testid={`item-qty-${idx}`} className="text-center" />
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Unit</Label>
                        <select
                          value={it.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          data-testid={`item-unit-${idx}`}
                          className="w-full h-10 border border-zinc-200 rounded px-2 text-sm bg-white"
                        >
                          {ALL_UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rate / unit</Label>
                        <Input type="number" min="0" step="any" value={it.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} data-testid={`item-rate-${idx}`} className="text-right" />
                      </div>
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Amount</Label>
                        <div className="h-10 flex items-center justify-end px-3 bg-zinc-50 border border-zinc-200 rounded font-mono font-semibold" data-testid={`item-amount-${idx}`}>{formatINR(amount)}</div>
                      </div>
                    </div>

                    {convertedHint && (
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-blue-400" />
                        {convertedHint}
                      </div>
                    )}

                    {stockWarn && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Only {linkedProduct.stock} {linkedProduct.unit} in stock — billing will go negative
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6 border border-zinc-200 bg-white">
            <h2 className="font-display text-lg mb-4">Terms & Notes</h2>
            <Textarea data-testid="notes-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thank you message, etc." />
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card className="p-6 border border-zinc-200 bg-white sticky top-6">
            <h2 className="font-display text-lg mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-mono font-semibold" data-testid="summary-subtotal">{formatINR(subtotal)}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">GST %</Label>
                <Input data-testid="gst-percent-input" type="number" min="0" step="any" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="0" />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">GST amount</span>
                <span className="font-mono" data-testid="summary-gst">{formatINR(gstAmount)}</span>
              </div>
              <div className="border-t border-zinc-200 pt-3 flex justify-between items-baseline">
                <span className="font-display text-lg">Total</span>
                <span className="font-mono text-2xl font-bold text-blue-600" data-testid="summary-total">{formatINR(total)}</span>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 h-11" data-testid="save-bill-sidebar-button">
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Bill"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
