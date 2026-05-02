// backend/controllers/busquedaController.js
// Búsqueda semántica unificada — filtra resultados por permisos del perfil logueado
const { poolPromise, sql } = require('../config/db');
const { cache } = require('../config/redis');
const { semanticRank } = require('../services/semanticSearchService');

// Cache TTL para módulos (cambian muy poco)
const TTL_MODULOS_CACHE = 3600;

// Catálogo de módulos navegables. claves[] debe coincidir con modulosConfig.js
// null en claves = siempre visible (sin restricción de perfil)
const MODULOS = [
  { id: 'dashboard',        label: 'Dashboard',               ruta: '/dashboard',             claves: ['dashboard'],                    descripcion: 'Panel principal, resumen general, KPIs y métricas del negocio' },
  { id: 'ventas',           label: 'Ventas',                  ruta: '/ventas',                claves: ['ventas'],                        descripcion: 'Registro y consulta de ventas, boletas, transacciones diarias' },
  { id: 'inventario',       label: 'Inventario',              ruta: '/inventario',            claves: ['inventario'],                    descripcion: 'Control de stock, bodega, existencias, artículos y productos almacenados' },
  { id: 'stocks',           label: 'Stocks',                  ruta: '/stocks',                claves: ['productos/stocks'],              descripcion: 'Consulta de stock por sucursal, niveles de inventario y disponibilidad' },
  { id: 'ajustes',          label: 'Ajustes de Bodega',       ruta: '/ajustes',               claves: ['productos/ajustes'],             descripcion: 'Ajustes de inventario, correcciones de stock, mermas y diferencias de bodega' },
  { id: 'productos',        label: 'Productos',               ruta: '/consultar-producto',    claves: ['productos', 'productos/consultar'], descripcion: 'Ficha de producto, precio, código, descripción y familia' },
  { id: 'cotizaciones',     label: 'Cotizaciones',            ruta: '/cotizaciones',          claves: ['cotizaciones'],                  descripcion: 'Gestión de cotizaciones a proveedores, aprobación y flujo de compras' },
  { id: 'planificacion',    label: 'Planificación',           ruta: '/planificacion',         claves: ['compras/planificacion'],         descripcion: 'Órdenes de compra, planificación de compras, facturas y remanentes' },
  { id: 'proveedores',      label: 'Proveedores',             ruta: '/proveedores',           claves: ['compras', 'productos/proveedores'], descripcion: 'Directorio de proveedores, contactos y productos que abastecen' },
  { id: 'empleados',        label: 'Empleados',               ruta: '/empleados',             claves: ['empleados'],                     descripcion: 'Gestión de personal, fichas de empleados, datos y sucursales asignadas' },
  { id: 'remuneraciones',   label: 'Remuneraciones',          ruta: '/remuneraciones',        claves: ['remuneraciones'],                descripcion: 'Liquidaciones de sueldo, haberes, descuentos, AFP, salud y pagos de nómina' },
  { id: 'organigrama',      label: 'Organigrama',             ruta: '/organigrama',           claves: ['organigrama'],                   descripcion: 'Estructura organizacional de la empresa, jerarquía y departamentos' },
  { id: 'kanban',           label: 'Kanban',                  ruta: '/kanban',                claves: ['kanban'],                        descripcion: 'Tablero de tareas y proyectos en curso, gestión de trabajo del equipo' },
  { id: 'tickets',          label: 'Tickets de Soporte',      ruta: '/tickets',               claves: ['mis-tickets'],                   descripcion: 'Sistema de soporte, incidencias, solicitudes de ayuda y seguimiento' },
  { id: 'chat',             label: 'Chat Interno',            ruta: '/chat',                  claves: null,                              descripcion: 'Mensajería interna entre empleados, grupos y comunicación en tiempo real' },
  { id: 'notificaciones',   label: 'Notificaciones',          ruta: '/notificaciones',        claves: null,                              descripcion: 'Alertas del sistema, avisos de stock bajo, notificaciones pendientes' },
  { id: 'cabanas',          label: 'Cabañas',                 ruta: '/cabanas',               claves: ['admin/cabanas'],                 descripcion: 'Gestión de reservas de cabañas, disponibilidad y calendario de ocupación' },
  { id: 'estadoresultados', label: 'Estado de Resultados',    ruta: '/estado-resultados',     claves: ['estado-resultado'],              descripcion: 'Resultados financieros, ingresos, gastos, utilidad y rentabilidad por período' },
  { id: 'margenes',         label: 'Márgenes por Vendedor',   ruta: '/margenes',              claves: ['productos/margenes'],            descripcion: 'Análisis de margen de ganancia por vendedor y sucursal' },
  { id: 'rentabilidad',     label: 'Rentabilidad',            ruta: '/rentabilidad',          claves: ['productos/rentabilidad'],        descripcion: 'Análisis de rentabilidad de productos y sucursales' },
  { id: 'rotacion',         label: 'Rotación Ferretería',     ruta: '/rotacion-ferreterias',  claves: ['productos/rotacion-ferreterias'], descripcion: 'Rotación de productos, velocidad de venta y movimiento de stock' },
  { id: 'monitoreo',        label: 'Monitoreo',               ruta: '/monitoreo',             claves: ['monitoreo'],                     descripcion: 'Estado de servidores, conexiones, salud del sistema e infraestructura' },
  { id: 'monitor-ordenes',  label: 'Monitor de Órdenes',      ruta: '/monitor-ordenes',       claves: ['compras/monitor-ordenes'],       descripcion: 'Seguimiento de órdenes de compra, estado y recepción de mercadería' },
  { id: 'centroscostos',    label: 'Centros de Costos',       ruta: '/centros-costos',        claves: ['compras/centros-costos'],        descripcion: 'Clasificación de gastos e ingresos por centro de costo contable' },
  { id: 'usuarios',         label: 'Usuarios',                ruta: '/usuarios',              claves: ['usuarios'],                      descripcion: 'Administración de cuentas de usuario, accesos y contraseñas' },
  { id: 'perfiles',         label: 'Perfiles y Permisos',     ruta: '/perfiles',              claves: ['perfiles'],                      descripcion: 'Configuración de perfiles de acceso, roles y permisos por módulo' },
  { id: 'configuracion',    label: 'Configuración',           ruta: '/configuracion',         claves: ['configuracion'],                 descripcion: 'Parámetros del sistema, configuración general de la empresa y temporada' },
  { id: 'losmasvendidos',   label: 'Los Más Vendidos',        ruta: '/los-mas-vendidos',      claves: ['los-mas-vendidos'],              descripcion: 'Ranking de productos más vendidos, top ventas y tendencias' },
  { id: 'concurso',         label: 'Concurso Piscinas',       ruta: '/concurso-piscinas',     claves: ['sorteo-concurso'],               descripcion: 'Gestión del concurso de piscinas, participantes y validación de boletas' },
  { id: 'tarjeta',          label: 'Tarjeta Empleado',        ruta: '/tarjeta',               claves: ['tarjeta-empleado'],              descripcion: 'Generación e impresión de tarjetas de identificación para empleados' },
  { id: 'guias',            label: 'Guías de Despacho',       ruta: '/guias',                 claves: ['productos/guias'],               descripcion: 'Guías de despacho, ingreso de mercadería y transferencias entre bodegas' },
  { id: 'anulaciones',      label: 'Anulaciones',             ruta: '/anulaciones',           claves: ['productos/anulaciones'],         descripcion: 'Anulación de documentos tributarios, notas de crédito y reversos' },
  { id: 'boletas',          label: 'Boletas y Folios',        ruta: '/boletas-folios',        claves: ['recursos-humanos/boletas-folios'], descripcion: 'Liquidaciones de sueldo, boletas de honorarios y folios tributarios' },
  { id: 'cargarinventario', label: 'Cargar Inventario',       ruta: '/cargar-inventario',     claves: ['productos/cargar-inventario'],   descripcion: 'Carga masiva de inventario, importar productos desde archivo Excel' },
];

