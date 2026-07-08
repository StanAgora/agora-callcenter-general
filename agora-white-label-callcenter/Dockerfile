# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
ARG APP_VITE_BASE_PATH=/
RUN npx vite build --base="${APP_VITE_BASE_PATH}"

# ── Stage 2: Runtime (Python + nginx) ────────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends nginx && rm -rf /var/lib/apt/lists/*

# Python backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Frontend static files
COPY --from=frontend-build /build/frontend/dist /usr/share/nginx/html

# nginx: serve SPA on :8080, proxy /api/ and /ws → uvicorn :8000
RUN printf 'server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    client_max_body_size 50M;\n\
\n\
    location /api/ {\n\
        proxy_pass http://127.0.0.1:8000/api/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
    }\n\
\n\
    location /ws {\n\
        proxy_pass http://127.0.0.1:8000/ws;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_read_timeout 3600s;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/sites-enabled/default

# Entrypoint: start uvicorn then nginx (foreground)
RUN printf '#!/bin/sh\nset -e\ncd /app/backend\nuvicorn app.main:app --host 127.0.0.1 --port 8000 &\nnginx -g "daemon off;"\n' \
    > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080
CMD ["/entrypoint.sh"]
