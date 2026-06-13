import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import CreateBill from "./pages/CreateBill";
import BillsList from "./pages/BillsList";
import BillDetail from "./pages/BillDetail";
import Analytics from "./pages/Analytics";
import Products from "./pages/Products";

function Protected({ children }) {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }
  if (status !== "authed") return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="bills" element={<BillsList />} />
            <Route path="bills/new" element={<CreateBill />} />
            <Route path="bills/:id" element={<BillDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<Contacts kind="customers" />} />
            <Route path="suppliers" element={<Contacts kind="suppliers" />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
