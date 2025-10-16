// test-routes.js - Script para verificar si las rutas cargan correctamente

console.log('🔍 === TEST DE CARGA DE RUTAS ===\n');

// Test 1: Verificar cabanasController
console.log('📋 Test 1: Cargando cabanasController...');
try {
  const cabanasController = require('./controllers/cabanasController');
  console.log('✅ cabanasController cargado');
  console.log('   Exports:', Object.keys(cabanasController));
} catch (error) {
  console.error('❌ Error al cargar cabanasController:', error.message);
}

// Test 2: Verificar reservasController
console.log('\n📋 Test 2: Cargando reservasController...');
try {
  const reservasController = require('./controllers/reservasController');
  console.log('✅ reservasController cargado');
  console.log('   Exports:', Object.keys(reservasController));
} catch (error) {
  console.error('❌ Error al cargar reservasController:', error.message);
}

// Test 3: Verificar twilioWhatsAppControllerV2
console.log('\n📋 Test 3: Cargando twilioWhatsAppControllerV2...');
try {
  const twilioController = require('./controllers/twilioWhatsAppControllerV2');
  console.log('✅ twilioWhatsAppControllerV2 cargado');
  console.log('   Exports:', Object.keys(twilioController));
} catch (error) {
  console.error('❌ Error al cargar twilioWhatsAppControllerV2:', error.message);
}

// Test 4: Verificar cabanasRoutes
console.log('\n📋 Test 4: Cargando cabanasRoutes...');
try {
  const cabanasRoutes = require('./routes/cabanasRoutes');
  console.log('✅ cabanasRoutes cargado');
  console.log('   Tipo:', typeof cabanasRoutes);

  if (typeof cabanasRoutes === 'function') {
    console.log('   ✅ Es una función (Router)');
  } else {
    console.log('   ❌ NO es una función, es:', typeof cabanasRoutes);
  }
} catch (error) {
  console.error('❌ Error al cargar cabanasRoutes:', error.message);
  console.error('   Stack:', error.stack);
}

console.log('\n✅ === TEST COMPLETADO ===\n');
