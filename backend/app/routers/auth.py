"""
LifePilot 认证路由
处理用户注册、登录、验证码发送等
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    SendSmsRequest, SmsResponse,
    RegisterRequest, LoginRequest, WechatLoginRequest, TokenResponse,
    UpdateProfileRequest, UserResponse, ApiResponse
)
from app.utils.auth import (
    generate_sms_code, store_sms_code, verify_sms_code,
    get_current_user
)
from app.config import create_access_token

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/send-sms", response_model=SmsResponse)
async def send_sms_code(
    request: SendSmsRequest,
    db: Session = Depends(get_db)
):
    """
    发送短信验证码
    
    - 开发环境：返回固定验证码 123456
    - 生产环境：调用真实短信服务商 API
    """
    # 检查手机号是否已注册（仅注册时需要检查）
    # 这里不做强制检查，允许向已注册用户发送验证码（用于登录）
    
    # 生成验证码
    code = "123456" if settings.DEBUG else generate_sms_code()
    
    # 存储验证码
    store_sms_code(request.phone, code)
    
    return SmsResponse(
        success=True,
        message="验证码发送成功",
        code=code if settings.DEBUG else None  # 开发环境返回验证码
    )


@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    用户注册
    - 验证手机号格式和验证码
    - 创建新用户
    - 返回 JWT Token
    """
    # 验证验证码
    if not verify_sms_code(request.phone, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期"
        )
    
    # 检查手机号是否已注册
    existing_user = db.query(User).filter(User.phone == request.phone).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该手机号已注册，请直接登录"
        )
    
    # 创建新用户
    user = User(
        phone=request.phone,
        onboarding_completed=False
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 生成 Token
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    用户登录
    - 验证验证码
    - 查找或创建用户（手机号不存在则注册）
    - 返回 JWT Token
    """
    # 验证验证码
    if not verify_sms_code(request.phone, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期"
        )
    
    # 查找用户
    user = db.query(User).filter(User.phone == request.phone).first()
    
    # 如果用户不存在，自动注册
    if not user:
        user = User(
            phone=request.phone,
            onboarding_completed=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # 生成 Token
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/wechat-login", response_model=TokenResponse)
async def wechat_login(
    request: WechatLoginRequest,
    db: Session = Depends(get_db)
):
    """
    微信一键登录 (预留接口)
    
    - 微信小程序调用此接口
    - 通过 code 换取 openid
    - 如用户已存在则登录，如不存在则注册
    - 返回 JWT Token
    
    注意：当前为模拟实现
    """
    # TODO: 实际实现时，需要通过微信 API 用 code 换取 openid
    # 微信登录流程:
    # 1. 小程序调用 wx.login() 获取 code
    # 2. 前端将 code 发送到后端
    # 3. 后端用 code + appid + secret 调用微信 API 获取 openid
    # 4. 根据 openid 查找或创建用户
    
    openid = f"mock_openid_{request.code}"  # 模拟 openid
    
    # 查找用户
    user = db.query(User).filter(User.openid == openid).first()
    
    if not user:
        # 创建新用户
        user = User(
            phone="",
            openid=openid,
            nickname=request.nickname,
            avatar_url=request.avatar_url,
            onboarding_completed=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # 生成 Token
    access_token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户信息
    需要登录后访问
    """
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    更新用户资料
    - 设置昵称
    - 设置头像
    - 设置关注维度
    - 完成首次设置
    """
    if request.nickname is not None:
        current_user.nickname = request.nickname
    
    if request.avatar_url is not None:
        current_user.avatar_url = request.avatar_url
    
    if request.dimensions is not None:
        # 验证维度值
        valid_dimensions = ["learning", "finance", "health"]
        for dim in request.dimensions:
            if dim not in valid_dimensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"无效的维度: {dim}，有效值为: {valid_dimensions}"
                )
        current_user.dimensions = json.dumps(request.dimensions)
    
    if request.onboarding_completed is not None:
        current_user.onboarding_completed = request.onboarding_completed
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=ApiResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    用户登出
    
    由于使用 JWT（无状态），后端不需要处理
    前端删除本地存储的 Token 即可
    这里可以做登录日志记录等
    """
    return ApiResponse(
        success=True,
        message="已退出登录"
    )


# 导入 settings 用于调试模式检查
from app.config import settings
import json
