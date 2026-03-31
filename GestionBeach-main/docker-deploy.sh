#!/bin/bash
# ================================================================
# GestionBeach - Script de despliegue Docker
# ================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== GestionBeach Docker Deploy ===${NC}"

# Verificar que exista el .env raíz (con SA_PASSWORD)
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}No existe .env en la raíz. Creando desde ejemplo...${NC}"
  cp .env.docker.example .env
  echo -e "${RED}IMPORTANTE: Edita el archivo .env y cambia SA_PASSWORD antes de continuar.${NC}"
  exit 1
fi

# Verificar que exista backend/.env
if [ ! -f "backend/.env" ]; then
  echo -e "${RED}ERROR: No existe backend/.env con las variables del backend.${NC}"
  echo "Copia tu backend/.env al servidor y vuelve a ejecutar este script."
  exit 1
fi

# Construir e iniciar contenedores
echo -e "${GREEN}Construyendo imágenes Docker...${NC}"
docker compose build --no-cache

echo -e "${GREEN}Iniciando servicios...${NC}"
docker compose up -d

echo -e "${GREEN}Esperando que SQL Server esté listo...${NC}"
sleep 15

echo ""
echo -e "${GREEN}=== Despliegue completado ===${NC}"
echo ""
echo "Servicios disponibles:"
echo "  Frontend:   http://$(hostname -I | awk '{print $1}')"
echo "  Backend:    http://$(hostname -I | awk '{print $1}'):5000"
echo "  SQL Server: $(hostname -I | awk '{print $1}'):1433"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:        docker compose logs -f"
echo "  Ver logs backend: docker compose logs -f backend"
echo "  Detener todo:    docker compose down"
echo "  Reiniciar:       docker compose restart"
echo ""
echo -e "${YELLOW}IMPORTANTE - Migración de base de datos:${NC}"
echo "Si tienes una BD existente en otro servidor, copia el backup .bak al contenedor:"
echo "  docker cp GestionBeach.bak gestionbeach_sqlserver:/tmp/"
echo "  docker exec -it gestionbeach_sqlserver /opt/mssql-tools18/bin/sqlcmd \\"
echo "    -S localhost -U sa -P 'TuPassword' -No \\"
echo "    -Q \"RESTORE DATABASE GestionBeach FROM DISK='/tmp/GestionBeach.bak'\""
