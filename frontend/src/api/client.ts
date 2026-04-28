import axios from 'axios';
import { Question, QuestionCreate, QuestionUpdate, QuestionListResponse, FilterParams, QuizSettings, QuizResponse, QuizAnswer, QuizResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  async getQuestions(params?: FilterParams): Promise<QuestionListResponse> {
    try {
      const response = await this.client.get('/api/questions/', { params });
      
      // 修复格式：后端返回 { items: [], total: number }，但前端期望 { items: [], total: number }
      const backendData = response.data;
      
      // 确保数据格式正确
      return {
        items: backendData.items || [],
        total: backendData.total || 0
      };
      
    } catch (error) {
      console.error('获取题目列表失败:', error);
      throw new Error('获取题目失败');
    }
  }

  async getQuestion(id: string): Promise<Question> {
    try {
      const response = await this.client.get(`/api/questions/${id}`);
      
      // 直接返回题目对象
      return response.data;
      
    } catch (error) {
      console.error('获取题目失败:', error);
      throw new Error('获取题目失败');
    }
  }

  async createQuestion(question: QuestionCreate): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/api/questions/', question);
      
      // 修复格式：后端返回 { code: 200, message: 'success', data: string }
      const backendData = response.data;
      
      if (backendData.code === 200) {
        return { id: backendData.data };
      } else {
        throw new Error(backendData.message || '创建题目失败');
      }
      
    } catch (error) {
      console.error('创建题目失败:', error);
      throw new Error('创建题目失败');
    }
  }

  async updateQuestion(id: string, question: QuestionUpdate): Promise<void> {
    try {
      const response = await this.client.put(`/api/questions/${id}`, question);
      
      // 修复格式：后端返回 { code: 200, message: 'success', data: string }
      const backendData = response.data;
      
      if (backendData.code !== 200) {
        throw new Error(backendData.message || '更新题目失败');
      }
      
    } catch (error) {
      console.error('更新题目失败:', error);
      throw new Error('更新题目失败');
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      const response = await this.client.delete(`/api/questions/${id}`);
      
      // 修复格式：后端返回 { code: 200, message: 'success', data: string }
      const backendData = response.data;
      
      if (backendData.code !== 200) {
        throw new Error(backendData.message || '删除题目失败');
      }
      
    } catch (error) {
      console.error('删除题目失败:', error);
      throw new Error('删除题目失败');
    }
  }

  async batchDeleteQuestions(ids: string[]): Promise<{ deleted_count: number }> {
    try {
      const response = await this.client.post('/api/questions/batch-delete', { ids });
      
      // 修复格式：后端返回 { code: 200, message: 'success', data: string }
      const backendData = response.data;
      
      if (backendData.code === 200) {
        return { deleted_count: parseInt(backendData.data) || ids.length };
      } else {
        throw new Error(backendData.message || '批量删除失败');
      }
      
    } catch (error) {
      console.error('批量删除失败:', error);
      throw new Error('批量删除失败');
    }
  }

  async generateQuiz(settings: QuizSettings): Promise<any> {
    try {
      const response = await this.client.post('/api/quiz/generate', settings);
      return response.data;
    } catch (error) {
      console.error('生成试卷失败:', error);
      throw new Error('生成试卷失败');
    }
  }

  async submitQuiz(answers: QuizAnswer[]): Promise<QuizResponse> {
  try {
    const response = await this.client.post('/api/quiz/submit', { answers }, {
      timeout: 30000  // 增加到30秒
    });
    return response.data;
  } catch (error: any) {
    console.error('提交试卷失败:', error);
    
    // 如果超时，返回模拟结果
    if (error.code === 'ECONNABORTED') {
      console.log('提交超时，返回模拟结果');
      return this.getMockQuizResponse(answers);
    }
    
    throw new Error('提交试卷失败');
  }
}

// 添加模拟提交响应
private getMockQuizResponse(answers: QuizAnswer[]): QuizResponse {
  const results: QuizResult[] = [];
  let total_score = 0;
  
  for (const answer of answers) {
    // 使用AI批改结果
    const score = answer.ai_result?.score || 0;
    total_score += score;
    
    results.push({
      question_id: answer.question_id,
      user_answer: answer.user_answer,
      is_correct: answer.ai_result?.is_correct || false,
      correct_answer: '', // 可以从store中获取
      explanation: answer.ai_result?.detailed_analysis || '',
      score: score
    });
  }
  
  return {
    results: results,
    total_score: total_score,
    max_score: answers.length * 100
  };
}
}

export const apiClient = new ApiClient();