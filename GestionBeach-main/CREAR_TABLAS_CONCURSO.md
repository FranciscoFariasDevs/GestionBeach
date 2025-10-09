# Creación de Tablas para Concurso de Piscinas

## Instrucciones

1. Abre **SQL Server Management Studio (SSMS)**
2. Conéctate a tu servidor `SRV_LORD`
3. Selecciona la base de datos **Beachsql**
4. Copia y ejecuta cada script a continuación

---

## Script 1: Tabla de Participaciones

```sql
USE Beachsql;
GO

-- Eliminar tabla si existe (CUIDADO: esto borrará todos los datos)
-- IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[participaciones_concurso]') AND type in (N'U'))
-- BEGIN
--     DROP TABLE dbo.participaciones_concurso;
--     PRINT '🗑️ Tabla participaciones_concurso eliminada';
-- END
-- GO

-- Crear tabla de participaciones
CREATE TABLE dbo.participaciones_concurso (
    id INT IDENTITY(1,1) PRIMARY KEY,

    -- Datos personales
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    rut VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(255) NOT NULL,

    -- Datos de la boleta
    numero_boleta VARCHAR(50) NOT NULL,
    monto_boleta DECIMAL(18,2) NULL,
    fecha_boleta DATETIME NULL,
    tipo_documento VARCHAR(50) NULL,
    tipo_sucursal VARCHAR(50) NULL DEFAULT 'Supermercado',
    sucursal VARCHAR(100) NULL,

    -- Datos de la imagen
    ruta_imagen VARCHAR(500) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,

    -- Datos del OCR
    texto_extraido TEXT NULL,
    confianza_ocr DECIMAL(5,2) NULL,

    -- Control
    boleta_valida BIT NOT NULL DEFAULT 1,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    ganador BIT NOT NULL DEFAULT 0,
    premio VARCHAR(100) NULL,

    -- Fechas
    fecha_participacion DATETIME NOT NULL DEFAULT GETDATE(),
    fecha_modificacion DATETIME NULL,

    -- Índices para mejorar rendimiento
    INDEX IX_numero_boleta (numero_boleta),
    INDEX IX_rut (rut),
    INDEX IX_email (email),
    INDEX IX_fecha_participacion (fecha_participacion)
);

PRINT '✅ Tabla participaciones_concurso creada exitosamente';
GO
```

---

## Script 2: Tabla de Log de Intentos

```sql
USE Beachsql;
GO

-- Eliminar tabla si existe
-- IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[concurso_log_intentos]') AND type in (N'U'))
-- BEGIN
--     DROP TABLE dbo.concurso_log_intentos;
--     PRINT '🗑️ Tabla concurso_log_intentos eliminada';
-- END
-- GO

-- Crear tabla de log de intentos fallidos/rechazados
CREATE TABLE dbo.concurso_log_intentos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    numero_boleta VARCHAR(50) NOT NULL,
    email VARCHAR(100) NULL,
    motivo_rechazo VARCHAR(255) NOT NULL,
    fecha_intento DATETIME NOT NULL DEFAULT GETDATE(),

    INDEX IX_numero_boleta (numero_boleta),
    INDEX IX_fecha_intento (fecha_intento)
);

PRINT '✅ Tabla concurso_log_intentos creada exitosamente';
GO
```

---

## Verificar Creación

Ejecuta este script para verificar que las tablas se crearon correctamente:

```sql
USE Beachsql;
GO

-- Ver todas las tablas creadas
SELECT
    name AS NombreTabla,
    create_date AS FechaCreacion
FROM sys.tables
WHERE name IN ('participaciones_concurso', 'concurso_log_intentos')
ORDER BY name;

-- Ver estructura de participaciones_concurso
EXEC sp_help 'dbo.participaciones_concurso';

-- Ver estructura de concurso_log_intentos
EXEC sp_help 'dbo.concurso_log_intentos';

-- Contar registros (debe ser 0 si son tablas nuevas)
SELECT 'participaciones_concurso' AS Tabla, COUNT(*) AS TotalRegistros
FROM dbo.participaciones_concurso
UNION ALL
SELECT 'concurso_log_intentos', COUNT(*)
FROM dbo.concurso_log_intentos;
```

---

## Permisos

Si tienes problemas de permisos, ejecuta esto (reemplaza `TU_USUARIO` con tu usuario de SQL):

```sql
USE Beachsql;
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.participaciones_concurso TO [TU_USUARIO];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.concurso_log_intentos TO [TU_USUARIO];

PRINT '✅ Permisos otorgados correctamente';
GO
```

---

## Insertar Datos de Prueba (Opcional)

```sql
USE Beachsql;
GO

INSERT INTO dbo.participaciones_concurso (
    nombres, apellidos, rut, email, telefono, direccion,
    numero_boleta, monto_boleta, fecha_boleta, tipo_documento, tipo_sucursal,
    ruta_imagen, nombre_archivo,
    texto_extraido, confianza_ocr,
    boleta_valida, estado
)
VALUES (
    'Juan', 'Pérez', '12345678-9', 'juan.perez@email.com', '+56912345678', 'Av. Principal 123',
    '123456', 10000, '2025-10-08', 'Boleta', 'Supermercado',
    '/uploads/concurso-piscinas/test.jpg', 'test.jpg',
    'Texto de prueba', 85.50,
    1, 'activo'
);

PRINT '✅ Registro de prueba insertado';
GO

-- Ver el registro insertado
SELECT * FROM dbo.participaciones_concurso;
GO
```

---

## Eliminar Tablas (Solo si necesitas empezar de nuevo)

⚠️ **CUIDADO**: Esto borrará TODOS los datos

```sql
USE Beachsql;
GO

-- Eliminar tablas
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[participaciones_concurso]') AND type in (N'U'))
BEGIN
    DROP TABLE dbo.participaciones_concurso;
    PRINT '🗑️ Tabla participaciones_concurso eliminada';
END

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[concurso_log_intentos]') AND type in (N'U'))
BEGIN
    DROP TABLE dbo.concurso_log_intentos;
    PRINT '🗑️ Tabla concurso_log_intentos eliminada';
END
GO
```

---

## Notas Importantes

1. **Esquema**: Las tablas se crean en el esquema `dbo` (por defecto)
2. **Identity**: El campo `id` se autoincrementa automáticamente
3. **Índices**: Se crean índices en campos que se consultan frecuentemente (numero_boleta, rut, email)
4. **Valores por defecto**: Algunos campos tienen valores por defecto (estado='activo', etc.)
5. **Múltiples boletas por RUT/Email**: Se permite que un mismo RUT o email registre múltiples boletas diferentes
6. **Validación de fecha**: La fecha de la boleta debe ser desde el 08-10-2025 en adelante
7. **Validación mínima**: Solo valida que la imagen tenga texto legible (no esté borrosa)

---

## Troubleshooting

### Error: "Invalid object name 'participaciones_concurso'"
**Solución**: Verifica que ejecutaste el script en la base de datos correcta (Beachsql)

### Error: "Permission denied"
**Solución**: Tu usuario necesita permisos CREATE TABLE. Contacta al administrador de BD

### Las tablas ya existen
**Solución**: Si quieres recrearlas, descomenta y ejecuta la sección de DROP TABLE primero

### No puedo ver las tablas
**Solución**: En SSMS, expande: Bases de datos → Beachsql → Tablas → Actualizar (F5)
