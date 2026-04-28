from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import time
from collections import defaultdict

from app.core.data_manager import data_manager
from app.models.stats import (
    WrongQuestionAnalytics, SubjectDistribution, QuestionTypeDistribution,
    TrendDataPoint, WeaknessTopic, CommonMistake, AnalyticsTimeRange,
    AnalyticsResponse, ImprovementSuggestion
)

router = APIRouter()

@router.get("/wrong-analytics/overview", response_model=AnalyticsResponse)
async def get_wrong_analytics_overview():
    """获取错题统计概览"""
    start_time = time.time()
    
    try:
        # 加载数据
        wrong_questions = await data_manager.load_wrong_questions()
        all_questions = await data_manager.load_questions()
        
        if not wrong_questions:
            return AnalyticsResponse(
                success=True,
                data=WrongQuestionAnalytics(
                    total_wrong_questions=0,
                    unique_wrong_questions=0,
                    average_wrong_per_question=0,
                    by_subject=[],
                    by_question_type=[],
                    by_difficulty={},
                    trend_last_30_days=[],
                    weakest_topics=[],
                    common_mistakes=[],
                    generated_at=datetime.now(),
                    time_range=AnalyticsTimeRange(
                        start_date=(datetime.now() - timedelta(days=30)).isoformat(),
                        end_date=datetime.now().isoformat()
                    )
                ),
                processing_time=time.time() - start_time
            )
        
        # 计算基础统计 - 适配嵌套数据结构
        total_wrong = sum(item.get('wrong_count', 1) for item in wrong_questions)
        unique_wrong = len(wrong_questions)
        avg_wrong_per_question = total_wrong / unique_wrong if unique_wrong > 0 else 0
        
        # 学科分布 - 从嵌套的question_data中提取
        subject_distribution = defaultdict(int)
        for item in wrong_questions:
            question_data = item.get('question_data', {})
            subject = question_data.get('subject', '其他')
            subject_distribution[subject] += item.get('wrong_count', 1)
        
        subject_distributions = []
        total_wrong_count = sum(subject_distribution.values())
        for subject, wrong_count in subject_distribution.items():
            subject_distributions.append(SubjectDistribution(
                subject=subject,
                count=wrong_count,
                percentage=round(wrong_count / total_wrong_count * 100, 2) if total_wrong_count > 0 else 0
            ))
        
        # 题型分布
        type_distribution = defaultdict(int)
        type_total_questions = defaultdict(int)
        
        for item in wrong_questions:
            question_data = item.get('question_data', {})
            question_type = question_data.get('type', '未知')
            type_distribution[question_type] += item.get('wrong_count', 1)
        
        for question in all_questions:
            question_type = question.get('type', '未知')
            type_total_questions[question_type] += 1
        
        question_type_distributions = []
        for question_type, wrong_count in type_distribution.items():
            total_questions = type_total_questions.get(question_type, 1)
            error_rate = round(wrong_count / total_questions * 100, 2) if total_questions > 0 else 0
            question_type_distributions.append(QuestionTypeDistribution(
                question_type=question_type,
                count=wrong_count,
                error_rate=error_rate
            ))
        
        # 难度分布
        difficulty_distribution = defaultdict(int)
        for item in wrong_questions:
            question_data = item.get('question_data', {})
            difficulty = question_data.get('difficulty', '未知')
            difficulty_distribution[difficulty] += item.get('wrong_count', 1)
        
        # 计算难度错误率
        difficulty_error_rates = {}
        total_difficulty_questions = defaultdict(int)
        for question in all_questions:
            difficulty = question.get('difficulty', '未知')
            total_difficulty_questions[difficulty] += 1
        
        for difficulty, wrong_count in difficulty_distribution.items():
            total_questions = total_difficulty_questions.get(difficulty, 1)
            error_rate = round(wrong_count / total_questions * 100, 2) if total_questions > 0 else 0
            difficulty_error_rates[difficulty] = error_rate
        
        # 时间趋势 - 基于user_answers中的时间戳
        trend_data = []
        today = datetime.now()
        
        for i in range(30):
            date = today - timedelta(days=29 - i)
            date_str = date.strftime('%Y-%m-%d')
            
            daily_count = 0
            subject_daily = defaultdict(int)
            
            # 遍历所有错题的用户答案
            for item in wrong_questions:
                user_answers = item.get('user_answers', [])
                for answer in user_answers:
                    answer_time = answer.get('time', '')
                    if answer_time.startswith(date_str):
                        daily_count += 1
                        # 按学科统计
                        question_data = item.get('question_data', {})
                        subject = question_data.get('subject', '其他')
                        subject_daily[subject] += 1
            
            trend_data.append(TrendDataPoint(
                date=date_str,
                count=daily_count,
                subjects=dict(subject_daily)
            ))
        
        # 薄弱知识点分析
        weakest_topics = []
        common_mistakes = []
        
        # 分析最常见的错误答案
        mistake_patterns = defaultdict(int)
        for item in wrong_questions:
            user_answers = item.get('user_answers', [])
            question_data = item.get('question_data', {})
            correct_answer = question_data.get('answer', '')
            
            for answer in user_answers:
                user_answer = answer.get('answer', '')
                if user_answer and user_answer != correct_answer:
                    mistake_patterns[user_answer] += 1
        
        # 获取最常见的错误模式
        for mistake, count in sorted(mistake_patterns.items(), key=lambda x: x[1], reverse=True)[:5]:
            common_mistakes.append(CommonMistake(
                pattern=mistake,
                frequency=count,
                example_questions=["相关题目示例"]
            ))
        
        # 构建完整响应
        analytics_data = WrongQuestionAnalytics(
            total_wrong_questions=total_wrong,
            unique_wrong_questions=unique_wrong,
            average_wrong_per_question=round(avg_wrong_per_question, 2),
            by_subject=subject_distributions,
            by_question_type=question_type_distributions,
            by_difficulty=difficulty_error_rates,
            trend_last_30_days=trend_data,
            weakest_topics=weakest_topics,
            common_mistakes=common_mistakes,
            generated_at=datetime.now(),
            time_range=AnalyticsTimeRange(
                start_date=(datetime.now() - timedelta(days=30)).isoformat(),
                end_date=datetime.now().isoformat()
            )
        )
        
        return AnalyticsResponse(
            success=True,
            data=analytics_data,
            processing_time=time.time() - start_time
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return AnalyticsResponse(
            success=False,
            error=f"分析错误: {str(e)}",
            processing_time=time.time() - start_time
        )

@router.get("/wrong-analytics/weaknesses")
async def identify_weaknesses():
    """识别薄弱知识点"""
    try:
        wrong_questions = await data_manager.load_wrong_questions()
        
        weaknesses = []
        knowledge_point_errors = defaultdict(int)
        knowledge_point_total = defaultdict(int)
        
        for item in wrong_questions:
            question_data = item.get('question_data', {})
            knowledge_points = question_data.get('knowledge_points', [])
            if not knowledge_points:
                knowledge_points = [question_data.get('subject', '通用')]
            
            for point in knowledge_points:
                knowledge_point_errors[point] += item.get('wrong_count', 1)
                knowledge_point_total[point] += 1
        
        for point, error_count in knowledge_point_errors.items():
            total = knowledge_point_total.get(point, 1)
            error_rate = round(error_count / total * 100, 2)
            
            weaknesses.append(WeaknessTopic(
                topic=point,
                wrong_count=error_count,
                total_questions=total,
                error_rate=error_rate,
                improvement_suggestions=[
                    f"加强{point}相关练习",
                    "重点复习相关概念",
                    "多做类似题目"
                ]
            ))
        
        # 按错误率排序
        weaknesses.sort(key=lambda x: x.error_rate, reverse=True)
        
        return {
            "success": True,
            "weaknesses": weaknesses[:10]  # 返回前10个薄弱点
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/wrong-analytics/improvement-suggestions")
async def get_improvement_suggestions():
    """获取改进建议"""
    try:
        wrong_questions = await data_manager.load_wrong_questions()
        
        if not wrong_questions:
            return {
                "success": True,
                "suggestions": ["暂无错题数据，继续保持！"]
            }
        
        # 分析学科分布
        subject_errors = defaultdict(int)
        for item in wrong_questions:
            question_data = item.get('question_data', {})
            subject = question_data.get('subject', '其他')
            subject_errors[subject] += item.get('wrong_count', 1)
        
        suggestions = []
        
        # 根据错误分布生成建议
        if subject_errors:
            worst_subject = max(subject_errors.items(), key=lambda x: x[1])
            suggestions.append(f"重点加强{worst_subject[0]}的学习，该学科错误次数最多")
        
        # 时间分布建议
        time_based_errors = defaultdict(int)
        for item in wrong_questions:
            user_answers = item.get('user_answers', [])
            for answer in user_answers:
                answer_time = answer.get('time', '')
                if answer_time:
                    hour = datetime.strptime(answer_time, '%Y-%m-%d %H:%M:%S').hour
                    time_based_errors[hour] += 1
        
        if time_based_errors:
            worst_hour = max(time_based_errors.items(), key=lambda x: x[1])
            suggestions.append(f"注意{worst_hour}时段的学习状态，错误率较高")
        
        return {
            "success": True,
            "suggestions": suggestions
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }