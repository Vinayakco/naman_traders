import { useEffect, useState } from "react";
import api, { formatINR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Plus, Users, Truck, Pencil, Trash2, Search, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", phone: "", address: "", notes: "" };

export default function Contacts({ kind = "customers" }) {
  const path = kind === "suppliers" ? "/suppliers" : "/customers";
  const config = kind === "suppliers"
    ? {
        title: "Suppliers",
        subtitle: "Vendors you buy stock from. Link them when restocking products.",
        icon: Truck,
        addLabel: "Add Supplier",
        searchPlaceholder: "Search suppliers",
        emptyMessage: "No suppliers yet.",
        emptyCta: "Add your first supplier",
        showSpend: false,
        addBtnTestId: "add-supplier-btn",
        searchTestId: "supplier-search-input",
        nameTestId: "supplier-name-input",
      }
    : {
        title: "Customers",
        subtitle: "People you sell to. Customers are auto-added when you create a bill.",
        icon: Users,
        addLabel: "Add Customer",
        searchPlaceholder: "Search customers",
        emptyMessage: "No customers yet.",
        emptyCta: "Add your first customer",
        showSpend: true,
        addBtnTestId: "add-customer-btn",
        searchTestId: "customer-search-input",
        nameTestId: "customer-name-input",
      };

  const Icon = config.icon;

  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const fetchList = async () => {
    const params = q ? { q } : {};
    const { data } = await api.get(path, { params });
    setList(data);
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShow(true);
  };
  const openEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setEditingId(c.id);
    setShow(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      if (editingId) {
        await api.patch(`${path}/${editingId}`, form);
        toast.success("Updated");
      } else {
        await api.post(path, form);
        toast.success("Added");
      }
      setShow(false);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await api.delete(`${path}/${c.id}`);
    toast.success("Deleted");
    fetchList();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" /> Contacts
          </div>
          <h1 className="font-display text-4xl mt-1">{config.title}</h1>
          <p className="text-zinc-500 mt-2">{config.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700" data-testid={config.addBtnTestId}>
          <Plus className="h-4 w-4 mr-2" /> {config.addLabel}
        </Button>
      </div>

      <Card className="p-5 border border-zinc-200 bg-white mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input data-testid={config.searchTestId} className="pl-9" placeholder={config.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchList()} />
            </div>
          </div>
          <Button onClick={fetchList} className="bg-blue-600 hover:bg-blue-700">Apply</Button>
        </div>
      </Card>

      <Card className="border border-zinc-200 bg-white overflow-hidden">
        {list.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <Icon className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p>{config.emptyMessage}</p>
            <Button onClick={openCreate} variant="link" className="text-blue-600 mt-2">{config.emptyCta}</Button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {list.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors" data-testid={`contact-row-${c.name}`}>
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-display font-semibold uppercase">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.address && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{c.address}</span>}
                    </div>
                  </div>
                </div>
                {config.showSpend && (
                  <div className="text-right mr-4 hidden md:block">
                    <div className="font-mono font-semibold">{formatINR(c.total_amount)}</div>
                    <div className="text-xs text-zinc-500">{c.total_count} bills</div>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(c)} className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent data-testid="contact-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit ${kind === "suppliers" ? "supplier" : "customer"}` : `Add new ${kind === "suppliers" ? "supplier" : "customer"}`}</DialogTitle>
            <DialogDescription>Fill in the contact details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input data-testid={config.nameTestId} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="91XXXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} data-testid="save-contact-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
