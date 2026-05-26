// backend/controllers/comparadorController.js
// Migración del módulo Comparador.vb → Node.js
// Consulta stock + precio de productos encadenados en todas las sucursales ERP en paralelo.

const { sql, poolPromise } = require('../config/db');

// ─── Pool cache de conexiones ERP (mismo patrón que planificacion) ─────────────
const erpPoolCache = new Map();

const getPoolSucursal = async (sucursal) => {
  const cached = erpPoolCache.get(sucursal.id);
  if (cached && cached.pool && cached.pool.connected) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }
  if (cached) {
    try { await cached.pool.close(); } catch {}
    erpPoolCache.delete(sucursal.id);
  }
  const config = {
    user:     sucursal.usuario,
    password: sucursal.contrasena || '',
    server:   sucursal.ip,
    port:     sucursal.puerto || 1433,
    database: sucursal.base_datos,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 12000,
      connectionTimeout: 6000,
    },
    pool: { max: 2, min: 0, idleTimeoutMillis: 60000 },
  };
  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de conexión')), 6000)
    ),
  ]);
  erpPoolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  return pool;
};

// Limpiar pools inactivos cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of erpPoolCache) {
    if (now - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      erpPoolCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ─── Obtener sucursales ERP disponibles ───────────────────────────────────────
const obtenerSucursalesERP = async () => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT id, nombre, ip, base_datos, usuario, contrasena, puerto
     FROM sucursales
     WHERE ip IS NOT NULL AND ip <> ''
       AND base_datos IS NOT NULL AND base_datos <> ''
       AND usuario IS NOT NULL AND usuario <> ''
       AND ISNULL(tipo_sucursal,'') <> 'SUPERMERCADO'
       AND nombre NOT LIKE '%1440%'
       AND nombre NOT LIKE '%3088%'
       AND nombre NOT LIKE '%Tres Esquinas%Coelemu%MU%'
     ORDER BY id`
  );
  return r.recordset;
};

// ─── Sanitizar input para LIKE (evitar inyección en strings dinámicos) ────────
const sanitizar = (str) => String(str || '').replace(/'/g, "''").replace(/[%_\[]/g, '[$&]');

// ─── Tabla por sucursal ───────────────────────────────────────────────────────
// MULTIBODEGA (MBS_EXISTENCIAS):
//   - RUTA EL CONQUISTADOR 1002, QUIRIHUE
//   - TRES ESQUINAS S/N, COELEMU FE
//
// STOCK NORMAL (BMS_EXISTENCIAS):
//   - VICENTE PALACIOS 2908, TOME
//   - RIO VIEJO 999, CHILLAN
//   - LAS CAMELIAS 39, TOME

const SUCURSALES_MULTIBODEGA = [
  'ruta el conquistador 1002, quirihue',
  'tres esquinas s/n, coelemu fe',
];

const usaMultibodega = (sucursal) => {
  const n = sucursal.nombre.toLowerCase().trim();
  return SUCURSALES_MULTIBODEGA.some(nombre => n.includes(nombre));
};

// ─── Builders de query ────────────────────────────────────────────────────────
const queryStock = (filtro) =>
  `SELECT TOP 500
     mp.MP_CODIGO_PRODUCTO       AS codigo,
     mp.MP_DESCRIPCION_PRODUCTO  AS descripcion,
     ISNULL(bms.BMS_EXISTENCIAS, 0)                              AS stock,
     ISNULL(CONVERT(numeric(18,0), mp.MP_PRECIO_VENTA_FINAL), 0) AS precio
   FROM ERP_BOD_MERCADERIA_STOCK bms
   JOIN ERP_MAESTRO_PRODUCTOS mp ON mp.MP_CODIGO_PRODUCTO = bms.MP_CODIGO_PRODUCTO
   WHERE mp.TPROV_ID_TIPO_PROVEEDOR = 3
     AND mp.EP_ID_ESTADO = 2
     ${filtro}
   ORDER BY mp.MP_DESCRIPCION_PRODUCTO`;

const queryMultibodega = (filtro) =>
  `SELECT TOP 500
     mp.MP_CODIGO_PRODUCTO       AS codigo,
     mp.MP_DESCRIPCION_PRODUCTO  AS descripcion,
     ISNULL(bms.MBS_EXISTENCIAS, 0)                              AS stock,
     ISNULL(CONVERT(numeric(18,0), mp.MP_PRECIO_VENTA_FINAL), 0) AS precio
   FROM ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA bms
   JOIN ERP_MAESTRO_PRODUCTOS mp ON mp.MP_CODIGO_PRODUCTO = bms.MP_CODIGO_PRODUCTO
   WHERE mp.TPROV_ID_TIPO_PROVEEDOR = 3
     AND mp.EP_ID_ESTADO = 2
     AND bms.MBOD_ID_BODEGA = 1
     ${filtro}
   ORDER BY mp.MP_DESCRIPCION_PRODUCTO`;

// ─── Consultar productos de una sucursal ──────────────────────────────────────
// Quirihue y Coelemu → MULTIBODEGA directo (MBS_EXISTENCIAS)
// Resto              → STOCK normal primero (BMS_EXISTENCIAS), fallback a MULTIBODEGA
const consultarSucursal = async (sucursal, busqueda, campo) => {
  try {
    const pool = await getPoolSucursal(sucursal);

    let clausulaFiltro = '';
    if (busqueda && busqueda.trim()) {
      const term = sanitizar(busqueda.trim());
      clausulaFiltro = campo === 'codigo'
        ? `AND mp.MP_CODIGO_PRODUCTO LIKE N'%${term}%'`
        : `AND mp.MP_DESCRIPCION_PRODUCTO LIKE N'%${term}%'`;
    }

    // Orden de tablas a intentar según la sucursal
    const queries = usaMultibodega(sucursal)
      ? [queryMultibodega(clausulaFiltro)]                          // Quirihue, Coelemu → solo multibodega
      : [queryStock(clausulaFiltro), queryMultibodega(clausulaFiltro)]; // Resto → stock normal, fallback multibodega

    for (const q of queries) {
      try {
        const result = await pool.request().query(q);
        return {
          id:        sucursal.id,
          nombre:    sucursal.nombre,
          productos: result.recordset,
          total:     result.recordset.length,
          error:     null,
        };
      } catch (e) {
        const msg = e.message.toLowerCase();
        if (msg.includes('invalid object') || msg.includes('objeto no válido')) continue;
        throw e;
      }
    }

    return { id: sucursal.id, nombre: sucursal.nombre, productos: [], total: 0, error: 'Tabla de stock no encontrada en este ERP' };

  } catch (err) {
    console.warn(`[Comparador] ${sucursal.nombre}: ${err.message}`);
    return { id: sucursal.id, nombre: sucursal.nombre, productos: [], total: 0, error: err.message };
  }
};

// ─── GET /api/comparador/productos ────────────────────────────────────────────
// Query params:
//   busqueda  — término a buscar (string, opcional)
//   campo     — 'descripcion' (default) | 'codigo'
exports.getProductos = async (req, res) => {
  try {
    const { busqueda = '', campo = 'descripcion' } = req.query;

    const sucursales = await obtenerSucursalesERP();

    // Consultar todas las sucursales en paralelo
    const resultados = await Promise.all(
      sucursales.map(s => consultarSucursal(s, busqueda, campo))
    );

    const online  = resultados.filter(r => !r.error).length;
    const offline = resultados.filter(r => r.error).length;

    res.json({
      success: true,
      total_sucursales: sucursales.length,
      online,
      offline,
      sucursales: resultados,
    });
  } catch (err) {
    console.error('[Comparador] getProductos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
