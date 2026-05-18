// backend/config/modulosConfig.js
// ============================================================
//  REGISTRO CENTRAL DE MÓDULOS - ÚNICA FUENTE DE VERDAD
//  Para agregar un módulo nuevo, solo agrega una entrada aquí.
//  El backend sincroniza con la BD y el frontend lee de la API.
// ============================================================
//
//  nombre:  Nombre del módulo tal como aparece en la BD y en el selector de perfiles
//  claves:  Array de claves de ruta del frontend que este módulo habilita
//           La primera clave es la "principal", las demás son sub-rutas
//
//  Ejemplo: { nombre: 'Productos', claves: ['productos', 'productos/consultar', ...] }
//  Significa que al asignar "Productos" a un perfil, el usuario puede ver
//  todas las rutas listadas en claves.
//

module.exports = [
  { nombre: 'Dashboard',             claves: ['dashboard'] },
  { nombre: 'Estado Resultado',       claves: ['estado-resultado'] },
  { nombre: 'Estado Resultado Ingreso', claves: ['estado-resultado/ingreso-gastos'] },
  { nombre: 'Monitoreo',             claves: ['monitoreo'] },
  { nombre: 'Remuneraciones',        claves: ['remuneraciones'] },
  { nombre: 'Inventario',            claves: ['inventario'] },
  { nombre: 'Ventas',                claves: ['ventas'] },

  // Productos: SOLO la ruta padre (los submódulos se controlan individualmente)
  { nombre: 'Productos',             claves: ['productos'] },
  // Sub-módulos individuales (para permisos granulares)
  { nombre: 'Consultar Producto',    claves: ['productos/consultar'] },
  { nombre: 'Rotacion Ferreterias',  claves: ['productos/rotacion-ferreterias'] },
  { nombre: 'Rentabilidad',          claves: ['productos/rentabilidad'] },
  { nombre: 'Margenes',              claves: ['productos/margenes'] },
  { nombre: 'Guias',                 claves: ['productos/guias'] },
  { nombre: 'Resumen Valorizado',    claves: ['productos/resumen-valorizado'] },
  { nombre: 'Stocks',                claves: ['productos/stocks'] },

  // Compras: módulo padre habilita sub-módulos
  { nombre: 'Compras',               claves: ['compras', 'compras/centros-costos', 'compras/facturas-xml'] },
  { nombre: 'Centros de Costos',     claves: ['compras/centros-costos'] },
  { nombre: 'Facturas XML',          claves: ['compras/facturas-xml'] },
  { nombre: 'Planificacion Compras', claves: ['compras/planificacion'] },
  { nombre: 'MonitorOrdenes',        claves: ['compras/monitor-ordenes'] },

  { nombre: 'Tarjeta Empleado',      claves: ['tarjeta-empleado'] },
  { nombre: 'Empleados',             claves: ['empleados'] },

  // Recursos Humanos: módulo padre habilita sub-módulos
  { nombre: 'Recursos Humanos',      claves: ['recursos-humanos', 'recursos-humanos/boletas-folios', 'recursos-humanos/resumen-ejecutivo'] },
  { nombre: 'Boletas y Folios',      claves: ['recursos-humanos/boletas-folios'] },
  { nombre: 'Resumen Ejecutivo',     claves: ['recursos-humanos/resumen-ejecutivo'] },

  { nombre: 'Cabañas',               claves: ['admin/cabanas'] },
  { nombre: 'Sorteo Concurso',       claves: ['sorteo-concurso'] },
  { nombre: 'Códigos de Descuento',  claves: ['codigos-descuento'] },
  { nombre: 'Mis Tickets',           claves: ['mis-tickets'] },
  { nombre: 'Mantenciones',          claves: ['mantenciones'] },
  { nombre: 'Usuarios',              claves: ['usuarios'] },
  { nombre: 'Perfiles',              claves: ['perfiles'] },
  { nombre: 'Módulos',               claves: ['modulos'] },
  { nombre: 'Configuración',         claves: ['configuracion'] },
  { nombre: 'Correo Electrónico',    claves: ['correo-electronico'] },
  { nombre: 'Grupos de Chat',        claves: ['grupos-chat'] },
  { nombre: 'Anulaciones',           claves: ['productos/anulaciones'] },
  { nombre: 'Cargar Inventario',    claves: ['productos/cargar-inventario'] },
  { nombre: 'Ajustes',              claves: ['productos/ajustes'] },
  { nombre: 'Proveedores Producto', claves: ['productos/proveedores'] },
  { nombre: 'Organigrama',          claves: ['organigrama'] },
  { nombre: 'Kanban',               claves: ['kanban'] },
  { nombre: 'Cotizaciones',         claves: ['cotizaciones'] },
  { nombre: 'Los Más Vendidos',     claves: ['los-mas-vendidos'] },
  { nombre: 'Megafonía',            claves: ['megafonia/emisor'] },
];
