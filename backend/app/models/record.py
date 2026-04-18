"""
LifePilot 记录模型
用于存储用户的生活记录（文字/语音）
"""

import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Float
from sqlalchemy.dialects.sqlite import JSON

from app.database import Base


class Record(Base):
    """生活记录表"""
    __tablename__ = "records"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 用户 ID (外键关联 users 表)
    user_id = Column(String(36), nullable=False, index=True)
    
    # 标题 (可选)
    title = Column(String(200), nullable=True)
    
    # 内容 (必填)
    content = Column(Text, nullable=False)
    
    # 分类: learning / finance / health
    category = Column(String(20), nullable=False, default="learning")
    
    # 标签列表 (JSON 格式存储)
    tags = Column(String(500), default='[]')
    
    # 音频 URL (可选，语音记录时使用)
    audio_url = Column(String(500), nullable=True)
    
    # AI 分类置信度 (0-1)
    confidence = Column(Float, default=1.0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Record(id={self.id}, user_id={self.user_id}, category={self.category})>"
    
    @property
    def tags_list(self) -> list:
        """获取标签列表"""
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @tags_list.setter
    def tags_list(self, value: list):
        """设置标签列表"""
        self.tags = json.dumps(value, ensure_ascii=False)
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "tags": self.tags_list,
            "audio_url": self.audio_url,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