// Obtiene el set de claves permitidas para el usuario.
// Retorna null si es superadmin (acceso total).
// Usa Redis para no consultar la BD en cada búsqueda.
async function getClavesPermitidas(user) {
  if (!user) return new Set();

  // Superadmin → todo visible
  if (user.superadmin === true || user.superadmin === 1 || user.username === 'NOVLUI') {
    return null;
  }

  // Los IDs de módulos vienen en el JWT
  const moduloIds = Array.isArray(user.modules) ? user.modules : [];
  if (moduloIds.length === 0) return new Set();

  // Resolver IDs → nombres → claves usando caché global de módulos
  const cacheKey = 'gb:modulos:nombres';
  let modulosMap = await cache.get(cacheKey); // { id: nombre, ... }

  if (!modulosMap) {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id, nombre FROM modulos');
    modulosMap = {};
    result.recordset.forEach((r) => { modulosMap[r.id] = r.nombre; });
    await cache.set(cacheKey, modulosMap, TTL_MODULOS_CACHE);
  }

  // Cargar modulosConfig para mapear nombre → claves
  const modulosConfig = require('../config/modulosConfig');

  const clavesPermitidas = new Set();
  moduloIds.forEach((id) => {
    const nombre = modulosMap[id];
    if (!nombre) return;
    const config = modulosConfig.find((c) => c.nombre === nombre);
    if (config) config.claves.forEach((c) => clavesPermitidas.add(c));
  });

  return clavesPermitidas;
}

