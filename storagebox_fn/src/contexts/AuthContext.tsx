import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/features/auth/api";
import { queryKeys } from "@/lib/queryKeys";
import { sessionStore } from "@/lib/session";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: authApi.LoginInput) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Profile) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
  const queryClient = useQueryClient();
  const freshProfile = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await authApi.getMe()).data,
    enabled: Boolean(session),
    staleTime: 60_000,
  }).data;

  useEffect(() => {
    if (freshProfile) sessionStore.updateUser(freshProfile);
  }, [freshProfile]);

  const login = useCallback(async (input: authApi.LoginInput) => {
    sessionStore.set((await authApi.login(input)).data);
  }, []);

  const register = useCallback(async (input: authApi.RegisterInput) => {
    sessionStore.set((await authApi.register(input)).data);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = sessionStore.get()?.refreshToken;
    sessionStore.set(null);
    queryClient.clear();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isAdmin: session?.user.role === "ADMIN",
      login,
      register,
      logout,
      setUser: (user) => sessionStore.updateUser(user),
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
