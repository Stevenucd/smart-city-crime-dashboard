# Backend (Flask)

## 目录结构

- `backend/app/`：Flask 应用代码（app factory + blueprint）
- `backend/run.py`：本地开发启动入口
- `backend/wsgi.py`：部署入口（如 gunicorn）

## 本地启动

1) 创建虚拟环境并安装依赖（示例）

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2) 配置环境变量（可选）

复制 `backend/.env.example` 为 `backend/.env`，按需修改。

3) 启动

```bash
python backend/run.py
```

启动后访问：

- `GET http://127.0.0.1:5000/api/health`