// Filtra el catálogo de módulos según claves permitidas del usuario
function filtrarModulos(clavesPermitidas) {
  return MODULOS.filter((m) => {
    if (clavesPermitidas === null) return true;          // superadmin
    if (m.claves === null) return true;                  // módulo sin restricción
    return m.claves.some((c) => clavesPermitidas.has(c));
  }).map(({ claves, ...rest }) => ({
    text: `${rest.label} ${rest.descripcion}`,
    tipo: 'modulo',
    label: rest.label,
    ruta: rest.ruta,
    descripcion: rest.descripcion,
  }));
}

// Fetch candidatos desde SQL Server según permisos del usuario
async function fetchCandidatos(query, clavesPermitidas) {
  const pool = await poolPromise;
  const like = `%${query}%`;
  const candidatos = [];

  const tieneAcceso = (claves) =>
    clavesPermitidas === null || claves.some((c) => clavesPermitidas.has(c));

  // Empleados — requiere módulo 'Empleados'
  if (tieneAcceso(['empleados'])) {
    try {
      const r = await pool
        .request()
        .input('like', sql.VarChar, like)
        .query(`
          SELECT TOP 30 id, nombre, cargo, rut
          FROM empleados
          WHERE nombre LIKE @like OR cargo LIKE @like OR rut LIKE @like
        `);
      r.recordset.forEach((row) =>
        candidatos.push({
          text: `${row.nombre} ${row.cargo || ''}`.trim(),
          tipo: 'empleado',
          label: row.nombre,
          descripcion: row.cargo || 'Sin cargo',
          ruta: '/empleados',
          meta: `RUT ${row.rut || '—'}`,
        })
      );
    } catch {}
  }

  // Productos — requiere módulo 'Productos' o 'Consultar Producto'
  if (tieneAcceso(['productos', 'productos/consultar'])) {
    try {
      const r = await pool
        .request()
        .input('like', sql.VarChar, like)
        .query(`
          SELECT TOP 30 MP_CODIGO as codigo, MP_DESCRIPCION as descripcion, MP_FAM_DESCRIPCION as familia
          FROM ERP_MAESTRO_PRODUCTOS
          WHERE MP_DESCRIPCION LIKE @like OR MP_CODIGO LIKE @like
        `);
      r.recordset.forEach((row) =>
        candidatos.push({
          text: `${row.descripcion} ${row.familia || ''}`.trim(),
          tipo: 'producto',
          label: row.descripcion,
          descripcion: `Código: ${row.codigo}${row.familia ? ` · ${row.familia}` : ''}`,
          ruta: '/consultar-producto',
          meta: row.codigo,
        })
      );
    } catch {}
  }

  // Proveedores — requiere módulo 'Compras' o 'Proveedores Producto'
  if (tieneAcceso(['compras', 'productos/proveedores'])) {
    try {
      const r = await pool
        .request()
        .input('like', sql.VarChar, like)
        .query(`
          SELECT TOP 20 MP_NOMBRE as nombre, MP_RUT as rut
          FROM ERP_MAESTRO_PERSONAS
          WHERE MP_TPROV_ID_TIPO_PROVEEDOR IN (1,2)
            AND (MP_NOMBRE LIKE @like OR MP_RUT LIKE @like)
        `);
      r.recordset.forEach((row) =>
        candidatos.push({
          text: row.nombre,
          tipo: 'proveedor',
          label: row.nombre,
          descripcion: `RUT: ${row.rut || '—'}`,
          ruta: '/proveedores',
          meta: row.rut,
        })
      );
    } catch {}
  }

  return candidatos;
}

// GET /api/busqueda?q=texto
exports.buscar = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({ resultados: [] });
    }

    // Obtener claves permitidas del usuario logueado
    const clavesPermitidas = await getClavesPermitidas(req.user);

    // Candidatos filtrados por perfil
    const modulosCandidatos = filtrarModulos(clavesPermitidas);
    const dbCandidatos = await fetchCandidatos(query, clavesPermitidas);
    const todosCandidatos = [...modulosCandidatos, ...dbCandidatos];

    if (todosCandidatos.length === 0) {
      return res.json({ resultados: [] });
    }

    // Reordenar semánticamente
    const ranked = await semanticRank(query, todosCandidatos, 15);

    const resultados = ranked
      .filter((r) => r.score > 0.2)
      .map(({ score, text, ...rest }) => rest);

    res.json({ resultados, total: resultados.length });
  } catch (error) {
    console.error('Error en búsqueda semántica:', error);
    res.status(500).json({ error: 'Error al procesar la búsqueda' });
  }
};
