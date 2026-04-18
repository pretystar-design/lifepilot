# LifePilot Frontend

个人生活智能助手前端应用

## 技术栈

- TypeScript - 类型安全
- Bootstrap 5 - UI 框架
- Parcel - 打包工具

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问应用

打开浏览器访问 http://localhost:3000

## 项目结构

```
frontend/
├── src/
│   ├── index.html          # HTML 入口
│   ├── main.ts             # 主入口文件
│   ├── styles/
│   │   └── main.css        # 全局样式
│   ├── pages/
│   │   ├── login.ts        # 登录页
│   │   ├── register.ts     # 注册页（预留）
│   │   ├── onboarding.ts   # 首次引导页
│   │   └── home.ts         # 首页
│   └── utils/
│       ├── api.ts          # API 客户端
│       ├── auth.ts         # 认证工具
│       └── toast.ts        # Toast 提示
├── package.json
├── tsconfig.json
└── README.md
```

## 功能说明

### 登录/注册
- 手机号 + 验证码登录
- 开发环境验证码固定为 `123456`
- 微信登录按钮预留（小程序功能）

### 首次引导
- 设置昵称
- 选择关注维度（学习/理财/健康）

### 首页
- 快速记录入口
- 维度筛选
- 数据概览卡片
- AI 建议展示
- 最近记录列表

## 开发说明

### API 代理
前端 API 地址配置在 `src/utils/api.ts` 中：
```typescript
const API_BASE_URL = 'http://localhost:8000';
```

### 认证流程
1. 调用 `/api/auth/send-sms` 发送验证码
2. 调用 `/api/auth/login` 登录
3. 保存返回的 `access_token` 到 localStorage
4. 后续请求通过 `Authorization: Bearer <token>` 头部传递

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。
