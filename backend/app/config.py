"""
LifePilot 配置文件
"""

import os
from datetime import timedelta
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用信息
    APP_NAME: str = "LifePilot"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # 数据库配置 (开发阶段使用 SQLite)
    DATABASE_URL: str = "sqlite:///./lifepilot.db"
    
    # JWT 配置
    JWT_SECRET_KEY: str = "lifepilot-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_DAYS: int = 7  # 7天有效期
    
    # 短信验证码配置 (模拟)
    SMS_CODE_EXPIRE_MINUTES: int = 5
    SMS_CODE_LENGTH: int = 6
    
    # CORS 配置
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 全局配置实例
settings = Settings()


def create_access_token(data: dict) -> str:
    """创建 JWT Token"""
    from datetime import datetime, timezone
    import jwt
    
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> dict:
    """验证 JWT Token"""
    import jwt
    from datetime import datetime, timezone
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token 已过期")
    except jwt.InvalidTokenError:
        raise ValueError("无效的 Token")
