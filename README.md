# RFZ Photo Wall

前端使用 `Vue 3 + Vite`，后端使用 `FastAPI`，数据和图片存储使用 `Supabase`。

## 项目结构

- `frontend/`：前端页面
- `backend/`：后端 API
- `docs/`：补充说明文档

## 本地开发

### 1) 配置后端环境变量

参考 `backend/.env.example`，在 `backend/.env` 中填写：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=photos
BACKEND_CORS_ORIGINS=http://localhost:5173
```

### 2) 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

健康检查：

```text
http://localhost:8000/api/health
```

### 3) 配置前端环境变量

参考 `frontend/.env.example`，在 `frontend/.env` 中填写：

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4) 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问地址：

```text
http://localhost:5173
```

## Vercel 部署（单个项目同时部署前后端）

当前仓库已按“单个 Vercel 项目”配置完成：

- 根目录 `vercel.json` 统一负责构建与路由
- `backend/api/index.py` 作为 Python Function 入口
- `/api/*` 由 FastAPI 处理，其他路由回退到前端 `index.html`

### Vercel 项目设置

- Root Directory：仓库根目录（不要填 `frontend` 或 `backend`）
- 环境变量（Production / Preview 都建议配置）：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_BUCKET`
  - `BACKEND_CORS_ORIGINS`

建议值：

```env
BACKEND_CORS_ORIGINS=https://your-project.vercel.app
```

说明：

- 单项目同域部署时，前端默认请求同域 `/api/*`
- `VITE_API_BASE_URL` 在线上可不填；本地开发仍可用 `frontend/.env` 指向 `http://localhost:8000`

### 部署后检查

1. 健康检查：`https://your-project.vercel.app/api/health`
2. 打开首页，确认成员列表 / 照片列表能正常加载。

## 常见问题

### 1) `Failed to fetch`

通常是前端请求不到后端，检查：

- 后端是否已成功部署并可访问 `/api/health`
- 后端 `BACKEND_CORS_ORIGINS` 是否包含当前前端域名
- 如果你手动设置了 `VITE_API_BASE_URL`，不要填错误地址

### 2) `ModuleNotFoundError: No module named 'supabase'`

本地运行后端缺依赖，执行：

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### 3) `.venv/bin/pip bad interpreter`

虚拟环境路径失效，重建：

```bash
cd backend
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
