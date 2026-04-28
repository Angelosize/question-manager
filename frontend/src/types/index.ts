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
  source?: string;
  note?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
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
}

export interface QuizAnswer {
  question_id: string;
  user_answer: string;
  ai_result?: AIGradeResponse;
}

export interface QuizResult {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  score: number;
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