# RFZ Photo Wall

前端使用 `Vue 3 + Vite`，后端使用 `FastAPI`，数据存储使用本地 `SQLite`，图片存储使用 `backend/uploads/` 目录。
如果机器安装了 `ffmpeg` / `ffprobe`，后端会为视频自动补充基础媒体处理：提取时长与分辨率、转码为 `mp4`、生成封面图；未安装时会降级为原文件直存。

## 项目结构

- `frontend/`：前端页面
- `backend/`：后端 API
- `docs/`：补充说明文档

## 本地开发

### 1) 配置后端环境变量

参考 `backend/.env.example`，在 `backend/.env` 中填写：

```env
DATABASE_URL=sqlite:///./data/photo_wall.db
UPLOAD_DIR=./uploads
PUBLIC_BASE_URL=http://localhost:8000
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

可选安装：

```bash
brew install ffmpeg
```

安装后，新上传的视频会自动尝试转码并生成封面。

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

## Vercel 部署（说明）

当前代码已经改成 `SQLite + 本地 uploads` 方案，这适合本地开发，不适合作为 Vercel 上的持久化存储方案。Vercel 的文件系统和本地 SQLite 都不能当正式持久化数据库使用。

如果你还要线上部署，需要把存储再切到真正的数据库和对象存储。

## 阿里云 ECS 部署

推荐把前端、后端、SQLite 数据库和上传文件都放在同一台服务器上，由 `nginx` 对外提供访问：

- `/`：前端静态文件
- `/api/*`：反向代理到 FastAPI
- `/uploads/*`：反向代理到 FastAPI 暴露的上传文件

服务器目录示例：

```text
/var/www/rfz-photo-wall/
  backend/
  frontend/
```

后端生产环境变量 `backend/.env` 示例：

```env
DATABASE_URL=sqlite:////var/www/rfz-photo-wall/backend/data/photo_wall.db
UPLOAD_DIR=/var/www/rfz-photo-wall/backend/uploads
PUBLIC_BASE_URL=
BACKEND_CORS_ORIGINS=http://39.96.203.225
```

`PUBLIC_BASE_URL` 留空时，后端会返回 `/uploads/...` 这种同域名相对地址，更适合前后端都在同一台服务器、同一个域名下部署。

前端生产环境可以不设置 `VITE_API_BASE_URL`，构建后会默认请求同域名的 `/api/*`。如果要显式设置，可以写：

```env
VITE_API_BASE_URL=
```

构建前端：

```bash
cd frontend
npm install
npm run build
```

启动后端：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

仓库里的 `deploy/` 目录提供了两个模板：

- `deploy/nginx.rfz-photo-wall.conf.example`：nginx 站点配置
- `deploy/rfz-photo-wall.service.example`：systemd 后端服务配置

上线时把模板里的 `/var/www/rfz-photo-wall` 改成你的真实服务器路径。当前 nginx 模板已经按公网 IP `39.96.203.225` 配好。

## 常见问题

### 1) `Failed to fetch`

通常是前端请求不到后端，检查：

- 后端是否已成功部署并可访问 `/api/health`
- 后端 `BACKEND_CORS_ORIGINS` 是否包含当前前端域名
- 如果你手动设置了 `VITE_API_BASE_URL`，不要填错误地址

### 2) `sqlite3.OperationalError: unable to open database file`

通常是数据库目录不存在或没有写权限。当前代码会自动创建 `backend/data/`，如果你改了 `DATABASE_URL`，确认对应目录可写。

### 3) 图片无法访问

检查：

- `PUBLIC_BASE_URL` 是否和后端实际访问地址一致
- `backend/uploads/` 中是否已写入文件
- 后端是否正常启动并挂载了 `/uploads/*` 静态目录

### 4) `.venv/bin/pip bad interpreter`

虚拟环境路径失效，重建：

```bash
cd backend
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
