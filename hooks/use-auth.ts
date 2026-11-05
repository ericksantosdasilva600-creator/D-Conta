import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);
  const userRef = useRef<Auth.User | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      if (!userRef.current) setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          setOfflineSession(false);
          // Cache user info in localStorage for faster subsequent loads
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from API");
        } else {
          console.log("[useAuth] Web: No authenticated user from API");
          setUser(null);
          setOfflineSession(false);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        setOfflineSession(false);
        return;
      }

      const apiUser = await Api.getMe();
      if (apiUser) {
        const userInfo: Auth.User = { ...apiUser, lastSignedIn: new Date(apiUser.lastSignedIn) };
        setUser(userInfo);
        await Auth.setUserInfo(userInfo);
        setOfflineSession(false);
      } else {
        await Auth.removeSessionToken();
        await Auth.clearUserInfo();
        setUser(null);
        setOfflineSession(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(error);
      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        setUser(cachedUser);
        setOfflineSession(true);
      } else {
        setUser(null);
        setOfflineSession(false);
      }
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      console.error("[Auth] Logout API call failed");
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setOfflineSession(false);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered");
    if (autoFetch) {
      Auth.getUserInfo().then(async (cachedUser) => {
        const hasNativeToken = Platform.OS === "web" || Boolean(await Auth.getSessionToken());
        if (cachedUser && hasNativeToken) {
          userRef.current = cachedUser;
          setUser(cachedUser);
          setOfflineSession(true);
          setLoading(false);
        }
        void fetchUser();
      });
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    offlineSession,
    refresh: fetchUser,
    logout,
  };
}
