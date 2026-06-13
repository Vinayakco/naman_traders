import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState("loading"); // loading | authed | guest
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("nt_token");
    if (!token) {
      setStatus("guest");
      // still fetch business info publicly
      api.get("/business").then((r) => setBusiness(r.data)).catch(() => {});
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        setBusiness(r.data.business);
        setStatus("authed");
      })
      .catch(() => setStatus("guest"));
  }, []);

  const login = async (password) => {
    const { data } = await api.post("/auth/login", { password });
    localStorage.setItem("nt_token", data.token);
    setBusiness(data.business);
    setStatus("authed");
  };

  const logout = () => {
    localStorage.removeItem("nt_token");
    setStatus("guest");
  };

  return (
    <AuthContext.Provider value={{ status, business, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
