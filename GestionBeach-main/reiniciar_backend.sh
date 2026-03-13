#!/bin/bash

echo "🔄 Reiniciando backend..."
echo ""

# Ir al directorio del proyecto
cd /home/ffari/Escritorio/GESTIONBEACH/GestionBeach/GestionBeach-main

# Detener el proceso actual
echo "⏸️  Deteniendo backend..."
pkill -f "node.*server.js"
sleep 2

# Verificar que se detuvo
if ps aux | grep -v grep | grep "node.*server.js" > /dev/null; then
    echo "⚠️  Backend aún corriendo, forzando cierre..."
    pkill -9 -f "node.*server.js"
    sleep 2
fi

echo "✅ Backend detenido"
echo ""

# Iniciar de nuevo
echo "🚀 Iniciando backend..."
npm start &

# Esperar a que inicie
echo "⏳ Esperando que el backend inicie..."
sleep 5

# Verificar que funciona
echo ""
echo "🔍 Verificando backend..."
if curl -s http://localhost:5000/api/ping | grep -q "success"; then
    echo "✅ ¡Backend funcionando correctamente!"
    echo ""
    echo "🎉 Ya puedes usar el sistema:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend: http://localhost:5000"
else
    echo "❌ Error: Backend no responde"
    echo "   Revisa el log: tail -f backend.log"
fi

echo ""
