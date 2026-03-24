-- Simplificar tabla de permisos modulares
-- SOLO perfil + módulo + sucursal (sin permisos granulares)

-- Eliminar tabla anterior si existe
IF OBJECT_ID('perfil_modulo_sucursal', 'U') IS NOT NULL
BEGIN
    DROP TABLE perfil_modulo_sucursal;
    PRINT 'Tabla perfil_modulo_sucursal eliminada';
END;

-- Crear tabla simplificada
CREATE TABLE perfil_modulo_sucursal (
    id INT IDENTITY(1,1) PRIMARY KEY,
    perfil_id INT NOT NULL,
    modulo_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    fecha_creacion DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_PMS_Perfil FOREIGN KEY (perfil_id)
        REFERENCES perfiles(id) ON DELETE CASCADE,
    CONSTRAINT FK_PMS_Modulo FOREIGN KEY (modulo_id)
        REFERENCES modulos(id) ON DELETE CASCADE,
    CONSTRAINT FK_PMS_Sucursal FOREIGN KEY (sucursal_id)
        REFERENCES sucursales(id) ON DELETE CASCADE,
    CONSTRAINT UQ_Perfil_Modulo_Sucursal
        UNIQUE (perfil_id, modulo_id, sucursal_id)
);

CREATE INDEX IX_PMS_Perfil_Modulo ON perfil_modulo_sucursal(perfil_id, modulo_id);

PRINT '✅ Tabla perfil_modulo_sucursal simplificada creada';
