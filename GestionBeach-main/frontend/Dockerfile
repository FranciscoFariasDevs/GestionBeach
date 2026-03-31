# ── Etapa 1: Build de React ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias del frontend
COPY frontend/package*.json ./

RUN npm ci

# Copiar código fuente del frontend
COPY frontend/ ./

# REACT_APP_API_URL=/api → nginx proxy redirigirá al backend
# Se puede sobreescribir con --build-arg REACT_APP_API_URL=https://mi-dominio.com/api
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Etapa 2: Nginx para servir el build ───────────────────────────────────
FROM nginx:1.27-alpine

# Copiar build de React
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración de nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
