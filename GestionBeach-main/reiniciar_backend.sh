#!/bin/bash

echo "🔄 Reiniciando backend..."

# Matar procesos existentes
pkill -f "node.*server.js" 2>/dev/null
sleep 1
pkill -9 -f "node.*server.js" 2>/dev/null
sleep 1

echo "✅ Backend detenido"

# Iniciar en background con log
cd /home/ffari/Escritorio/GESTIONBEACH/GestionBeach/GestionBeach-main/backend
nohup node server.js > /tmp/backend.log 2>&1 &
echo "🚀 Backend iniciado (PID: $!)"

# Esperar y verificar
sleep 4
echo ""
echo "📋 Log de inicio:"
tail -15 /tmp/backend.log

echo ""
echo "💡 Ver log completo: tail -f /tmp/backend.log"
