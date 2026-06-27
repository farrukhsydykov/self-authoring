import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const res = await api<{ token: string; user: User }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", res.token);
        set({ token: res.token, user: res.user });
      },
      register: async (email, password) => {
        const res = await api<{ token: string; user: User }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", res.token);
        set({ token: res.token, user: res.user });
      },
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, user: null });
      },
      fetchMe: async () => {
        const res = await api<{ user: User }>("/auth/me");
        set({ user: res.user });
      },
    }),
    { name: "auth", partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) localStorage.setItem("token", state.token);
      },
    }
  )
);
