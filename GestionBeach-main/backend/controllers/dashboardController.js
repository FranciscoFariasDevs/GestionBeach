// backend/controllers/dashboardController.js - DATOS REALES SÚPER RÁPIDO
const { sql, poolPromise } = require('../config/db');

// Función para obtener datos del dashboard - DATOS REALES OPTIMIZADO
exports.getDashboardData = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    console.log('🚀 Dashboard RÁPIDO con datos reales:', { start_date, end_date });
    
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Las fechas son requeridas' });
    }
    
    // Obtener pool de conexión
    const pool = await poolPromise;
    
    // ✅ OBTENER SOLO 5 SUCURSALES PRINCIPALES PARA VELOCIDAD
    console.log('📋 Obteniendo sucursales principales...');
    
    const sucursalesResult = await pool.request()
      .query(`
        SELECT  id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal
        FROM sucursales
        WHERE tipo_sucursal IN ('SUPERMERCADO', 'FERRETERIA', 'MULTITIENDA')
        ORDER BY id
      `);
    
    const sucursales = sucursalesResult.recordset;
    console.log(`✅ Procesando ${sucursales.length} sucursales principales`);
    
    // Preparar resultados
    const resultados = {
      supermercados: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] },
      ferreterias: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] },
      multitiendas: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] }
    };
    
    let contadorSuper = 0, contadorFerreterias = 0, contadorMultitienda = 0;
    
    // Procesar cada sucursal con timeout MUY CORTO
    for (const sucursal of sucursales) {
      try {
        console.log(`🔍 Procesando: ${sucursal.nombre}`);
        
        if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
          console.warn(`⚠️ ${sucursal.nombre} sin datos conexión`);
          continue;
        }
        
        const configSucursal = {
          user: sucursal.usuario,
          password: sucursal.contrasena || '',
          server: sucursal.ip,
          database: sucursal.base_datos,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 3000, // 3 segundos máximo
            connectionTimeout: 2000 // 2 segundos conexión
          },
          pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }
        };
        
        let poolSucursal;
        try {
          // Conexión con timeout SÚPER CORTO
          poolSucursal = await Promise.race([
            new sql.ConnectionPool(configSucursal).connect(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 1500) // 1.5 segundos máximo
            )
          ]);
        } catch (connectionError) {
          console.warn(`⚠️ ${sucursal.nombre}: ${connectionError.message}`);
          continue;
        }
        
        // Procesar datos con timeout
        let procesoExitoso = false;
        
        try {
          if (sucursal.tipo_sucursal === 'SUPERMERCADO') {
            procesoExitoso = await Promise.race([
              procesarDatosSupermercado(poolSucursal, sucursal, start_date, end_date, resultados.supermercados),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorSuper++;
          } else if (sucursal.tipo_sucursal === 'FERRETERIA') {
            procesoExitoso = await Promise.race([
              procesarDatosFerreteria(poolSucursal, sucursal, start_date, end_date, resultados.ferreterias),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorFerreterias++;
          } else if (sucursal.tipo_sucursal === 'MULTITIENDA') {
            procesoExitoso = await Promise.race([
              procesarDatosMultitienda(poolSucursal, sucursal, start_date, end_date, resultados.multitiendas),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorMultitienda++;
          }
        } catch (processError) {
          console.warn(`⚠️ ${sucursal.nombre}: Query timeout`);
        }
        
        // Cerrar conexión
        try { await poolSucursal.close(); } catch {}
        
        console.log(`✅ ${sucursal.nombre}: ${procesoExitoso ? 'OK' : 'SKIP'}`);
        
      } catch (error) {
        console.warn(`⚠️ ${sucursal.nombre}: ${error.message}`);
        continue;
      }
    }
    
    // Calcular promedios
    if (contadorSuper > 0) resultados.supermercados.margen /= contadorSuper;
    if (contadorFerreterias > 0) resultados.ferreterias.margen /= contadorFerreterias;
    if (contadorMultitienda > 0) resultados.multitiendas.margen /= contadorMultitienda;
    
    // Calcular totales
    resultados.total = {
      ventas: resultados.supermercados.ventas + resultados.ferreterias.ventas + resultados.multitiendas.ventas,
      costos: resultados.supermercados.costos + resultados.ferreterias.costos + resultados.multitiendas.costos,
      utilidad: resultados.supermercados.utilidad + resultados.ferreterias.utilidad + resultados.multitiendas.utilidad,
      margen: 0
    };
    
    const totalContador = contadorSuper + contadorFerreterias + contadorMultitienda;
    if (totalContador > 0) {
      resultados.total.margen = (
        (resultados.supermercados.margen * contadorSuper) +
        (resultados.ferreterias.margen * contadorFerreterias) +
        (resultados.multitiendas.margen * contadorMultitienda)
      ) / totalContador;
    }
    
    console.log(`✅ Dashboard RÁPIDO completado: ${totalContador} sucursales`);
    console.log('📊 Total ventas:', resultados.total.ventas.toLocaleString());
    
    return res.status(200).json(resultados);
    
  } catch (error) {
    console.error('❌ Error dashboard:', error);
    
    // FALLBACK: Devolver estructura vacía pero válida
    return res.status(200).json({
      supermercados: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] },
      ferreterias: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] },
      multitiendas: { ventas: 0, costos: 0, utilidad: 0, margen: 0, sucursales: [] },
      total: { ventas: 0, costos: 0, utilidad: 0, margen: 0 },
      message: 'Datos parciales por problemas de conexión'
    });
  }
};

