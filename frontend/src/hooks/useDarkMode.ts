import { useThemeStore } from '../store/themeStore';

export function useDarkMode(): [boolean, () => void] {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  return [isDark, toggleDark];
}