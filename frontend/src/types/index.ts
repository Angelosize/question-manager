import { DrawingData } from './geometry';
export interface Question {
  id: string;
  subject: string;
  type: string;
  content: string;
  answer: string;
  difficulty?: string;
  options?: Record<string, string>;
  explanation?: string;
  knowledge_points?: string;
  chapter?: string;
  tags?: string[];
  source?: string;      // 原有题目来源（录入来源）
  note?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  exam?: ExamInfo | null;
  drawing?: DrawingData | null;  // 新增
  original_image?: string | null;
}

export interface QuestionCreate {
  subject: string;
  type: string;
  content: string;
  answer: string;
  difficulty?: string;
  options?: Record<string, string>;
  explanation?: string;
  knowledge_points?: string;
  chapter?: string;
  tags?: string[];
  source?: string;
  note?: string;
  status?: string;
  // 新增考试归属字段（选填）
  exam_name?: string;
  year?: number;
  number?: number;
  score?: number;
  exam_source?: string; 
  drawing?: DrawingData | null;  // 试卷全称（避免与 source 混淆）
  original_image?: string | null;   // ⭐ 新增
}

export interface QuestionUpdate {
  subject?: string;
  type?: string;
  content?: string;
  answer?: string;
  difficulty?: string;
  options?: Record<string, string>;
  explanation?: string;
  knowledge_points?: string;
  chapter?: string;
  tags?: string[];
  source?: string;
  note?: string;
  status?: string;
  drawing?: DrawingData | null;
  original_image?: string | null;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  subject?: string;
  type?: string;
  difficulty?: string;
  tag?: string;
  keyword?: string;
  status?: string;
}

export interface QuestionListResponse {
  items: Question[];
  total: number;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface AIGradeRequest {
  question_id: string;
  user_answer: string;
}

export interface AIGradeResponse {
  is_correct: boolean;
  ai_feedback: string;
  confidence: number;
  detailed_analysis: string;
  score: number;
  timestamp: string;
}

export interface QuickCheckResponse {
  is_correct: boolean;
}

export interface AIStatus {
  [key: string]: any;
}

export interface QuizSettings {
  subjects?: string[];
  types?: string[];
  difficulty_distribution?: Record<string, number>;
  count: number;
  include_reviewed?: boolean;
  include_wrong?: boolean;
}

export interface QuizQuestion extends Question {
  user_answer?: string;
  is_correct?: boolean;
  score?: number;
  drawing?: DrawingData | null;
  duration?: number; 
}

export interface QuizAnswer {
  question_id: string;
  user_answer: string;
  full_score?: number;          // ⭐ 新增：该题满分
  ai_result?: {
    is_correct?: boolean;
    score?: number;
    ai_feedback?: string;
    detailed_analysis?: string;
  };
}

export interface QuizResult {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  score: number;                // 实际得分（0 ~ full_score）
  full_score?: number;          // ⭐ 新增：该题满分
  ai_score_pct?: number;        // ⭐ 新增：AI 评分百分比（0~100）
  ai_feedback?: string;
  detailed_analysis?: string;
}

export interface QuizResponse {
  results: QuizResult[];
  total_score: number;
  max_score: number;
}

export interface WrongQuestion {
  id: string;
  question_id: string;
  question: Question;
  wrong_count: number;
  last_wrong_time: string;
  mastered: boolean;
  mastered_time?: string;
}

export interface SubjectStats {
  subject: string;
  count: number;
  correct_count: number;
  accuracy: number;
}

export interface TypeStats {
  type: string;
  count: number;
  correct_count: number;
  accuracy: number;
}

export interface DifficultyStats {
  difficulty: string;
  count: number;
  correct_count: number;
  accuracy: number;
}

export interface TrendStats {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface WrongMasteredStats {
  mastered: number;
  not_mastered: number;
  total: number;
}

export interface OverviewStats {
  total_questions: number;
  reviewed_count: number;
  not_reviewed_count: number;
  wrong_count: number;
  mastered_count: number;
  total_quizzes: number;
  average_score: number;
}

export interface ExamInfo {
  exam_name?: string;
  year?: number;
  number?: number;
  score?: number;
  source?: string;      // 试卷全称，如“鞍山市2023年中考数学卷”
  exam_type?: string;   // 如“真题”（可选）
}

// ===== 卷子管理 =====
export interface PaperQuestion {
  question_id: string;
  number: number;
  score: number;
}

export interface Paper {
  id: string;
  name: string;
  subject: string;
  year: number;
  duration?: number;          // ⭐ 考试时长（分钟）
  total_score: number;
  question_count: number;
  questions: PaperQuestion[];
  created_time: string;
  updated_time?: string;
}

export interface PaperCreate {
  name: string;
  subject: string;
  year: number;
  duration?: number;          // ⭐ 新增
  questions: PaperQuestion[];
}

// ===== 卷子对比 =====
export interface PaperCompareData {
  paper_name: string;
  years: number[];
  total_questions: number;
  kp_stats: Record<number, Record<string, number>>;
  type_stats: Record<number, Record<string, number>>;
  number_stats: Record<number, Record<number, number>>;
  heatmap: {
    years: number[];
    knowledge_points: string[];
    data: Array<Record<string, any>>; // 每行 { year: number, kp1: count, kp2: count, ... }
  };
}

export interface PaperNameList {
  papers: string[];
}