// FUNCIONES OPTIMIZADAS CON QUERIES MÁS SIMPLES
async function procesarDatosSupermercado(pool, sucursal, startDate, endDate, resultados) {
  try {
    const query = `
      SELECT 
        SUM(tdd.dq_bruto) AS VENTA, 
        SUM(((tdd.dq_bruto / 1.19) - dq_ganancia) * 1.19) AS COSTO, 
        SUM(dq_ganancia * 1.19) AS Utilidad,
        AVG((dq_ganancia / (tdd.dq_bruto / 1.19)) * 100) AS Margen
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate 
        AND dc_codigo_centralizacion IN ('0033', '0039','1599') 
        AND dn_correlativo_caja IS NOT NULL
    `;
    
    const result = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(query);
    
    if (result.recordset.length > 0) {
      const data = result.recordset[0];
      const ventas = parseFloat(data.VENTA) || 0;
      const costos = parseFloat(data.COSTO) || 0;
      const utilidad = parseFloat(data.Utilidad) || 0;
      const margen = parseFloat(data.Margen) || 0;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen
      });
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function procesarDatosFerreteria(pool, sucursal, startDate, endDate, resultados) {
  try {
    const query = `
      SELECT 
        AVG(MARGEN) MARGEN, SUM(COSTO) COSTO, SUM(VENTA) VENTA, SUM(VENTA-COSTO) Utilidad  
      FROM cmv_beach
      WHERE CAST(fecha AS DATE) BETWEEN @startDate AND @endDate
    `;
    
    const result = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(query);
    
    if (result.recordset.length > 0) {
      const data = result.recordset[0];
      const ventas = parseFloat(data.VENTA) || 0;
      const costos = parseFloat(data.COSTO) || 0;
      const utilidad = parseFloat(data.Utilidad) || 0;
      const margen = parseFloat(data.MARGEN) || 0;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen
      });
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function procesarDatosMultitienda(pool, sucursal, startDate, endDate, resultados) {
  try {
    const query = `
      SELECT 
        AVG(MARGEN) MARGEN, SUM(COSTO) COSTO, SUM(VENTA) VENTA, SUM(VENTA-COSTO) Utilidad  
      FROM cmv_beach
      WHERE CAST(fecha AS DATE) BETWEEN @startDate AND @endDate
    `;
    
    const result = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(query);
    
    if (result.recordset.length > 0) {
      const data = result.recordset[0];
      const ventas = parseFloat(data.VENTA) || 0;
      const costos = parseFloat(data.COSTO) || 0;
      const utilidad = parseFloat(data.Utilidad) || 0;
      const margen = parseFloat(data.MARGEN) || 0;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen
      });
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}