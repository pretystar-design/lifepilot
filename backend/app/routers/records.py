"""
LifePilot 记录管理路由
处理生活记录的 CRUD 操作、AI 分类、语音转文字
"""

import os
import uuid
import math
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.record import Record
from app.models.user import User
from app.schemas.record import (
    RecordCreate, RecordUpdate, RecordResponse, RecordListResponse,
    ClassifyRequest, ClassifyResponse, TranscribeResponse
)
from app.utils.auth import get_current_user
from app.services.ai_service import classify_content, transcribe_audio

router = APIRouter(prefix="/api/records", tags=["记录管理"])

# 文件上传配置
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=RecordResponse)
async def create_record(
    record_data: RecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    创建新记录
    
    - 如果未指定分类，自动调用 AI 分类
    - 如果 AI 分类置信度 < 0.7，返回 need_manual 提示前端让用户确认
    """
    # 如果未指定分类，使用 AI 分类
    category = record_data.category
    confidence = record_data.confidence
    tags = record_data.tags or []
    
    if not category:
        # 调用 AI 分类
        classify_result = await classify_content(record_data.content)
        category = classify_result["category"]
        confidence = classify_result["confidence"]
        tags = classify_result.get("tags", []) or record_data.tags or []
    
    # 创建记录
    record = Record(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=record_data.title,
        content=record_data.content,
        category=category,
        tags=",".join(tags) if tags else "",
        audio_url=record_data.audio_url,
        confidence=confidence
    )
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # 构建响应
    return RecordResponse(
        id=record.id,
        user_id=record.user_id,
        title=record.title,
        content=record.content,
        category=record.category,
        tags=record.tags.split(",") if record.tags else [],
        audio_url=record.audio_url,
        confidence=record.confidence,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.get("", response_model=RecordListResponse)
async def get_records(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    category: Optional[str] = Query(None, description="筛选分类: learning/finance/health"),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取记录列表
    
    - 支持分页
    - 支持按分类筛选
    - 支持关键词搜索
    - 按时间倒序返回
    """
    # 构建查询
    query = db.query(Record).filter(Record.user_id == current_user.id)
    
    # 分类筛选
    if category:
        query = query.filter(Record.category == category)
    
    # 关键词搜索 (搜索标题和内容)
    if keyword:
        keyword_pattern = f"%{keyword}%"
        query = query.filter(
            (Record.title.like(keyword_pattern)) | 
            (Record.content.like(keyword_pattern))
        )
    
    # 获取总数
    total = query.count()
    
    # 分页
    offset = (page - 1) * page_size
    records = query.order_by(desc(Record.created_at)).offset(offset).limit(page_size).all()
    
    # 计算总页数
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # 构建响应
    return RecordListResponse(
        records=[
            RecordResponse(
                id=r.id,
                user_id=r.user_id,
                title=r.title,
                content=r.content,
                category=r.category,
                tags=r.tags.split(",") if r.tags else [],
                audio_url=r.audio_url,
                confidence=r.confidence,
                created_at=r.created_at,
                updated_at=r.updated_at
            )
            for r in records
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取记录详情"""
    record = db.query(Record).filter(
        Record.id == record_id,
        Record.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    return RecordResponse(
        id=record.id,
        user_id=record.user_id,
        title=record.title,
        content=record.content,
        category=record.category,
        tags=record.tags.split(",") if record.tags else [],
        audio_url=record.audio_url,
        confidence=record.confidence,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.put("/{record_id}", response_model=RecordResponse)
async def update_record(
    record_id: str,
    record_data: RecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新记录"""
    record = db.query(Record).filter(
        Record.id == record_id,
        Record.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    # 更新字段
    if record_data.title is not None:
        record.title = record_data.title
    if record_data.content is not None:
        record.content = record_data.content
    if record_data.category is not None:
        record.category = record_data.category
    if record_data.tags is not None:
        record.tags = ",".join(record_data.tags)
    if record_data.audio_url is not None:
        record.audio_url = record_data.audio_url
    
    record.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(record)
    
    return RecordResponse(
        id=record.id,
        user_id=record.user_id,
        title=record.title,
        content=record.content,
        category=record.category,
        tags=record.tags.split(",") if record.tags else [],
        audio_url=record.audio_url,
        confidence=record.confidence,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.delete("/{record_id}")
async def delete_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除记录"""
    record = db.query(Record).filter(
        Record.id == record_id,
        Record.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    # 删除关联的音频文件
    if record.audio_url:
        audio_path = os.path.join(UPLOAD_DIR, record.audio_url.split("/")[-1])
        if os.path.exists(audio_path):
            os.remove(audio_path)
    
    db.delete(record)
    db.commit()
    
    return {"success": True, "message": "记录已删除"}


@router.post("/classify", response_model=ClassifyResponse)
async def classify_record(
    request: ClassifyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    AI 分类接口
    
    对输入内容进行分类，返回分类结果和推荐标签
    """
    result = await classify_content(request.content)
    
    return ClassifyResponse(
        category=result["category"],
        tags=result.get("tags", []),
        confidence=result.get("confidence", 0.8),
        need_manual=result.get("need_manual", False)
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="音频文件"),
    current_user: User = Depends(get_current_user)
):
    """
    语音转文字接口
    
    接收音频文件，返回转写文字
    支持格式: webm, mp3, wav, m4a, ogg
    """
    # 读取文件内容
    audio_data = await file.read()
    
    # 检查文件大小 (最大 10MB)
    if len(audio_data) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="音频文件过大，最大支持 10MB"
        )
    
    # 调用转写服务
    result = await transcribe_audio(audio_data, file.filename)
    
    return TranscribeResponse(
        text=result["text"],
        duration=result.get("duration")
    )


@router.post("/upload/audio", response_model=dict)
async def upload_audio(
    file: UploadFile = File(..., description="音频文件"),
    current_user: User = Depends(get_current_user)
):
    """
    上传音频文件
    
    将音频文件保存到服务器，返回访问 URL
    """
    # 检查文件类型
    allowed_types = ["audio/webm", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"]
    content_type = file.content_type or "audio/webm"
    
    if content_type not in allowed_types and not file.filename.endswith(('.webm', '.mp3', '.wav', '.m4a', '.ogg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的音频格式"
        )
    
    # 生成唯一文件名
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # 保存文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 返回访问 URL
    audio_url = f"/api/uploads/{filename}"
    
    return {
        "success": True,
        "audio_url": audio_url,
        "filename": filename
    }


@router.get("/stats/summary")
async def get_record_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取记录统计信息
    
    - 总记录数
    - 各分类数量
    - 本周记录数
    - 连续记录天数
    """
    # 总记录数
    total = db.query(Record).filter(Record.user_id == current_user.id).count()
    
    # 各分类数量
    category_stats = {}
    for category in ["learning", "finance", "health"]:
        count = db.query(Record).filter(
            Record.user_id == current_user.id,
            Record.category == category
        ).count()
        category_stats[category] = count
    
    # 本周记录数 (最近7天)
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_count = db.query(Record).filter(
        Record.user_id == current_user.id,
        Record.created_at >= week_ago
    ).count()
    
    # 计算连续记录天数
    streak_days = calculate_streak(current_user.id, db)
    
    return {
        "total": total,
        "category_stats": category_stats,
        "week_count": week_count,
        "streak_days": streak_days
    }


def calculate_streak(user_id: str, db: Session) -> int:
    """
    计算连续记录天数
    
    从今天开始往前数，如果有记录就继续，否则停止
    """
    from datetime import timedelta
    
    today = datetime.utcnow().date()
    streak = 0
    
    # 查询用户的所有记录日期 (去重)
    records = db.query(Record).filter(
        Record.user_id == user_id
    ).order_by(desc(Record.created_at)).all()
    
    if not records:
        return 0
    
    # 提取日期去重
    record_dates = set()
    for r in records:
        if r.created_at:
            record_dates.add(r.created_at.date())
    
    # 从今天开始往前数
    current_date = today
    while current_date in record_dates:
        streak += 1
        current_date -= timedelta(days=1)
    
    return streak
