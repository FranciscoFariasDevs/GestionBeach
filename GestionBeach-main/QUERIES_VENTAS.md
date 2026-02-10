# Queries de Ventas - GestionBeach

Este documento contiene las queries SQL utilizadas en los diferentes módulos del sistema.

---

## 1. DASHBOARD PAGE

**Archivo:** `backend/controllers/dashboardController.js`

### 1.1 Supermercados - Ventas

```sql
SELECT
  SUM(CASE
    WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033'
      THEN (tdd.dq_bruto / 1.19)
    WHEN tde.dc_codigo_centralizacion = '1599'
      THEN tdd.dq_bruto
  END) AS VENTA,

  SUM(CASE
    WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033'
      THEN (tdd.dq_bruto / 1.19) - dq_ganancia
    WHEN tde.dc_codigo_centralizacion = '1599'
      THEN tdd.dq_bruto - dq_ganancia
  END) AS COSTO,

  SUM(dq_ganancia) AS UTILIDAD,

  AVG(CASE
    WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033'
      THEN (dq_ganancia / (tdd.dq_bruto / 1.19)) * 100
    WHEN tde.dc_codigo_centralizacion = '1599'
      THEN (dq_ganancia / tdd.dq_bruto) * 100
  END) AS MARGEN

FROM tb_documentos_detalle tdd
JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
  AND dc_codigo_centralizacion IN ('0033','0039','1599')
  AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
  AND dn_correlativo_caja IS NOT NULL
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `tb_documentos_detalle` | Detalle de documentos |
| `tb_documentos_encabezado` | Encabezado de documentos |

---

### 1.2 Supermercados - Notas de Crédito

```sql
SELECT SUM(CASE
  WHEN tde.dc_codigo_centralizacion = '0061'
    THEN (tdd.dq_bruto / 1.19)
  END) AS NotasCredito
FROM tb_documentos_detalle tdd
JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
  AND dc_codigo_centralizacion IN ('0061')
  AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
  AND dn_correlativo_caja IS NOT NULL
```

---

### 1.3 Ferreterías / Multitiendas - Ventas

```sql
SELECT
  SUM(Total) AS Venta,
  SUM(Costo) AS COSTO,
  SUM(Utilidad) AS Utilidad,
  (SUM(Utilidad)/SUM(Total))*100 AS Margen
FROM (
  -- BOLETAS
  SELECT
    RBO.RBO_FECHA_INGRESO AS Fecha,
    RBO.RBO_NUMERO_BOLETA AS Folio,
    'Boleta' AS Doc,
    MC.MC_RAZON_SOCIAL AS Cliente,
    CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente,
    SUM(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) AS Total,
    SUM(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) AS Costo,
    SUM(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) AS Utilidad,
    ((SUM(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD)) / SUM(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD)) * 100 AS Margen,
    MPE.MPE_NOMBRE_COMPLETO AS Vendedor
  FROM ERP_FACT_RES_BOLETAS rbo
  JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
  JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
  JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
    AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
  GROUP BY RBO.RBO_FECHA_INGRESO, RBO.RBO_NUMERO_BOLETA, rbo.MC_RUT_CLIENTE,
           MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO

  UNION ALL

  -- FACTURAS
  SELECT
    RBO.RFC_FECHA_INGRESO AS Fecha,
    RBO.RFC_NUMERO_FACTURA_CLI AS Folio,
    'Factura' AS Doc,
    MC.MC_RAZON_SOCIAL AS Cliente,
    CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente,
    SUM(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) AS Total,
    SUM(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) AS Costo,
    SUM(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) AS Utilidad,
    ((SUM(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD)) / SUM(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD)) * 100 AS Margen,
    MPE.MPE_NOMBRE_COMPLETO AS Vendedor
  FROM ERP_FACT_RES_FACTURA_CLIENTES rbo
  JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
  JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
  JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
    AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
    AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
  GROUP BY RBO.RFC_FECHA_INGRESO, RBO.RFC_NUMERO_FACTURA_CLI, rbo.MC_RUT_CLIENTE,
           MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
) t
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `ERP_FACT_RES_BOLETAS` | Resumen de boletas |
| `ERP_FACT_DET_BOLETAS` | Detalle de boletas |
| `ERP_FACT_RES_FACTURA_CLIENTES` | Resumen de facturas |
| `ERP_FACT_DET_FACTURA_CLIENTES` | Detalle de facturas |
| `ERP_OP_RES_ORDEN_COMPRA` | Órdenes de compra |
| `ERP_USUARIOS_SISTEMAS` | Usuarios del sistema |
| `ERP_MAESTRO_PERSONAS` | Maestro de personas |
| `ERP_MAESTRO_CLIENTES` | Maestro de clientes |

