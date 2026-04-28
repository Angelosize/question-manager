import { create } from 'zustand'

interface AppState {
  darkMode: boolean;
  sidebarCollapsed: boolean;
  currentPage: string;
  categories: {
    subjects: string[];
    types: string[];
    difficulties: string[];
    sources: string[];
    tags: string[];
  };
  
  // Actions
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  setCategories: (categories: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  darkMode: false,
  sidebarCollapsed: false,
  currentPage: 'home',
  categories: {
    subjects: ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '通用'],
    types: ['选择题', '填空题', '解答题', '判断题', '简答题', '计算题', '证明题', '综合题', '实验题', '作文题'],
    difficulties: ['基础', '中等', '拔高', '竞赛', '入门', '熟练', '精通'],
    sources: ['教材', '教辅', '真题', '模拟', '自编', '网络'],
    tags: ['常考', '易错', '重点', '难点', '典型', '综合', '创新'],
  },
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentPage: (page) => set({ currentPage: page }),
  setCategories: (categories) => set({ categories }),
}))