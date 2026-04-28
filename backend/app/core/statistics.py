from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from .data_manager import data_manager

class Statistics:
    def __init__(self):
        pass
    
    def get_subject_stats(self) -> List[Dict[str, Any]]:
        """获取学科分布统计"""
        subject_count = {}
        for q in data_manager.questions:
            subject = q.get('subject', '未分类')
            subject_count[subject] = subject_count.get(subject, 0) + 1
        
        return [{"subject": k, "count": v} for k, v in subject_count.items()]
    
    def get_type_stats(self) -> List[Dict[str, Any]]:
        """获取题型分布统计"""
        type_count = {}
        for q in data_manager.questions:
            q_type = q.get('type', '未分类')
            type_count[q_type] = type_count.get(q_type, 0) + 1
        
        return [{"type": k, "count": v} for k, v in type_count.items()]
    
    def get_difficulty_stats(self) -> List[Dict[str, Any]]:
        """获取难度分布统计"""
        difficulty_count = {}
        for q in data_manager.questions:
            difficulty = q.get('difficulty', '未分类')
            difficulty_count[difficulty] = difficulty_count.get(difficulty, 0) + 1
        
        return [{"difficulty": k, "count": v} for k, v in difficulty_count.items()]
    
    def get_trend_stats(self, months: int = 12) -> List[Dict[str, Any]]:
        """获取月度添加趋势统计"""
        monthly_data = {}
        for q in data_manager.questions:
            if q.get('created_time'):
                try:
                    # 提取年月部分
                    month = q['created_time'][:7]  # YYYY-MM
                    monthly_data[month] = monthly_data.get(month, 0) + 1
                except:
                    continue
        
        # 生成完整的月份序列
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * months)
        
        current = start_date
        all_months = []
        while current <= end_date:
            month_str = current.strftime("%Y-%m")
            all_months.append(month_str)
            # 下个月
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        # 填充缺失的月份
        result = []
        for month in all_months:
            result.append({"month": month, "count": monthly_data.get(month, 0)})
        
        return result[-months:]  # 返回指定月数的数据
    
    def get_wrong_mastered_stats(self) -> Dict[str, int]:
        """获取错题掌握情况统计"""
        mastered_count = sum(1 for wq in data_manager.wrong_questions if wq.get('mastered', False))
        not_mastered_count = len(data_manager.wrong_questions) - mastered_count
        
        return {
            "mastered": mastered_count,
            "not_mastered": not_mastered_count
        }
    
    def get_overview_stats(self) -> Dict[str, Any]:
        """获取概览统计信息"""
        total_questions = len(data_manager.questions)
        reviewed_count = sum(1 for q in data_manager.questions if q.get('review_count', 0) > 0)
        wrong_count = len(data_manager.wrong_questions)
        
        # 各学科题目数量
        subject_stats = {}
        for q in data_manager.questions:
            subject = q.get('subject', '未分类')
            subject_stats[subject] = subject_stats.get(subject, 0) + 1
        
        # 最近7天添加的题目
        recent_week_count = 0
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        for q in data_manager.questions:
            if q.get('created_time', '').startswith(week_ago):
                recent_week_count += 1
        
        return {
            "total_questions": total_questions,
            "reviewed_count": reviewed_count,
            "not_reviewed_count": total_questions - reviewed_count,
            "wrong_count": wrong_count,
            "recent_week_added": recent_week_count,
            "subject_distribution": subject_stats,
            "review_percentage": (reviewed_count / total_questions * 100) if total_questions > 0 else 0
        }
    
    def get_wrong_subject_stats(self) -> Dict[str, int]:
        """获取错题学科分布统计"""
        subject_stats = {}
        for wq in data_manager.wrong_questions:
            subject = wq['question_data'].get('subject', '未分类')
            subject_stats[subject] = subject_stats.get(subject, 0) + 1
        
        return subject_stats