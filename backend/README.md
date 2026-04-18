# LifePilot Backend

个人生活智能助手后端 API

## 技术栈

- Python 3.10+
- FastAPI - 高性能 Web 框架
- SQLAlchemy - ORM
- SQLite - 开发数据库
- JWT - 认证

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

```bash
# 开发模式
uvicorn app.main:app --reload

# 或直接运行
python -m app.main
```

### 3. 访问 API

- API 文档: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### 认证相关

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/auth/send-sms | 发送验证码 |
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/wechat-login | 微信登录（预留） |
| GET | /api/auth/me | 获取当前用户信息 |
| PUT | /api/auth/profile | 更新用户资料 |
| POST | /api/auth/logout | 退出登录 |

## 开发说明

### 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # 应用入口
│   ├── config.py        # 配置文件
│   ├── database.py      # 数据库配置
│   ├── models/          # 数据模型
│   ├── schemas/         # Pydantic schemas
│   ├── routers/         # API 路由
│   └── utils/           # 工具函数
├── requirements.txt
└── README.md
```

### 验证码说明

**开发环境下**，验证码固定为 `123456`，方便测试。

生产环境需要：
1. 配置真实的短信服务商（如阿里云、腾讯云）
2. 修改 `app/utils/auth.py` 中的 `send_sms_code` 函数
3. 移除返回的 `code` 字段

### JWT Token

- 有效期：7 天
- 存储在客户端 localStorage
- 请求时通过 `Authorization: Bearer <token>` 头部传递

### 数据库

开发阶段使用 SQLite，文件为 `lifepilot.db`。

生产环境建议使用 PostgreSQL，修改 `app/config.py` 中的 `DATABASE_URL`。
