import React, { createContext, useContext } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LOCAL_ONLY } from "@/lib/local-mode";

export type AuthState = ReturnType<typeof useAuth>;
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth({ autoFetch: !LOCAL_ONLY });
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuthContext tem de ser usado dentro de AuthProvider.");
  return value;
}
