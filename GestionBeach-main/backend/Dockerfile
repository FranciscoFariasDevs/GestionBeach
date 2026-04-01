FROM node:20-alpine

# Dependencias del sistema (sharp, canvas, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copiar package.json raíz (monorepo: todas las deps del backend están aquí)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Instalar playwright (navegador para capturas PBI)
RUN npx playwright install --with-deps chromium 2>/dev/null || true

# Copiar código del backend
COPY backend/ ./backend/

# Copiar archivos estáticos compartidos (si existen en raíz)
COPY imagenes-cabanas/ ./imagenes-cabanas/ 2>/dev/null || true

# Crear directorios de uploads con permisos correctos
RUN mkdir -p \
    ./backend/uploads/perfiles \
    ./backend/uploads/chat \
    ./backend/uploads/organigrama \
    ./backend/uploads/planificacion \
    ./backend/uploads/pbi_downloads \
    ./backend/uploads/pbi_screenshots \
    ./backend/uploads/tickets \
    ./backend/uploads/concurso-piscinas \
    ./backend/uploads/cotizaciones \
    ./imagenes-cabanas \
    && chmod -R 777 ./backend/uploads ./imagenes-cabanas

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "backend/server.js"]
