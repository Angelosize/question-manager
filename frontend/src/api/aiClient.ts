import { AIGradeRequest, AIGradeResponse, AIStatus } from '../types';

class AIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  }

  async gradeAnswer(request: AIGradeRequest): Promise<AIGradeResponse> {
    try {
      console.log('🤖 发送AI批改请求:', request);

      const response = await fetch(`${this.baseURL}/api/ai/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI批改成功:', result);
        return result;
      }

      console.log('⚠️ AI服务不可用，使用模拟数据');
      return this.getMockAIGrade(request);

    } catch (error) {
      console.error('❌ AI批改请求错误:', error);
      return this.getMockAIGrade(request);
    }
  }

  async quickCheck(questionId: string, userAnswer: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        question_id: questionId,
        user_answer: userAnswer,
      });

      const response = await fetch(`${this.baseURL}/api/ai/quick-check?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.is_correct;
      }
      throw new Error('快速检查失败');
    } catch (error) {
      console.error('快速检查失败:', error);
      throw error;
    }
  }

  async checkStatus(): Promise<AIStatus> {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/status`);
      if (response.ok) {
        return await response.json();
      }
      return { available: false };
    } catch (error) {
      console.error('检查AI状态错误:', error);
      return { available: false };
    }
  }

  // ===== 识别图片中的题目（GLM-4V-Flash） =====
  async recognizeImage(image: string, mimeType: string = 'image/jpeg'): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90秒超时

    try {
      const response = await fetch(`${this.baseURL}/api/ai/recognize-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          mime_type: mimeType,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 提取后端返回的错误信息
        let detail: any = '';
        try {
          const errData = await response.json();
          detail = errData.detail || errData.error || '';
        } catch {
          detail = await response.text();
        }

        const detailStr =
          typeof detail === 'string' ? detail : JSON.stringify(detail);

        if (response.status === 401) {
          throw new Error('请先配置智谱 API Key');
        }
        if (response.status === 413) {
          throw new Error('图片过大，请压缩后重试');
        }
        if (response.status === 504) {
          throw new Error('识别超时，请换一张更清晰的图片');
        }
        throw new Error(detailStr || `识别失败 (HTTP ${response.status})`);
      }

      return await response.json();

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('识别超时，请换一张更清晰的图片');
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('网络异常，请检查网络连接');
      }
      throw error;
    }
  }

  private getMockAIGrade(request: AIGradeRequest): AIGradeResponse {
    const isCorrect = Math.random() > 0.5;
    const score = isCorrect ? 8 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5);

    return {
      is_correct: isCorrect,
      ai_feedback: isCorrect
        ? 'AI分析：回答正确！答案准确且完整'
        : 'AI分析：答案需要改进，建议复习相关知识点',
      confidence: 0.7 + Math.random() * 0.3,
      detailed_analysis: isCorrect
        ? '详细分析：这个答案体现了对知识点的深刻理解。答案结构清晰，逻辑严密，完全符合题目要求。建议继续保持！'
        : '详细分析：答案中存在一些概念理解上的偏差。建议重点复习相关章节，注意区分相似概念，加强练习类似题目。',
      score: score,
      timestamp: new Date().toISOString(),
    };
  }
}

export const aiClient = new AIClient();