---

### 1.4 Ferreterías / Multitiendas - Notas de Crédito

```sql
SELECT
  SUM([Costo NC]) AS [Costo NC],
  SUM([NC Aplicada]) AS [NC],
  SUM([NC Aplicada]) - SUM([Costo NC]) AS [Utilidad NC]
FROM (
  SELECT
    ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
    ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
  FROM ERP_OP_DET_ORDEN_COMPRA DOC
  FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
  FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
  JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
  FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI
    AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
  FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
  FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE
    MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
    AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
    AND MP.TPROV_ID_TIPO_PROVEEDOR = 3
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'

  UNION ALL

  SELECT
    ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
    ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
  FROM ERP_OP_DET_ORDEN_COMPRA DOC
  FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
  FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
  JOIN ERP_FACT_RES_FACTURA_CLIENTES RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
  FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI
    AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
  FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
  FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE
    MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
    AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
    AND MP.TPROV_ID_TIPO_PROVEEDOR = 3
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
    AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
    AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
    AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
    AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
    AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
) T
```

**Tablas adicionales:**
| Tabla | Descripción |
|-------|-------------|
| `ERP_OP_DET_ORDEN_COMPRA` | Detalle de órdenes de compra |
| `ERP_MAESTRO_PRODUCTOS` | Maestro de productos |
| `ERP_FACT_RES_NC_CLIENTE` | Resumen de notas de crédito |
| `ERP_FACT_DET_NC_CLIENTE` | Detalle de notas de crédito |

---

## 2. ESTADO DE RESULTADOS PAGE

**Archivo:** `backend/controllers/estadoResultadosController.js`

### 2.1 Obtener Ventas

```sql
SELECT
  v.id,
  v.fecha,
  v.total AS monto_total,
  v.sucursal_id,
  v.numero_boleta,
  v.tipo_venta,
  v.metodo_pago,
  s.nombre AS sucursal_nombre,
  rs.nombre_razon
FROM ventas v
LEFT JOIN sucursales s ON v.sucursal_id = s.id
LEFT JOIN razones_sociales rs ON s.id_razon_social = rs.id
WHERE v.fecha BETWEEN @fecha_desde AND @fecha_hasta
  AND v.sucursal_id = @sucursal_id
  AND v.total > 0
ORDER BY v.fecha DESC
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `ventas` | Tabla de ventas |
| `sucursales` | Maestro de sucursales |
| `razones_sociales` | Maestro de razones sociales |

---

### 2.2 Obtener Compras (Facturas XML)

```sql
SELECT
  fe.ID AS id,
  fe.FOLIO AS folio,
  fe.FECHA_EMISION AS fecha_emision,
  fe.RUT_EMISOR AS rut_proveedor,
  fe.RZN_EMISOR AS razon_social_proveedor,
  fe.MONTO_NETO AS monto_neto,
  fe.IVA AS monto_iva,
  fe.MONTO_TOTAL AS monto_total,
  fe.id_sucursal,
  fe.estado,
  s.nombre AS sucursal_nombre,
  rs.nombre_razon
FROM TB_FACTURA_ENCABEZADO fe
LEFT JOIN sucursales s ON fe.id_sucursal = s.id
LEFT JOIN razones_sociales rs ON s.id_razon_social = rs.id
WHERE fe.FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta
  AND fe.estado = 'PROCESADA'
  AND fe.MONTO_TOTAL > 0
  AND fe.id_sucursal = @sucursal_id
ORDER BY fe.FECHA_EMISION DESC
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `TB_FACTURA_ENCABEZADO` | Facturas de compra (XML) |
| `sucursales` | Maestro de sucursales |
| `razones_sociales` | Maestro de razones sociales |

---

### 2.3 Obtener Remuneraciones (con clasificación Admin/Ventas)

