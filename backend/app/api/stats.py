from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.data_manager import data_manager
from app.core.statistics import Statistics
from app.models.stats import (
    SubjectStats, TypeStats, DifficultyStats, 
    TrendStats, WrongMasteredStats
)
from app.models.common import SuccessResponse

router = APIRouter()
stats_processor = Statistics()

@router.get("/subject", response_model=List[SubjectStats])
async def get_subject_stats():
    """获取学科分布统计"""
    try:
        return stats_processor.get_subject_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取学科统计失败: {str(e)}")

@router.get("/type", response_model=List[TypeStats])
async def get_type_stats():
    """获取题型分布统计"""
    try:
        return stats_processor.get_type_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取题型统计失败: {str(e)}")

@router.get("/difficulty", response_model=List[DifficultyStats])
async def get_difficulty_stats():
    """获取难度分布统计"""
    try:
        return stats_processor.get_difficulty_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取难度统计极败: {str(e)}")

@router.get("/trend", response_model=List[TrendStats])
async def get_trend_stats(months: int = 12):
    """获取月度添加趋势统计"""
    try:
        return stats_processor.get_trend_stats(months)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取趋势统计失败: {str(e)}")

@router.get("/wrong-mastered", response_model=WrongMasteredStats)
async def get_wrong_mastered_stats():
    """获取错题掌握情况统计"""
    try:
        return stats_processor.get_wrong_mastered_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取错题掌握统计失败: {str(e)}")

@router.get("/overview", response_model=Dict[str, Any])
async def get_overview_stats():
    """获取概览统计信息"""
    try:
        return stats_processor.get_overview_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取概览统计失败: {str(e)}")