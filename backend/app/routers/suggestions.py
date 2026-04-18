"""
LifePilot 建议管理路由
处理 AI 建议的生成、获取、反馈
"""

import uuid
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func

from app.database import get_db
from app.models.suggestion import Suggestion
from app.models.record import Record
from app.models.user import User
from app.schemas.suggestion import (
    SuggestionResponse, TodaySuggestionsResponse, SuggestionHistoryResponse,
    SuggestionHistoryItem, FeedbackRequest, GenerateResponse, SuggestionGroup
)
from app.utils.auth import get_current_user
from app.services.ai_service import generate_suggestions, DIMENSION_CONFIG

router = APIRouter(prefix="/api/suggestions", tags=["建议管理"])


def get_today_date() -> str:
    """获取今天的日期字符串"""
    return datetime.now().strftime("%Y-%m-%d")


def get_user_dimensions(user: User) -> list:
    """获取用户关注的维度"""
    try:
        import json
        return json.loads(user.dimensions)
    except:
        return ["learning", "finance", "health"]


def group_suggestions_by_dimension(suggestions: list, dimensions: list) -> list:
    """将建议按维度分组"""
    groups = []
    
    for dim in dimensions:
        dim_suggestions = [s for s in suggestions if s.dimension == dim]
        if dim_suggestions:
            config = DIMENSION_CONFIG.get(dim, {"label": dim, "icon": "📝"})
            groups.append(SuggestionGroup(
                dimension=dim,
                dimension_label=config["label"],
                icon=config["icon"],
                suggestions=[
                    SuggestionResponse(
                        id=s.id,
                        user_id=s.user_id,
                        date=s.date,
                        dimension=s.dimension,
                        content=s.content,
                        priority=s.priority,
                        feedback=s.feedback,
                        feedback_at=s.feedback_at,
                        created_at=s.created_at
                    )
                    for s in dim_suggestions
                ]
            ))
    
    return groups


@router.post("/generate", response_model=GenerateResponse)
async def generate_today_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    生成今日建议
    每天只生成一次，如果今日已有建议则返回现有建议
    """
    today = get_today_date()
    
    # 检查今日是否已有建议
    existing = db.query(Suggestion).filter(
        and_(
            Suggestion.user_id == current_user.id,
            Suggestion.date == today
        )
    ).first()
    
    if existing:
        return GenerateResponse(
            success=True,
            message="今日建议已生成",
            suggestions=[]
        )
    
    # 获取用户最近7天的记录
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    records = db.query(Record).filter(
        and_(
            Record.user_id == current_user.id,
            Record.created_at >= week_ago
        )
    ).all()
    
    # 转换为字典格式
    records_data = [
        {
            "id": r.id,
            "content": r.content,
            "category": r.category,
            "tags": r.tags_list if hasattr(r, 'tags_list') else [],
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in records
    ]
    
    # 获取用户关注的维度
    user_dimensions = get_user_dimensions(current_user)
    
    # 生成建议
    suggestions_data = await generate_suggestions(records_data, user_dimensions)
    
    # 保存建议到数据库
    saved_suggestions = []
    for sg in suggestions_data:
        suggestion = Suggestion(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            date=today,
            dimension=sg["dimension"],
            content=sg["content"],
            priority=sg.get("priority", 1)
        )
        db.add(suggestion)
        saved_suggestions.append(suggestion)
    
    db.commit()
    
    # 返回保存的建议
    return GenerateResponse(
        success=True,
        message=f"成功生成 {len(saved_suggestions)} 条建议",
        suggestions=[
            SuggestionResponse(
                id=s.id,
                user_id=s.user_id,
                date=s.date,
                dimension=s.dimension,
                content=s.content,
                priority=s.priority,
                feedback=s.feedback,
                feedback_at=s.feedback_at,
                created_at=s.created_at
            )
            for s in saved_suggestions
        ]
    )


@router.get("/today", response_model=TodaySuggestionsResponse)
async def get_today_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取今日建议
    """
    today = get_today_date()
    
    # 获取今日建议
    suggestions = db.query(Suggestion).filter(
        and_(
            Suggestion.user_id == current_user.id,
            Suggestion.date == today
        )
    ).order_by(Suggestion.dimension, Suggestion.priority).all()
    
    # 获取用户关注的维度
    user_dimensions = get_user_dimensions(current_user)
    
    # 按维度分组
    groups = group_suggestions_by_dimension(suggestions, user_dimensions)
    
    return TodaySuggestionsResponse(
        date=today,
        has_suggestions=len(suggestions) > 0,
        suggestions_by_dimension=groups,
        total_count=len(suggestions)
    )


