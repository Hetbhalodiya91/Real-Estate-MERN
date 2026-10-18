import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const currentUser = response.data?.user || null;
        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (error) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setToken("");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    const nextToken = response.data.token;
    const nextUser = response.data.user;

    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);

    return response.data;
  };

  const register = async (payload) => {
    const response = await axios.post(`${API_URL}/auth/register`, payload);
    return response.data;
  };

  const verifyEmail = async (email, verificationToken) => {
    const response = await axios.post(`${API_URL}/auth/verify-email`, {
      email,
      verificationToken,
    });
    return response.data;
  };

  const resendVerificationCode = async (email) => {
    const response = await axios.post(
      `${API_URL}/auth/resend-verification-code`,
      { email },
    );
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      verifyEmail,
      resendVerificationCode,
      logout,
      setUser,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};

export const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
