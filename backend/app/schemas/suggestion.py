"""
LifePilot 建议相关 Schema 定义
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SuggestionBase(BaseModel):
    """建议基础 Schema"""
    dimension: str = Field(..., description="维度: learning/finance/health")
    content: str = Field(..., description="建议内容")
    priority: int = Field(1, ge=1, le=3, description="优先级 1-3")


class SuggestionResponse(BaseModel):
    """建议响应 Schema"""
    id: str
    user_id: str
    date: str
    dimension: str
    content: str
    priority: int = 1
    feedback: Optional[str] = None
    feedback_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class SuggestionGroup(BaseModel):
    """按维度分组的建议"""
    dimension: str
    dimension_label: str
    icon: str
    suggestions: List[SuggestionResponse]


class TodaySuggestionsResponse(BaseModel):
    """今日建议响应 Schema"""
    date: str
    has_suggestions: bool
    suggestions_by_dimension: List[SuggestionGroup]
    total_count: int


class SuggestionHistoryItem(BaseModel):
    """建议历史项"""
    date: str
    total_count: int
    helpful_count: int
    not_helpful_count: int
    suggestions: List[SuggestionResponse]


class SuggestionHistoryResponse(BaseModel):
    """建议历史响应 Schema"""
    history: List[SuggestionHistoryItem]
    total_days: int


class FeedbackRequest(BaseModel):
    """反馈请求 Schema"""
    feedback: str = Field(..., description="反馈: helpful/not_helpful")


class GenerateResponse(BaseModel):
    """生成建议响应 Schema"""
    success: bool
    message: str
    suggestions: List[SuggestionResponse] = []