```sql
SELECT
  -- Datos de remuneración
  dr.liquido_pagar,
  dr.seguro_cesantia,
  dr.sueldo_base,
  dr.total_haberes,
  dr.total_descuentos,
  dr.descuentos_varios,
  dr.total_imponibles,
  dr.imposiciones,
  dr.rut_empleado,
  dr.nombre_empleado,
  dr.total_costo,

  -- Datos del período
  pr.mes,
  pr.anio,
  pr.id_periodo,

  -- Datos de empleado y sucursal
  COALESCE(es.id_sucursal, @sucursal_id) AS id_sucursal,
  e.id AS id_empleado,
  e.id_razon_social,
  COALESCE(s.nombre, 'Sucursal Seleccionada') AS sucursal_nombre,
  rs.nombre_razon,
  e.nombre AS empleado_nombre,
  e.apellido AS empleado_apellido,

  -- Clasificación automática
  COALESCE(ems.num_sucursales, 1) AS num_sucursales,
  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1 THEN 'ADMINISTRATIVO'
    ELSE 'VENTAS'
  END AS tipo_empleado,

  -- Cálculo de porción del sueldo para esta sucursal
  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.liquido_pagar AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.liquido_pagar AS DECIMAL(18,2))
  END AS liquido_pagar_asignado,

  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.descuentos_varios AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.descuentos_varios AS DECIMAL(18,2))
  END AS descuentos_asignados,

  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.sueldo_base AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.sueldo_base AS DECIMAL(18,2))
  END AS sueldo_base_asignado,

  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.total_haberes AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.total_haberes AS DECIMAL(18,2))
  END AS total_haberes_asignado,

  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.total_imponibles AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.total_imponibles AS DECIMAL(18,2))
  END AS total_imponibles_asignado,

  CASE
    WHEN COALESCE(ems.num_sucursales, 1) > 1
    THEN CAST(dr.imposiciones AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
    ELSE CAST(dr.imposiciones AS DECIMAL(18,2))
  END AS imposiciones_asignadas

FROM datos_remuneraciones AS dr
INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
INNER JOIN empleados AS e ON
  REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
  REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id
  AND es.activo = 1
  AND es.id_sucursal = @sucursal_id
LEFT JOIN (
  SELECT id_empleado, COUNT(*) AS num_sucursales
  FROM empleados_sucursales
  WHERE activo = 1
  GROUP BY id_empleado
) ems ON ems.id_empleado = e.id
LEFT JOIN sucursales s ON es.id_sucursal = s.id
LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
WHERE pr.anio = @anio
  AND pr.mes = @mes
  AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
  AND es.id_sucursal = @sucursal_id
ORDER BY tipo_empleado DESC, dr.nombre_empleado
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `datos_remuneraciones` | Datos de remuneraciones |
| `periodos_remuneracion` | Períodos de remuneración |
| `empleados` | Maestro de empleados |
| `empleados_sucursales` | Relación empleados-sucursales |
| `sucursales` | Maestro de sucursales |
| `razones_sociales` | Maestro de razones sociales |

---

## 3. VENTAS PAGE

**Archivo:** `backend/controllers/ventasController.js`

### 3.1 Supermercados - Detalle de Ventas

```sql
SELECT
  tde.dn_numero_documento AS Folio,
  ISNULL(re.dg_razon_social, 'Sin vendedor') AS Vendedor,
  CASE
    WHEN tde.dc_codigo_centralizacion = '1599' THEN 'CLIENTE GENERICO'
    ELSE ISNULL(tde.dg_razon_social, 'Sin cliente')
  END AS Cliente,
  ISNULL(tde.dc_rut_documento, '') AS Rut_Cliente,
  CASE
    WHEN tde.dc_codigo_centralizacion = '1599' THEN ISNULL(tde.dq_bruto, 0)
    ELSE ISNULL(tde.dq_neto, 0)
  END AS Neto,
  CASE
    WHEN tde.dc_codigo_centralizacion = '1599' THEN 0
    ELSE ISNULL(tde.dq_iva, 0)
  END AS Iva,
  ISNULL(tde.dq_bruto, 0) AS Total,
  CASE
    WHEN tde.dc_codigo_centralizacion = '0033' THEN 'Factura'
    WHEN tde.dc_codigo_centralizacion = '0039' THEN 'Boleta'
    WHEN tde.dc_codigo_centralizacion = '1599' THEN 'Venta Cigarros'
    ELSE 'Otro'
  END AS Doc,
  tde.df_fecha_emision AS Fecha
FROM tb_documentos_encabezado tde
LEFT JOIN tb_rut_encabezado re ON re.dc_rut = tde.dc_rut_crea_documento
WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
  AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
  AND tde.dn_correlativo_caja IS NOT NULL
  AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
