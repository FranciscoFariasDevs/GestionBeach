-- ============================================
-- ACTUALIZAR PORCENTAJE ACH MANUALMENTE
-- ============================================
--
-- INSTRUCCIONES:
-- 1. Reemplaza el valor X.XX con el porcentaje correcto que TÚ quieres usar
-- 2. Verifica que el ID del período sea correcto (actualmente 6 = Diciembre 2025)
-- 3. Ejecuta este script en SQL Server Management Studio
--
-- ============================================

-- Ver configuración actual
SELECT
    ppp.id,
    pr.descripcion as periodo,
    rs.nombre_razon,
    ppp.caja_compen,
    ppp.afc,
    ppp.sis,
    ppp.ach AS ach_actual,
    ppp.imposiciones
FROM porcentajes_por_periodo ppp
LEFT JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
WHERE ppp.id = 6; -- Diciembre 2025

-- ============================================
-- ACTUALIZAR ACH
-- ============================================
-- 🔥 CAMBIA EL VALOR 0.93 POR EL PORCENTAJE QUE TÚ QUIERAS
-- Ejemplo: Si usas 0.93%, déjalo así
--          Si usas 0.95%, cambia a 0.95
--          Si usas otro valor, cámbialo

UPDATE porcentajes_por_periodo
SET ach = 0.93,  -- ← CAMBIA ESTE VALOR
    updated_at = GETDATE()
WHERE id = 6; -- Diciembre 2025

-- Ver configuración actualizada
SELECT
    ppp.id,
    pr.descripcion as periodo,
    rs.nombre_razon,
    ppp.caja_compen,
    ppp.afc,
    ppp.sis,
    ppp.ach AS ach_nuevo,
    ppp.imposiciones
FROM porcentajes_por_periodo ppp
LEFT JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
WHERE ppp.id = 6; -- Diciembre 2025

-- ============================================
-- ✅ LISTO! Ahora ACH se calculará correctamente
-- ============================================
