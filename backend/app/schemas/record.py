"""
LifePilot 记录相关 Schema 定义
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class RecordBase(BaseModel):
    """记录基础 Schema"""
    title: Optional[str] = Field(None, max_length=200, description="标题(可选)")
    content: str = Field(..., min_length=1, description="内容(必填)")
    category: Optional[str] = Field(None, description="分类: learning/finance/health")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")


class RecordCreate(RecordBase):
    """创建记录的请求 Schema"""
    audio_url: Optional[str] = Field(None, description="音频URL(语音记录时)")
    confidence: Optional[float] = Field(1.0, ge=0.0, le=1.0, description="AI分类置信度")


class RecordUpdate(BaseModel):
    """更新记录的请求 Schema"""
    title: Optional[str] = Field(None, max_length=200, description="标题")
    content: Optional[str] = Field(None, min_length=1, description="内容")
    category: Optional[str] = Field(None, description="分类: learning/finance/health")
    tags: Optional[List[str]] = Field(None, description="标签列表")
    audio_url: Optional[str] = Field(None, description="音频URL")


class ClassifyRequest(BaseModel):
    """AI 分类请求 Schema"""
    content: str = Field(..., min_length=1, description="待分类内容")


class ClassifyResponse(BaseModel):
    """AI 分类响应 Schema"""
    category: str = Field(..., description="分类: learning/finance/health")
    tags: List[str] = Field(default_factory=list, description="推荐标签列表")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度")
    need_manual: bool = Field(False, description="是否需要手动确认")


class TranscribeResponse(BaseModel):
    """语音转文字响应 Schema"""
    text: str = Field(..., description="转写文字")
    duration: Optional[float] = Field(None, description="音频时长(秒)")


class RecordResponse(BaseModel):
    """记录响应 Schema"""
    id: str
    user_id: str
    title: Optional[str] = None
    content: str
    category: str
    tags: List[str] = Field(default_factory=list)
    audio_url: Optional[str] = None
    confidence: float = 1.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RecordListResponse(BaseModel):
    """记录列表响应 Schema"""
    records: List[RecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApiResponse(BaseModel):
    """通用 API 响应"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[dict] = None
