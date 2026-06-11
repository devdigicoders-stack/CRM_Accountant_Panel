// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

const USER_KEY = "accountant-data";
const TOKEN_KEY = "accountant-token";

export const AuthProvider = ({ children }) => {
  // user object: { _id, name, email, role, ... }
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // string
  const [loading, setLoading] = useState(true);

  // hydrate from localStorage (persisted login)
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user data", e);
        localStorage.removeItem(USER_KEY);
      }
    }

    if (savedToken) {
      setToken(savedToken);
    }

    setLoading(false);
  }, []);

  const setLoginData = (userData) => {
    if (userData.user?.role !== "accountant") {
      console.warn("Blocked: Only accountant role is allowed.");
      return;
    }
    setUser(userData.user);
    setToken(userData.token);

    localStorage.setItem(USER_KEY, JSON.stringify(userData.user));
    if (userData.token) {
      localStorage.setItem(TOKEN_KEY, userData.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const isLoggedIn = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{ user, token, setLoginData, logout, isLoggedIn, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
