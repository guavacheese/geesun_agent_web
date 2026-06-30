"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, removeToken, setUser, clearAuth, isAuthenticated, type StoredUser } from "@/lib/auth";
import { login as apiLogin, type ApiError } from "@/lib/api-client";
import type { LoginRequest, User } from "@/lib/types";

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初始化：从 localStorage 恢复认证状态
  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) {
      setTokenState(savedToken);
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          clearAuth();
          setTokenState(null);
        } else {
          setUserState({ id: payload.sub || "", username: payload.username || "用户" });
        }
      } catch {
        clearAuth();
        setTokenState(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await apiLogin(data);
    setToken(res.access_token);
    setUser(res.user);
    setUserState(res.user);
    setTokenState(res.access_token);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
    setTokenState(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isLoggedIn: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
