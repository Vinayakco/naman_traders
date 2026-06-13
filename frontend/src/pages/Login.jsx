import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { status, login, business } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (status === "authed") return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(password);
      toast.success("Welcome back");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B1220] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.6), transparent 50%), radial-gradient(circle at 80% 70%, rgba(37,99,235,0.4), transparent 50%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center font-display font-bold">NT</div>
            <div className="font-display text-xl">{business?.name || "NAMAN TRADERS"}</div>
          </div>
        </div>
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.3em] text-blue-300 mb-3">Billing Suite</div>
          <h1 className="font-display text-5xl leading-tight">Create. Print. Grow.</h1>
          <p className="text-zinc-300 mt-4 max-w-md">
            Professional invoices, instant analytics, and one-tap WhatsApp sharing — built for your trading business.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-md">
            {["Auto totals", "PDF & Print", "WhatsApp"].map((t) => (
              <div key={t} className="border border-white/10 rounded p-3 text-center text-sm bg-white/5 backdrop-blur">{t}</div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-zinc-400">© {new Date().getFullYear()} Naman Traders</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
              <ShieldCheck className="h-4 w-4" /> Owner Access
            </div>
            <h2 className="font-display text-3xl">Sign in to continue</h2>
            <p className="text-sm text-zinc-500 mt-2">Enter your owner password to unlock the dashboard.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-zinc-500">Password</Label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-11"
                placeholder="Enter password"
                autoFocus
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !password}
            data-testid="login-submit-button"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-xs text-zinc-400 text-center">Default password is set by owner in server settings.</p>
        </form>
      </div>
    </div>
  );
}