ORDER BY tde.df_fecha_emision DESC
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `tb_documentos_encabezado` | Encabezado de documentos |
| `tb_rut_encabezado` | Encabezado de RUT |

---

### 3.2 Ferreterías / Multitiendas - Detalle de Ventas

```sql
SELECT Folio, Vendedor, Cliente, Rut_Cliente, Total AS Neto, Total*0.19 AS Iva,
       Total+(Total*0.19) AS Total, Doc, Fecha
FROM (
  -- BOLETAS
  SELECT
    RBO.RBO_FECHA_INGRESO AS Fecha,
    RBO.RBO_NUMERO_BOLETA AS Folio,
    'Boleta' AS Doc,
    MC.MC_RAZON_SOCIAL AS Cliente,
    CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente,
    SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) AS Total,
    SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD) AS Costo,
    SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD) AS Utilidad,
    ((SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD))
      / NULLIF(SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD), 0)) * 100 AS Margen,
    MPE.MPE_NOMBRE_COMPLETO AS Vendedor
  FROM ERP_FACT_RES_BOLETAS rbo
  JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
  JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
  JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
    AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
  GROUP BY RBO.RBO_FECHA_INGRESO, RBO.RBO_NUMERO_BOLETA, rbo.MC_RUT_CLIENTE,
           MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO

  UNION ALL

  -- FACTURAS
  SELECT
    RBO.RFC_FECHA_INGRESO AS Fecha,
    RBO.RFC_NUMERO_FACTURA_CLI AS Folio,
    'Factura' AS Doc,
    MC.MC_RAZON_SOCIAL AS Cliente,
    CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente,
    SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) AS Total,
    SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD) AS Costo,
    SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD) AS Utilidad,
    ((SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD))
      / NULLIF(SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD), 0)) * 100 AS Margen,
    MPE.MPE_NOMBRE_COMPLETO AS Vendedor
  FROM ERP_FACT_RES_FACTURA_CLIENTES rbo
  JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
  JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
  JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
  JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
  JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
  WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1')
    AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
    AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
    AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
    AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
  GROUP BY RBO.RFC_FECHA_INGRESO, RBO.RFC_NUMERO_FACTURA_CLI, rbo.MC_RUT_CLIENTE,
           MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
) t
ORDER BY t.Fecha DESC
```

**Tablas:**
| Tabla | Descripción |
|-------|-------------|
| `ERP_FACT_RES_BOLETAS` | Resumen de boletas |
| `ERP_FACT_DET_BOLETAS` | Detalle de boletas |
| `ERP_FACT_RES_FACTURA_CLIENTES` | Resumen de facturas |
| `ERP_FACT_DET_FACTURA_CLIENTES` | Detalle de facturas |
| `ERP_OP_RES_ORDEN_COMPRA` | Órdenes de compra |
| `ERP_USUARIOS_SISTEMAS` | Usuarios del sistema |
| `ERP_MAESTRO_PERSONAS` | Maestro de personas |
| `ERP_MAESTRO_CLIENTES` | Maestro de clientes |

---

## Resumen de Tablas por Sistema

### Base de Datos Central (GestionBeach)
- `ventas`
- `sucursales`
- `razones_sociales`
- `TB_FACTURA_ENCABEZADO`
- `datos_remuneraciones`
- `periodos_remuneracion`
- `empleados`
- `empleados_sucursales`
- `estados_resultados`

### Base de Datos Supermercados
- `tb_documentos_encabezado`
- `tb_documentos_detalle`
- `tb_rut_encabezado`

### Base de Datos Ferreterías / Multitiendas (ERP)
- `ERP_FACT_RES_BOLETAS`
- `ERP_FACT_DET_BOLETAS`
- `ERP_FACT_RES_FACTURA_CLIENTES`
- `ERP_FACT_DET_FACTURA_CLIENTES`
- `ERP_OP_RES_ORDEN_COMPRA`
- `ERP_OP_DET_ORDEN_COMPRA`
- `ERP_USUARIOS_SISTEMAS`
- `ERP_MAESTRO_PERSONAS`
- `ERP_MAESTRO_CLIENTES`
- `ERP_MAESTRO_PRODUCTOS`
- `ERP_FACT_RES_NC_CLIENTE`
- `ERP_FACT_DET_NC_CLIENTE`
