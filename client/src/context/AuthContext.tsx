import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  clearAllAuthTokens,
  getStoredJwtToken,
  registerUnauthorizedHandler,
  setInMemoryToken,
} from "../lib/api";
import { firebaseAuth } from "../lib/firebase";
import { authService } from "../features/auth/services/authService";
import type {
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from "../features/auth/types";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  theme: "light" | "dark";
  login: (payload: LoginPayload) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  toggleTheme: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const THEME_KEY = "focusflow_theme";

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Ignore
  }
  return "light";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const handleUnauthorized = useCallback(() => {
    clearAllAuthTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    return registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const jwtToken = getStoredJwtToken();
      if (jwtToken) {
        try {
          const profile = await authService.getMe();
          if (active) {
            setUser(profile);
            setTheme(profile.theme);
          }
          return true;
        } catch {
          clearAllAuthTokens();
        }
      }
      return false;
    };

    let unsubscribeFirebase: (() => void) | null = null;

    restoreSession().then((restoredFromJwt) => {
      if (!active) return;
      if (restoredFromJwt) {
        setIsLoading(false);
        return;
      }

      if (!firebaseAuth) {
        setIsLoading(false);
        return;
      }

      unsubscribeFirebase = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (!active) return;
        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            setInMemoryToken(idToken);
            const profile = await authService.getMe();
            if (active) {
              setUser(profile);
              setTheme(profile.theme);
            }
          } catch {
            setInMemoryToken(null);
            if (active) setUser(null);
          } finally {
            if (active) setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      });
    });

    return () => {
      active = false;
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    setUser(res.user);
    setTheme(res.user.theme);
    return res.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    setUser(res.user);
    setTheme(res.user.theme);
    return res.user;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const profile = await authService.loginWithGoogle();
    setUser(profile);
    setTheme(profile.theme);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await authService.updateProfile(payload);
    setUser(updated);
    if (payload.theme) {
      setTheme(updated.theme);
    }
    return updated;
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (user) {
      try {
        const updated = await authService.updateProfile({ theme: nextTheme });
        setUser(updated);
      } catch {
        // Keep local theme even if background sync fails
      }
    }
  }, [theme, user]);

  const refreshUser = useCallback(async () => {
    const profile = await authService.getMe();
    setUser(profile);
    setTheme(profile.theme);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        theme,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
        toggleTheme,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
