import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
  token: string | null;
  login: (username: string, token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      username: null,
      token: null,
      
      login: (username: string, token: string) => {
        set({ isLoggedIn: true, username, token });
        localStorage.setItem('access_token', token);
        localStorage.setItem('username', username);
      },
      
      logout: () => {
        set({ isLoggedIn: false, username: null, token: null });
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
      },
      
      checkAuth: () => {
        const token = localStorage.getItem('access_token');
        const username = localStorage.getItem('username');
        const isLoggedIn = !!token && !!username;
        
        if (isLoggedIn && !get().isLoggedIn) {
          set({ isLoggedIn: true, username, token });
        }
        
        return isLoggedIn;
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);