import { create } from 'zustand';
import { apiClient } from '../api/client';
import { aiClient } from '../api/aiClient';
import { Question, QuestionCreate, QuestionUpdate, FilterParams, QuizSettings, QuizQuestion, AIGradeRequest, AIGradeResponse, AIStatus } from '../types';

interface QuestionState {
  questions: Question[];
  currentQuestion: Question | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  filters: FilterParams;
  categories: {
    subjects: string[];
    types: string[];
    difficulties: string[];
    sources: string[];
    tags: string[];
  };
  aiStatus: AIStatus;

  setFilters: (filters: FilterParams) => void;
  loadQuestions: () => Promise<void>;
  getQuestion: (id: string) => Promise<void>;
  createQuestion: (question: QuestionCreate) => Promise<string>;
  updateQuestion: (id: string, question: QuestionUpdate) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  batchDeleteQuestions: (ids: string[]) => Promise<{ deleted_count: number, conflicts?: Record<string, string> }>;
  clearError: () => void;
  loadCategories: () => Promise<void>;
  generateQuiz: (settings: QuizSettings) => Promise<QuizQuestion[]>;
  checkAIStatus: () => Promise<void>;
  gradeWithAI: (request: AIGradeRequest) => Promise<AIGradeResponse>;
  quickCheck: (questionId: string, userAnswer: string) => Promise<boolean>;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  currentQuestion: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  filters: { page: 1, limit: 20 },
  categories: {
    subjects: [],
    types: [],
    difficulties: [],
    sources: [],
    tags: [],
  },
  aiStatus: { available: false },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().loadQuestions();
  },

  loadQuestions: async () => {
  set({ isLoading: true, error: null });
  try {
    const response = await apiClient.getQuestions(get().filters);
    const items = response.items || [];
    console.log('✅ 真实加载的题目数:', items.length, '第一条 id:', items[0]?.id);
    set({ 
      questions: items,
      totalCount: response.total,
      isLoading: false 
    });
    get().loadCategories();
  } catch (error: any) {
    console.error('❌ 加载题目失败:', error);
    set({ 
      questions: [],      // 不再使用模拟数据
      totalCount: 0,
      isLoading: false,
      error: '加载失败，请刷新重试'
    });
  }
},

  getQuestion: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const question = await apiClient.getQuestion(id);
      set({ currentQuestion: question, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || '获取题目失败',
        isLoading: false 
      });
    }
  },

  createQuestion: async (question: QuestionCreate): Promise<string> => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.createQuestion(question);
      // 重置页码到第一页
      set((state) => ({ filters: { ...state.filters, page: 1 } }));
      await get().loadQuestions();
      set({ isLoading: false });
      return response.id;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || '创建题目失败',
        isLoading: false 
      });
      throw error;
    }
  },

  updateQuestion: async (id: string, question: QuestionUpdate): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.updateQuestion(id, question);
      await Promise.all([
        get().loadQuestions(),
        get().getQuestion(id)
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || '更新题目失败',
        isLoading: false 
      });
      throw error;
    }
  },

  // ⚠️ 修改：删除单个，透传错误信息
  deleteQuestion: async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.deleteQuestion(id);
      await get().loadQuestions();
      set({ isLoading: false });
    } catch (error: any) {
      // 错误信息已经由 apiClient 封装，包含冲突详情
      set({ 
        error: error.message || '删除题目失败',
        isLoading: false 
      });
      throw error; // 继续抛出，让组件捕获并显示
    }
  },

  // ⚠️ 修改：批量删除，返回冲突信息
  batchDeleteQuestions: async (ids: string[]): Promise<{ deleted_count: number, conflicts?: Record<string, string> }> => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiClient.batchDeleteQuestions(ids);
      await get().loadQuestions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.message || '批量删除失败',
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  loadCategories: async () => {
    try {
      const questions = get().questions;
      
      const subjects = Array.from(new Set(questions.map(q => q.subject)))
        .filter((subject): subject is string => !!subject);
      
      const types = Array.from(new Set(questions.map(q => q.type)))
        .filter((type): type is string => !!type);
      
      const difficulties = Array.from(new Set(questions.map(q => q.difficulty)))
        .filter((difficulty): difficulty is string => !!difficulty);
      
      const sources = Array.from(new Set(questions.map(q => q.source)))
        .filter((source): source is string => !!source);
      
      const allTags = questions.flatMap(q => q.tags || []);
      const tags = Array.from(new Set(allTags))
        .filter((tag): tag is string => !!tag);

      // 确保默认分类
      const defaultSubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
      const defaultTypes = ['选择题', '填空题', '解答题', '判断题', '简答题'];
      const defaultDifficulties = ['基础', '中等', '拔高'];

      set({ 
        categories: { 
          subjects: Array.from(new Set([...defaultSubjects, ...subjects])),
          types: Array.from(new Set([...defaultTypes, ...types])),
          difficulties: Array.from(new Set([...defaultDifficulties, ...difficulties])),
          sources,
          tags
        } 
      });
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  },

  generateQuiz: async (settings: QuizSettings): Promise<QuizQuestion[]> => {
    set({ isLoading: true, error: null });
    try {
      const allQuestions = get().questions;
      let filteredQuestions = [...allQuestions];
      
      if (settings.subjects && settings.subjects.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => 
          settings.subjects!.includes(q.subject)
        );
      }
      
      if (settings.types && settings.types.length > 0) {
        filteredQuestions = filteredQuestions.filter(q =>
          settings.types!.includes(q.type)
        );
      }
      
      const difficultyDistribution = settings.difficulty_distribution || { '基础': 30, '中等': 50, '拔高': 20 };
      const difficultyCounts: Record<string, number> = {};
      
      Object.entries(difficultyDistribution).forEach(([difficulty, percentage]) => {
        difficultyCounts[difficulty] = Math.floor((percentage / 100) * settings.count);
      });
      
      const questionsByDifficulty: Record<string, Question[]> = {};
      filteredQuestions.forEach(q => {
        const difficulty = q.difficulty || '中等';
        if (!questionsByDifficulty[difficulty]) {
          questionsByDifficulty[difficulty] = [];
        }
        questionsByDifficulty[difficulty].push(q);
      });
      
      const selectedQuestions: QuizQuestion[] = [];
      Object.entries(difficultyCounts).forEach(([difficulty, count]) => {
        const availableQuestions = questionsByDifficulty[difficulty] || [];
        const selected = availableQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, count)
          .map(q => ({ 
            ...q, 
            user_answer: undefined, 
            is_correct: undefined, 
            score: undefined 
          }));
        selectedQuestions.push(...selected);
      });
      
      if (selectedQuestions.length < settings.count) {
        const remainingCount = settings.count - selectedQuestions.length;
        const remainingQuestions = filteredQuestions
          .filter(q => !selectedQuestions.some(sq => sq.id === q.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, remainingCount)
          .map(q => ({ 
            ...q, 
            user_answer: undefined, 
            is_correct: undefined, 
            score: undefined 
          }));
        selectedQuestions.push(...remainingQuestions);
      }
      
      const shuffledQuestions = selectedQuestions.sort(() => Math.random() - 0.5);
      
      set({ isLoading: false });
      return shuffledQuestions;
      
    } catch (error: any) {
      set({ 
        error: error.message || '组卷失败',
        isLoading: false 
      });
      throw error;
    }
  },

  checkAIStatus: async () => {
    try {
      const status = await aiClient.checkStatus();
      set({ aiStatus: status });
      console.log('AI服务状态:', status);
    } catch (error) {
      console.error('检查AI状态失败:', error);
      set({ aiStatus: { available: false } });
    }
  },

  gradeWithAI: async (request: AIGradeRequest): Promise<AIGradeResponse> => {
    try {
      const result = await aiClient.gradeAnswer(request);
      return result;
    } catch (error: any) {
      console.error('AI批改失败:', error);
      return {
        is_correct: false,
        ai_feedback: 'AI批改服务暂时不可用',
        confidence: 0,
        detailed_analysis: '请稍后重试或联系管理员',
        score: 0,
        timestamp: new Date().toISOString()
      };
    }
  },

  quickCheck: async (questionId: string, userAnswer: string) => {
    try {
      const isCorrect = await aiClient.quickCheck(questionId, userAnswer);
      return isCorrect;
    } catch (error: any) {
      console.error('快速检查失败:', error);
      const question = get().questions.find(q => q.id === questionId);
      if (question) {
        return userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
      }
      return false;
    }
  },
}));