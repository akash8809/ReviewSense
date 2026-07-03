import { create } from "zustand";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const getInitialState = () => {
  if (typeof window === "undefined") {
    return { token: null, user: null, isAuthenticated: false };
  }
  try {
    const token = localStorage.getItem("rs_token");
    const userStr = localStorage.getItem("rs_user");
    if (token && userStr) {
      const user = JSON.parse(userStr) as User;
      return { token, user, isAuthenticated: true };
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  return { token: null, user: null, isAuthenticated: false };
};

export const useAuth = create<AuthState>((set) => ({
  ...getInitialState(),
  login: (token: string, user: User) => {
    localStorage.setItem("rs_token", token);
    localStorage.setItem("rs_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("rs_token");
    localStorage.removeItem("rs_user");
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
