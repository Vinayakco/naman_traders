import { useEffect, useState } from "react";
import api, { formatINR, formatDate } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Plus, Package, PackagePlus, Pencil, Trash2, AlertTriangle, Search, History } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", unit: "pcs", rate: 0, stock: 0, low_stock_threshold: 5, notes: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [restockFor, setRestockFor] = useState(null);
  const [restockQty, setRestockQty] = useState(0);
  const [restockNote, setRestockNote] = useState("");

  const [historyFor, setHistoryFor] = useState(null);
  const [movements, setMovements] = useState([]);

  const fetchProducts = async () => {
    const params = {};
    if (q) params.q = q;
    if (lowOnly) params.low_only = true;
    const { data } = await api.get("/products", { params });
    setProducts(data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const params = {};
      if (lowOnly) params.low_only = true;
      const { data } = await api.get("/products", { params });
      if (active) setProducts(data);
    })();
    return () => {
      active = false;
    };
  }, [lowOnly]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowCreate(true);
  };
  const openEdit = (p) => {
    setForm({ name: p.name, unit: p.unit, rate: p.rate, stock: p.stock, low_stock_threshold: p.low_stock_threshold, notes: p.notes || "" });
    setEditingId(p.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Product name required");
    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, {
          name: form.name,
          unit: form.unit,
          rate: Number(form.rate),
          low_stock_threshold: Number(form.low_stock_threshold),
          notes: form.notes,
        });
        toast.success("Product updated");
      } else {
        await api.post("/products", {
          name: form.name,
          unit: form.unit,
          rate: Number(form.rate),
          stock: Number(form.stock),
          low_stock_threshold: Number(form.low_stock_threshold),
          notes: form.notes,
        });
        toast.success("Product added");
      }
      setShowCreate(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? Existing bills are not affected.`)) return;
    await api.delete(`/products/${p.id}`);
    toast.success("Deleted");
    fetchProducts();
  };

  const openRestock = (p) => {
    setRestockFor(p);
    setRestockQty(0);
    setRestockNote("");
  };

  const submitRestock = async () => {
    if (!restockQty || Number(restockQty) === 0) return toast.error("Quantity required");
    try {
      await api.post(`/products/${restockFor.id}/restock`, {
        quantity: Number(restockQty),
        note: restockNote,
      });
      toast.success(`Stock updated for ${restockFor.name}`);
      setRestockFor(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const openHistory = async (p) => {
    setHistoryFor(p);
    const { data } = await api.get(`/products/${p.id}/movements`);
    setMovements(data);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Inventory</div>
          <h1 className="font-display text-4xl mt-1">Products & Stock</h1>
          <p className="text-zinc-500 mt-2">Manage your inventory. Stock decreases when bills are created.</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700" data-testid="add-product-btn">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <Card className="p-5 border border-zinc-200 bg-white mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input data-testid="product-search-input" className="pl-9" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchProducts()} />
            </div>
          </div>
          <Button onClick={fetchProducts} className="bg-blue-600 hover:bg-blue-700">Apply</Button>
          <Button
            variant={lowOnly ? "default" : "outline"}
            onClick={() => setLowOnly((x) => !x)}
            className={lowOnly ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            data-testid="low-stock-toggle"
          >
            <AlertTriangle className="h-4 w-4 mr-1" /> {lowOnly ? "Showing low stock" : "Low stock only"}
          </Button>
        </div>
      </Card>

      <Card className="border border-zinc-200 bg-white overflow-hidden">
        {products.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <Package className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p>No products yet.</p>
            <Button onClick={openCreate} variant="link" className="text-blue-600 mt-2">Add your first product</Button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            <div className="hidden md:grid grid-cols-12 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-500 bg-zinc-50">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-center">Stock</div>
              <div className="col-span-1 text-center">Unit</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {products.map((p) => {
              const isLow = p.stock <= p.low_stock_threshold;
              return (
                <div key={p.id} className="grid grid-cols-12 px-5 py-4 items-center" data-testid={`product-row-${p.name}`}>
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-medium">{p.name}</div>
                    {p.notes && <div className="text-xs text-zinc-500">{p.notes}</div>}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-mono">{formatINR(p.rate)}</div>
                  <div className="col-span-4 md:col-span-2 text-center">
                    <span className={`font-mono font-semibold ${isLow ? "text-red-600" : ""}`} data-testid={`stock-${p.name}`}>{p.stock}</span>
                    {isLow && <Badge variant="destructive" className="ml-2 text-[10px]">LOW</Badge>}
                  </div>
                  <div className="col-span-4 md:col-span-1 text-center text-sm text-zinc-500">{p.unit}</div>
                  <div className="col-span-12 md:col-span-3 flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openRestock(p)} data-testid={`restock-btn-${p.name}`}>
                      <PackagePlus className="h-4 w-4 mr-1" /> Restock
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openHistory(p)} title="History">
                      <History className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent data-testid="product-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit product" : "Add new product"}</DialogTitle>
            <DialogDescription>{editingId ? "Update product details. Use Restock to add inventory." : "Add a new product to your inventory."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input data-testid="product-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Rice 25kg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input data-testid="product-unit-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bag, pcs, kg" />
              </div>
              <div className="space-y-2">
                <Label>Default rate</Label>
                <Input data-testid="product-rate-input" type="number" step="any" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {!editingId && (
                <div className="space-y-2">
                  <Label>Initial stock</Label>
                  <Input data-testid="product-stock-input" type="number" step="any" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Low stock alert ≤</Label>
                <Input data-testid="product-threshold-input" type="number" step="any" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} data-testid="save-product-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock dialog */}
      <Dialog open={!!restockFor} onOpenChange={(o) => !o && setRestockFor(null)}>
        <DialogContent data-testid="restock-dialog">
          <DialogHeader>
            <DialogTitle>Restock — {restockFor?.name}</DialogTitle>
            <DialogDescription>Current stock: <strong>{restockFor?.stock} {restockFor?.unit}</strong>. Enter quantity to add. Negative numbers reduce stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity to add *</Label>
              <Input data-testid="restock-qty-input" type="number" step="any" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="e.g., 50" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input data-testid="restock-note-input" value={restockNote} onChange={(e) => setRestockNote(e.target.value)} placeholder="Supplier name, batch info" />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm">
              <span className="text-zinc-600">New stock will be: </span>
              <strong className="font-mono">{Number(restockFor?.stock || 0) + Number(restockQty || 0)} {restockFor?.unit}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockFor(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitRestock} data-testid="confirm-restock-btn">Confirm Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock history — {historyFor?.name}</DialogTitle>
            <DialogDescription>All movements for this product.</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {movements.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center py-8">No movements yet.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            m.type === "sale"
                              ? "border-red-200 text-red-700"
                              : m.type === "restock" || m.type === "initial"
                              ? "border-emerald-200 text-emerald-700"
                              : "border-zinc-200"
                          }
                        >
                          {m.type}
                        </Badge>
                        <span className="font-mono font-semibold">{m.quantity > 0 ? "+" : ""}{m.quantity}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{m.note}</div>
                    </div>
                    <div className="text-xs text-zinc-500">{formatDate(m.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
