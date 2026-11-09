import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
}

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      token: null,
      user: null,

      login: (token, user) => {
        localStorage.setItem('access_token', token); // 给 axios 拦截器用
        set({ isLoggedIn: true, token, user });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ isLoggedIn: false, token: null, user: null });
      },
    }),
    { name: 'auth-storage' }
  )
);