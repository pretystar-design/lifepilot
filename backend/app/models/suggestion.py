"""
LifePilot 建议模型
用于存储 AI 生成的生活建议
"""

import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer

from app.database import Base


class Suggestion(Base):
    """AI 建议表"""
    __tablename__ = "suggestions"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 用户 ID (外键关联 users 表)
    user_id = Column(String(36), nullable=False, index=True)
    
    # 建议所属日期 (用于每日一次限制)
    date = Column(String(10), nullable=False, index=True)  # 格式: YYYY-MM-DD
    
    # 维度: learning / finance / health
    dimension = Column(String(20), nullable=False, index=True)
    
    # 建议内容
    content = Column(Text, nullable=False)
    
    # 建议优先级 (1-3)
    priority = Column(Integer, default=1)
    
    # 用户反馈: null / helpful / not_helpful
    feedback = Column(String(20), nullable=True)
    
    # 反馈时间
    feedback_at = Column(DateTime, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Suggestion(id={self.id}, user_id={self.user_id}, dimension={self.dimension})>"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date,
            "dimension": self.dimension,
            "content": self.content,
            "priority": self.priority,
            "feedback": self.feedback,
            "feedback_at": self.feedback_at.isoformat() if self.feedback_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
