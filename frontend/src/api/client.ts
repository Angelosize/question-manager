import axios from 'axios';
import { Question, QuestionCreate, QuestionUpdate, QuestionListResponse, FilterParams, QuizSettings, QuizResponse, QuizAnswer, QuizResult, PaperCompareData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 1000000,
    });
  }
  
  async getQuestions(params?: FilterParams): Promise<QuestionListResponse> {
    try {
      const response = await this.client.get('/api/questions/', { params });
      
      const backendData = response.data;
      
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
      return response.data;
    } catch (error) {
      console.error('获取题目失败:', error);
      throw new Error('获取题目失败');
    }
  }

  async createQuestion(question: QuestionCreate): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/api/questions/', question);
      
      console.log('📦 后端响应:', response.data);
      
      const backendData = response.data;
      
      if (backendData.id) {
        return { id: backendData.id };
      }
      
      if (backendData.code === 200 && backendData.data) {
        return { id: backendData.data };
      }
      
      if (typeof backendData === 'string') {
        return { id: backendData };
      }
      
      throw new Error(backendData.message || '创建题目失败');
      
    } catch (error: any) {
      console.error('创建题目失败:', error);
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('创建题目失败');
    }
  }

  async updateQuestion(id: string, question: QuestionUpdate): Promise<void> {
    try {
      const response = await this.client.put(`/api/questions/${id}`, question);
      
      const backendData = response.data;
      
      if (backendData.message || backendData.code === 200) {
        return;
      }
      
      throw new Error(backendData.message || '更新题目失败');
      
    } catch (error: any) {
      console.error('更新题目失败:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('更新题目失败');
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      const response = await this.client.delete(`/api/questions/${id}`);
      
      const backendData = response.data;
      
      if (backendData.message || backendData.code === 200) {
        return;
      }
      
      throw new Error(backendData.message || '删除题目失败');
      
    } catch (error: any) {
      console.error('删除题目失败:', error);
      if (error.response?.status === 409) {
        const detail = error.response?.data?.detail || '题目被其他数据引用，无法删除';
        throw new Error(detail);
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('删除题目失败');
    }
  }

  async batchDeleteQuestions(ids: string[]): Promise<{ deleted_count: number, conflicts?: Record<string, string> }> {
    try {
      const response = await this.client.post('/api/questions/batch-delete', ids);
      
      const backendData = response.data;
      
      if (backendData.code === 200) {
        const data = backendData.data || {};
        return {
          deleted_count: data.deleted_count || ids.length,
          conflicts: data.conflicts || {}
        };
      } else {
        throw new Error(backendData.message || '批量删除失败');
      }
      
    } catch (error: any) {
      console.error('批量删除失败:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
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

  // 同步提交（兼容）
  async submitQuiz(answers: QuizAnswer[]): Promise<QuizResponse> {
    try {
      const response = await this.client.post('/api/quiz/submit', { answers }, {
        timeout: 180000,
      });
      return response.data;
    } catch (error: any) {
      console.error('提交试卷失败:', error);
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        throw new Error(detail);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI 批改超时，请稍后重试');
      }
      throw new Error(error.message || '提交试卷失败');
    }
  }

  // ⭐ 异步提交（带进度）
  async submitQuizAsync(answers: QuizAnswer[]): Promise<{ task_id: string }> {
    try {
      const response = await this.client.post('/api/quiz/submit-async', { answers });
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      throw new Error(typeof detail === 'string' ? detail : '启动批改任务失败');
    }
  }

  // ⭐ 查询批改任务状态
  async getQuizSubmitStatus(taskId: string): Promise<any> {
    const response = await this.client.get(`/api/quiz/submit-status/${taskId}`);
    return response.data;
  }

  // ========== 错题本 API ==========
  async getWrongQuestions(params?: {
    mastered?: boolean;
    subject?: string;
    sort_by?: string;
  }): Promise<any[]> {
    try {
      const response = await this.client.get('/api/wrong/', { params });
      return response.data;
    } catch (error) {
      console.error('获取错题本失败:', error);
      throw new Error('获取错题本失败');
    }
  }

  async markWrongMastered(questionId: string): Promise<void> {
    try {
      await this.client.post(`/api/wrong/${questionId}/master`);
    } catch (error) {
      console.error('标记掌握失败:', error);
      throw new Error('标记掌握失败');
    }
  }

  async clearMasteredWrongs(): Promise<{ cleared_count: number }> {
    try {
      const response = await this.client.post('/api/wrong/clear-mastered');
      return response.data.data || { cleared_count: 0 };
    } catch (error) {
      console.error('清空已掌握错题失败:', error);
      throw new Error('清空已掌握错题失败');
    }
  }

  async generateWrongPaper(count: number = 10): Promise<Question[]> {
    try {
      const response = await this.client.post('/api/wrong/paper', null, { params: { count } });
      return response.data;
    } catch (error) {
      console.error('生成错题试卷失败:', error);
      throw new Error('生成错题试卷失败');
    }
  }

  async removeWrongQuestion(questionId: string): Promise<void> {
    try {
      await this.client.delete(`/api/wrong/${questionId}`);
    } catch (error) {
      console.error('移除错题失败:', error);
      throw new Error('移除错题失败');
    }
  }

  async getWrongStats(): Promise<any> {
    try {
      const response = await this.client.get('/api/wrong/stats');
      return response.data;
    } catch (error) {
      console.error('获取错题统计失败:', error);
      throw new Error('获取错题统计失败');
    }
  }

  async recognizeQuestion(text: string): Promise<any> {
    const response = await this.client.post('/api/ai/recognize', { text });
    return response.data;
  }

  async recognizeBatch(text: string): Promise<any> {
    try {
      const response = await this.client.post('/api/ai/recognize-batch', { text }, {
        timeout: 180000
      });
      return response.data;
    } catch (error) {
      console.error('AI批量识别失败:', error);
      throw error;
    }
  }

  // ===== 卷子管理 API =====
  async getPapers(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/papers');
      return response.data;
    } catch (error) {
      console.error('获取卷子列表失败:', error);
      throw new Error('获取卷子列表失败');
    }
  }

  async createPaper(paper: any): Promise<{ id: string }> {
    try {
      const response = await this.client.post('/api/papers', paper);
      return response.data;
    } catch (error) {
      console.error('创建卷子失败:', error);
      throw new Error('创建卷子失败');
    }
  }

  async getPaper(id: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/papers/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取卷子详情失败:', error);
      throw new Error('获取卷子详情失败');
    }
  }

  async updatePaper(id: string, data: any): Promise<void> {
    try {
      await this.client.put(`/api/papers/${id}`, data);
    } catch (error) {
      console.error('更新卷子失败:', error);
      throw new Error('更新卷子失败');
    }
  }

  async deletePaper(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/papers/${id}`);
    } catch (error) {
      console.error('删除卷子失败:', error);
      throw new Error('删除卷子失败');
    }
  }

  async generateQuizFromPaper(paperId: string): Promise<any[]> {
    try {
      const response = await this.client.post(`/api/papers/${paperId}/generate-quiz`);
      return response.data;
    } catch (error) {
      console.error('从卷子生成试卷失败:', error);
      throw new Error('从卷子生成试卷失败');
    }
  }

  async importPaperByAI(text: string): Promise<any> {
    try {
      const response = await this.client.post('/api/papers/import-ai', { text }, {
        timeout: 180000
      });
      return response.data;
    } catch (error) {
      console.error('AI导入卷子失败:', error);
      throw new Error('AI导入卷子失败');
    }
  }

  // ===== 卷子对比 API =====
  async getPaperCompare(paperName: string, years?: number[]): Promise<PaperCompareData> {
    const params: any = { paper_name: paperName };
    if (years && years.length > 0) {
      params.years = years.join(',');
    }
    const response = await this.client.get('/api/paper-compare', { params });
    return response.data;
  }

  async listPaperNames(): Promise<string[]> {
    const response = await this.client.get('/api/paper-compare/list-papers');
    return response.data.papers;
  }

  async batchDeletePapers(ids: string[]): Promise<{ deleted_count: number, failed_ids: string[] }> {
    try {
      const response = await this.client.post('/api/papers/batch-delete', ids);
      const backendData = response.data;
      if (backendData.code === 200) {
        const data = backendData.data || {};
        return {
          deleted_count: data.deleted_count || ids.length,
          failed_ids: data.failed_ids || []
        };
      } else {
        throw new Error(backendData.message || '批量删除卷子失败');
      }
    } catch (error: any) {
      console.error('批量删除卷子失败:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('批量删除卷子失败');
    }
  }

  // ===== 导出卷子为 HTML（带参数） =====
  async exportPaperHTML(
    paperId: string,
    options?: {
      show_answer?: boolean;
      show_explanation?: boolean;
      show_knowledge?: boolean;
      show_score?: boolean;
      answer_position?: 'inline' | 'end';
    }
  ): Promise<string> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.show_answer !== undefined) params.append('show_answer', String(options.show_answer));
        if (options.show_explanation !== undefined) params.append('show_explanation', String(options.show_explanation));
        if (options.show_knowledge !== undefined) params.append('show_knowledge', String(options.show_knowledge));
        if (options.show_score !== undefined) params.append('show_score', String(options.show_score));
        if (options.answer_position) params.append('answer_position', options.answer_position);
      }
      const url = `/api/papers/${paperId}/export/html?${params.toString()}`;
      const response = await this.client.get(url, { responseType: 'text' });
      return response.data;
    } catch (error) {
      console.error('导出 HTML 失败:', error);
      throw new Error('导出试卷失败');
    }
  }

  // ===== 导出卷子为 Word =====
  async exportPaperDocx(
    paperId: string,
    options?: {
      show_answer?: boolean;
      show_explanation?: boolean;
      show_knowledge?: boolean;
      show_score?: boolean;
      answer_position?: 'inline' | 'end';
    }
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.show_answer !== undefined) params.append('show_answer', String(options.show_answer));
        if (options.show_explanation !== undefined) params.append('show_explanation', String(options.show_explanation));
        if (options.show_knowledge !== undefined) params.append('show_knowledge', String(options.show_knowledge));
        if (options.show_score !== undefined) params.append('show_score', String(options.show_score));
        if (options.answer_position) params.append('answer_position', options.answer_position);
      }
      const url = `/api/papers/${paperId}/export/docx?${params.toString()}`;
      const response = await this.client.get(url, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('导出 Word 失败:', error);
      throw new Error('导出 Word 失败');
    }
  }

  // ===== 从图片导入试卷（同步） =====
  async importPaperByImage(image: string, mimeType: string = 'image/jpeg'): Promise<any> {
    try {
      const response = await this.client.post('/api/papers/import-image', {
        image,
        mime_type: mimeType,
      }, {
        timeout: 120000,
      });
      return response.data;
    } catch (error: any) {
      console.error('图片导入卷子失败:', error);
      if (error.response?.data?.detail) {
        throw new Error(
          typeof error.response.data.detail === 'string'
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail)
        );
      }
      throw new Error(error.message || '图片导入失败');
    }
  }

  // ===== 异步导入（文本） =====
  async importPaperByAIAsync(text: string): Promise<{ task_id: string }> {
    try {
      const response = await this.client.post('/api/papers/import-ai-async', { text });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || '启动任务失败');
    }
  }

  // ===== 异步导入（图片，支持多页） =====
  async importPaperByImageAsync(
    images: string | string[],
    mimeType: string = 'image/jpeg'
  ): Promise<{ task_id: string; message?: string }> {
    try {
      const imgArr = Array.isArray(images) ? images : [images];
      const mimeArr = Array(imgArr.length).fill(mimeType);

      const response = await this.client.post(
        '/api/papers/import-image-async',
        {
          images: imgArr,
          mime_types: mimeArr,
        },
        { timeout: 60000 }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || '启动任务失败');
    }
  }

  // ===== 查询任务进度 =====
  async getImportStatus(taskId: string): Promise<any> {
    const response = await this.client.get(`/api/papers/import-status/${taskId}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();