"""
LifePilot 用户相关 Pydantic Schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator


# ============ 请求 Schema ============

class SendSmsRequest(BaseModel):
    """发送验证码请求"""
    phone: str = Field(..., min_length=11, max_length=20, description="手机号")
    
    @validator('phone')
    def validate_phone(cls, v):
        # 简单验证手机号格式
        if not v.startswith('1'):
            raise ValueError('手机号必须以1开头')
        if len(v) < 11:
            raise ValueError('手机号长度不正确')
        return v


class RegisterRequest(BaseModel):
    """注册请求"""
    phone: str = Field(..., min_length=11, max_length=20, description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v.startswith('1'):
            raise ValueError('手机号必须以1开头')
        return v
    
    @validator('code')
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('验证码必须是数字')
        return v


class LoginRequest(BaseModel):
    """登录请求"""
    phone: str = Field(..., min_length=11, max_length=20, description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")


class WechatLoginRequest(BaseModel):
    """微信登录请求 (预留接口)"""
    code: str = Field(..., description="微信授权码")
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    """更新用户资料请求"""
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")
    avatar_url: Optional[str] = Field(None, max_length=500, description="头像 URL")
    dimensions: Optional[List[str]] = Field(None, description="关注维度")
    onboarding_completed: Optional[bool] = None


# ============ 响应 Schema ============

class UserResponse(BaseModel):
    """用户信息响应"""
    id: str
    phone: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    openid: Optional[str] = None
    dimensions: List[str] = []
    onboarding_completed: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SmsResponse(BaseModel):
    """发送验证码响应"""
    success: bool
    message: str
    # 开发环境下返回验证码，方便测试
    code: Optional[str] = None


class ApiResponse(BaseModel):
    """通用 API 响应"""
    success: bool
    message: str
    data: Optional[dict] = None