@router.get("/history", response_model=SuggestionHistoryResponse)
async def get_suggestion_history(
    days: int = Query(7, ge=1, le=30, description="获取最近天数"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取建议历史
    """
    # 计算日期范围
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 获取该时间段内的所有建议
    suggestions = db.query(Suggestion).filter(
        and_(
            Suggestion.user_id == current_user.id,
            Suggestion.date >= start_date.strftime("%Y-%m-%d"),
            Suggestion.date <= end_date.strftime("%Y-%m-%d")
        )
    ).order_by(desc(Suggestion.date), Suggestion.dimension, Suggestion.priority).all()
    
    # 按日期分组
    history_by_date = {}
    for s in suggestions:
        if s.date not in history_by_date:
            history_by_date[s.date] = []
        history_by_date[s.date].append(s)
    
    # 构建历史列表
    history = []
    for date in sorted(history_by_date.keys(), reverse=True):
        date_suggestions = history_by_date[date]
        helpful = sum(1 for s in date_suggestions if s.feedback == "helpful")
        not_helpful = sum(1 for s in date_suggestions if s.feedback == "not_helpful")
        
        history.append(SuggestionHistoryItem(
            date=date,
            total_count=len(date_suggestions),
            helpful_count=helpful,
            not_helpful_count=not_helpful,
            suggestions=[
                SuggestionResponse(
                    id=s.id,
                    user_id=s.user_id,
                    date=s.date,
                    dimension=s.dimension,
                    content=s.content,
                    priority=s.priority,
                    feedback=s.feedback,
                    feedback_at=s.feedback_at,
                    created_at=s.created_at
                )
                for s in date_suggestions
            ]
        ))
    
    return SuggestionHistoryResponse(
        history=history,
        total_days=len(history)
    )


@router.post("/{suggestion_id}/feedback")
async def submit_feedback(
    suggestion_id: str,
    feedback_data: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    提交建议反馈
    """
    # 验证反馈值
    if feedback_data.feedback not in ["helpful", "not_helpful"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="反馈值必须是 helpful 或 not_helpful"
        )
    
    # 查找建议
    suggestion = db.query(Suggestion).filter(
        and_(
            Suggestion.id == suggestion_id,
            Suggestion.user_id == current_user.id
        )
    ).first()
    
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="建议不存在"
        )
    
    # 更新反馈
    suggestion.feedback = feedback_data.feedback
    suggestion.feedback_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "message": "反馈已提交"}


@router.get("/{suggestion_id}", response_model=SuggestionResponse)
async def get_suggestion(
    suggestion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取单条建议详情
    """
    suggestion = db.query(Suggestion).filter(
        and_(
            Suggestion.id == suggestion_id,
            Suggestion.user_id == current_user.id
        )
    ).first()
    
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="建议不存在"
        )
    
    return SuggestionResponse(
        id=suggestion.id,
        user_id=suggestion.user_id,
        date=suggestion.date,
        dimension=suggestion.dimension,
        content=suggestion.content,
        priority=suggestion.priority,
        feedback=suggestion.feedback,
        feedback_at=suggestion.feedback_at,
        created_at=suggestion.created_at
    )
