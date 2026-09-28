
import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleDark: () => void;
  setDark: (v: boolean) => void;
}

const STORAGE_KEY = 'qtg-theme';

const getInitial = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyClass = (isDark: boolean) => {
  if (typeof window === 'undefined') return;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
};

// 初始化时立即应用（防止首屏闪烁）
const initialDark = getInitial();
applyClass(initialDark);

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: initialDark,
  toggleDark: () => {
    const next = !get().isDark;
    applyClass(next);
    set({ isDark: next });
  },
  setDark: (v: boolean) => {
    applyClass(v);
    set({ isDark: v });
  },
}));