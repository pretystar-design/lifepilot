"""
LifePilot 用户模型
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.dialects.sqlite import TEXT

from app.database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 手机号 (唯一标识)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    
    # 昵称 (可选，首次登录后设置)
    nickname = Column(String(50), nullable=True)
    
    # 头像 URL (可选)
    avatar_url = Column(String(500), nullable=True)
    
    # 微信 OpenID (可选，用于微信登录)
    openid = Column(String(100), unique=True, nullable=True, index=True)
    
    # 关注维度 (JSON 格式存储: ["learning", "finance", "health"])
    dimensions = Column(String(500), default='["learning", "finance", "health"]')
    
    # 是否完成首次设置 (昵称和关注维度)
    onboarding_completed = Column(Boolean, default=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<User(id={self.id}, phone={self.phone}, nickname={self.nickname})>"
