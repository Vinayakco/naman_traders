import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, FilePlus2, Files, BarChart3, LogOut, Package, Users, Truck } from "lucide-react";
import { Button } from "../components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard", end: true },
  { to: "/bills/new", label: "New Bill", icon: FilePlus2, testid: "nav-new-bill" },
  { to: "/bills", label: "All Bills", icon: Files, testid: "nav-bills" },
  { to: "/products", label: "Products", icon: Package, testid: "nav-products" },
  { to: "/customers", label: "Customers", icon: Users, testid: "nav-customers" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, testid: "nav-suppliers" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
];

export default function Layout() {
  const { business, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-600 text-white flex items-center justify-center font-display font-bold">NT</div>
            <div>
              <div className="font-display font-semibold leading-tight">{business?.name || "NAMAN TRADERS"}</div>
              <div className="text-xs text-zinc-500">Billing Suite</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full justify-start gap-3 text-zinc-700"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
