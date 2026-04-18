"""
LifePilot 认证工具
JWT Token 验证和验证码处理
"""

import json
import random
from typing import Optional
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.config import verify_token, settings


# ============ 验证码存储 (开发阶段使用内存存储) ============
# 生产环境应使用 Redis
sms_codes = {}


def generate_sms_code() -> str:
    """生成6位数字验证码"""
    return str(random.randint(100000, 999999))


def store_sms_code(phone: str, code: str):
    """存储验证码"""
    sms_codes[phone] = {
        "code": code,
        "expire_at": datetime.utcnow() + timedelta(minutes=settings.SMS_CODE_EXPIRE_MINUTES),
        "attempts": 0
    }


def verify_sms_code(phone: str, code: str) -> bool:
    """验证验证码"""
    if phone not in sms_codes:
        return False
    
    stored = sms_codes[phone]
    
    # 检查是否过期
    if datetime.utcnow() > stored["expire_at"]:
        del sms_codes[phone]
        return False
    
    # 检查验证码是否匹配
    if stored["code"] == code:
        # 验证成功后删除
        del sms_codes[phone]
        return True
    
    # 记录错误尝试
    stored["attempts"] += 1
    return False


# ============ JWT 认证依赖 ============
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    获取当前登录用户
    从 JWT Token 中提取用户 ID，查询数据库返回用户对象
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except ValueError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    获取当前用户（可选）
    用于某些公开接口但想获取用户信息的场景
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
        
    except ValueError:
        return None
