import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatINR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Plus, Trash2, Save, ArrowLeft, Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const emptyItem = () => ({ description: "", quantity: 1, rate: 0, product_id: null });

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

  useEffect(() => {
    api.get("/bills/next-number").then((r) => setInvoiceNumber(r.data.invoice_number));
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  const pickProduct = (idx, product) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, product_id: product.id, description: product.name, rate: product.rate }
          : it
      )
    );
  };
  const clearProduct = (idx) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, product_id: null } : it)));
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
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
          <h1 className="font-display text-4xl mt-1">New Invoice <span className="text-blue-600 font-mono text-2xl ml-2">{invoiceNumber}</span></h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-bill-button">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save & Preview"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card className="p-6 border border-zinc-200 bg-white">
            <h2 className="font-display text-lg mb-4">Customer details</h2>
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
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-12 gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500 px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {items.map((it, idx) => {
                const amount = Number(it.quantity || 0) * Number(it.rate || 0);
                const linkedProduct = products.find((p) => p.id === it.product_id);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-start" data-testid={`item-row-${idx}`}>
                    <div className="col-span-12 md:col-span-6 space-y-1">
                      <div className="flex gap-2">
                        <Input className="flex-1" placeholder="Item description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} data-testid={`item-desc-${idx}`} />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="icon" data-testid={`pick-product-${idx}`} title="Pick from inventory">
                              <Package className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="end">
                            <Command>
                              <CommandInput placeholder="Search products..." />
                              <CommandList>
                                <CommandEmpty>No products. Add some in Products page.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((p) => (
                                    <CommandItem key={p.id} value={p.name} onSelect={() => pickProduct(idx, p)} data-testid={`pick-product-option-${p.name}`}>
                                      <div className="flex justify-between w-full">
                                        <span>{p.name}</span>
                                        <span className="text-xs text-zinc-500">Stock: {p.stock}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {linkedProduct && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 inline-flex items-center gap-1">
                            <Package className="h-3 w-3" /> {linkedProduct.name} · stock {linkedProduct.stock}{linkedProduct.unit}
                          </span>
                          <button type="button" onClick={() => clearProduct(idx)} className="text-zinc-400 hover:text-red-600">unlink</button>
                        </div>
                      )}
                    </div>
                    <Input className="col-span-4 md:col-span-2 text-center" type="number" min="0" step="any" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} data-testid={`item-qty-${idx}`} />
                    <Input className="col-span-4 md:col-span-2 text-right" type="number" min="0" step="any" value={it.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} data-testid={`item-rate-${idx}`} />
                    <div className="col-span-3 md:col-span-1 text-right font-mono font-semibold" data-testid={`item-amount-${idx}`}>{formatINR(amount)}</div>
                    <button onClick={() => removeItem(idx)} className="col-span-1 text-zinc-400 hover:text-red-600 transition-colors mt-2" data-testid={`remove-item-${idx}`} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
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

        {/* Summary sidebar */}
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
