"""
LifePilot 主应用入口
FastAPI 应用初始化
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routers import auth
from app.routers import records
from app.routers import suggestions


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        description="个人生活智能助手 API",
        version=settings.APP_VERSION,
        docs_url="/docs",  # Swagger 文档
        redoc_url="/redoc"  # ReDoc 文档
    )
    
    # CORS 中间件配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(auth.router)
    app.include_router(records.router)
    app.include_router(suggestions.router)
    
    # 静态文件服务 (上传的音频文件)
    uploads_dir = "./uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    
    # 健康检查端点
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "app": settings.APP_NAME}
    
    @app.get("/")
    async def root():
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs"
        }
    
    # 启动时初始化数据库
    @app.on_event("startup")
    async def startup_event():
        init_db()
        print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} 已启动")
        print(f"📚 API 文档: http://localhost:8000/docs")
    
    return app


# 创建应用实例
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
