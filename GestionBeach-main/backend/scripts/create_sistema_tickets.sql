-- ============================================
-- SISTEMA DE TICKETS - BASE DE DATOS
-- ============================================

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Información del ticket
    numero_ticket VARCHAR(20) UNIQUE NOT NULL COMMENT 'Número único del ticket (ej: TKT-2024-00001)',
    asunto VARCHAR(255) NOT NULL COMMENT 'Asunto/título del ticket',
    mensaje TEXT NOT NULL COMMENT 'Descripción detallada del problema',

    -- Información del usuario reportante
    usuario_id INT NULL COMMENT 'ID del usuario si está autenticado',
    nombre_reportante VARCHAR(100) NOT NULL COMMENT 'Nombre de quien reporta',
    email_reportante VARCHAR(100) NOT NULL COMMENT 'Email de quien reporta',
    telefono_reportante VARCHAR(20) NULL COMMENT 'Teléfono de contacto',
    sucursal_id INT NULL COMMENT 'Sucursal del reportante',
    departamento VARCHAR(100) NULL COMMENT 'Departamento del reportante',

    -- Estado y prioridad
    estado ENUM('activo', 'en_proceso', 'resuelto', 'cancelado', 'vencido') DEFAULT 'activo' COMMENT 'Estado actual del ticket',
    prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media' COMMENT 'Nivel de prioridad',

    -- Asignación
    asignado_a INT NULL COMMENT 'ID del técnico/admin asignado',
    categoria VARCHAR(50) NULL COMMENT 'Categoría del problema (ej: técnico, permisos, bug, consulta)',

    -- Fechas y tiempos
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME NULL COMMENT 'Fecha límite para resolver',
    fecha_resolucion DATETIME NULL COMMENT 'Fecha en que se resolvió',
    tiempo_respuesta_minutos INT NULL COMMENT 'Tiempo que tomó la primera respuesta',
    tiempo_resolucion_minutos INT NULL COMMENT 'Tiempo total de resolución',

    -- Metadata
    ip_origen VARCHAR(45) NULL COMMENT 'IP desde donde se creó el ticket',
    user_agent TEXT NULL COMMENT 'Navegador y sistema del reportante',
    archivos_adjuntos JSON NULL COMMENT 'Array de rutas de archivos adjuntos',

    -- Índices para búsqueda rápida
    INDEX idx_estado (estado),
    INDEX idx_usuario (usuario_id),
    INDEX idx_asignado (asignado_a),
    INDEX idx_fecha_creacion (fecha_creacion),
    INDEX idx_numero_ticket (numero_ticket),
    INDEX idx_prioridad (prioridad),
    INDEX idx_sucursal (sucursal_id),

    -- Relaciones
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tickets de soporte técnico';

-- Tabla de respuestas/comentarios de tickets
CREATE TABLE IF NOT EXISTS ticket_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    usuario_id INT NULL COMMENT 'ID del usuario que responde',
    nombre_usuario VARCHAR(100) NOT NULL COMMENT 'Nombre de quien responde',
    mensaje TEXT NOT NULL COMMENT 'Contenido de la respuesta',
    es_interno BOOLEAN DEFAULT FALSE COMMENT 'Si es una nota interna (no visible para el usuario)',
    archivos_adjuntos JSON NULL COMMENT 'Array de archivos adjuntos en esta respuesta',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ticket (ticket_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (fecha_creacion),

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Respuestas y comentarios de tickets';

-- Tabla de historial de cambios de tickets
CREATE TABLE IF NOT EXISTS ticket_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    usuario_id INT NULL COMMENT 'Quien realizó el cambio',
    accion VARCHAR(50) NOT NULL COMMENT 'Tipo de acción (estado_cambiado, asignado, prioridad_cambiada, etc)',
    valor_anterior VARCHAR(255) NULL COMMENT 'Valor antes del cambio',
    valor_nuevo VARCHAR(255) NULL COMMENT 'Valor después del cambio',
    descripcion TEXT NULL COMMENT 'Descripción adicional del cambio',
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ticket (ticket_id),
    INDEX idx_fecha (fecha_cambio),

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de cambios en tickets';

-- Tabla de categorías de tickets
CREATE TABLE IF NOT EXISTS ticket_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    color VARCHAR(7) DEFAULT '#666666' COMMENT 'Color hex para identificación visual',
    icono VARCHAR(50) NULL COMMENT 'Nombre del icono de Material-UI',
    sla_horas INT DEFAULT 24 COMMENT 'Tiempo de respuesta esperado en horas',
    activo BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0 COMMENT 'Orden de visualización',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Categorías para clasificar tickets';

-- Insertar categorías predeterminadas
INSERT INTO ticket_categorias (nombre, descripcion, color, icono, sla_horas, orden) VALUES
('Técnico', 'Problemas técnicos del sistema', '#2196F3', 'BugReport', 4, 1),
('Permisos', 'Solicitudes de acceso o permisos', '#9C27B0', 'Lock', 2, 2),
('Bug', 'Errores o fallos en el sistema', '#F44336', 'Error', 1, 3),
('Consulta', 'Consultas generales', '#4CAF50', 'Help', 24, 4),
('Mejora', 'Sugerencias de mejora', '#FF9800', 'TrendingUp', 72, 5),
('Urgente', 'Problemas críticos urgentes', '#D32F2F', 'Warning', 1, 6);

-- Tabla de notificaciones de tickets
CREATE TABLE IF NOT EXISTS ticket_notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    usuario_id INT NOT NULL COMMENT 'Usuario que debe recibir la notificación',
    tipo VARCHAR(50) NOT NULL COMMENT 'nuevo_ticket, nueva_respuesta, cambio_estado, asignacion',
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura DATETIME NULL,

    INDEX idx_usuario_leida (usuario_id, leida),
    INDEX idx_ticket (ticket_id),
    INDEX idx_fecha (fecha_creacion),

    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificaciones de tickets para usuarios';

-- Tabla de plantillas de respuestas rápidas
CREATE TABLE IF NOT EXISTS ticket_plantillas_respuesta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) NULL,
    uso_count INT DEFAULT 0 COMMENT 'Contador de veces utilizada',
    activo BOOLEAN DEFAULT TRUE,
    creado_por INT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_categoria (categoria),

    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Plantillas de respuestas predefinidas';

-- Insertar algunas plantillas de respuesta predeterminadas
INSERT INTO ticket_plantillas_respuesta (titulo, contenido, categoria) VALUES
('Ticket recibido', 'Hemos recibido tu ticket y será atendido a la brevedad. Un miembro del equipo de soporte se pondrá en contacto contigo pronto.', 'general'),
('Solución encontrada', 'El problema ha sido resuelto. Por favor, verifica que todo funcione correctamente y confirma la resolución.', 'general'),
('Información adicional requerida', 'Para poder ayudarte mejor, necesitamos información adicional. Por favor, proporciona más detalles sobre el problema.', 'general'),
('Ticket cerrado', 'Este ticket ha sido marcado como resuelto. Si el problema persiste, no dudes en reabrir el ticket o crear uno nuevo.', 'general');

-- Vista para estadísticas de tickets
CREATE OR REPLACE VIEW vista_estadisticas_tickets AS
SELECT
    COUNT(*) as total_tickets,
    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
    SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
    SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
    SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
    SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
    SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
    SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as alta_prioridad,
    AVG(tiempo_resolucion_minutos) as tiempo_promedio_resolucion,
    AVG(tiempo_respuesta_minutos) as tiempo_promedio_respuesta
FROM tickets
WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Vista para tickets por usuario
CREATE OR REPLACE VIEW vista_tickets_por_usuario AS
SELECT
    u.id as usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    COUNT(t.id) as total_tickets,
    SUM(CASE WHEN t.estado = 'activo' THEN 1 ELSE 0 END) as tickets_activos,
    SUM(CASE WHEN t.estado = 'resuelto' THEN 1 ELSE 0 END) as tickets_resueltos,
    AVG(t.tiempo_resolucion_minutos) as tiempo_promedio_resolucion
FROM usuarios u
LEFT JOIN tickets t ON u.id = t.usuario_id
GROUP BY u.id, u.nombre, u.email;

-- Procedimiento almacenado para generar número de ticket
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS generar_numero_ticket(OUT nuevo_numero VARCHAR(20))
BEGIN
    DECLARE ultimo_numero INT;
    DECLARE anio_actual CHAR(4);

    SET anio_actual = YEAR(CURDATE());

    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_ticket, -5) AS UNSIGNED)), 0) INTO ultimo_numero
    FROM tickets
    WHERE numero_ticket LIKE CONCAT('TKT-', anio_actual, '-%');

    SET ultimo_numero = ultimo_numero + 1;
    SET nuevo_numero = CONCAT('TKT-', anio_actual, '-', LPAD(ultimo_numero, 5, '0'));
END //
DELIMITER ;

-- Procedimiento para marcar tickets vencidos
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS marcar_tickets_vencidos()
BEGIN
    UPDATE tickets
    SET estado = 'vencido'
    WHERE estado IN ('activo', 'en_proceso')
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento < NOW();
END //
DELIMITER ;

-- Evento para ejecutar automáticamente el marcado de tickets vencidos cada hora
CREATE EVENT IF NOT EXISTS evento_marcar_tickets_vencidos
ON SCHEDULE EVERY 1 HOUR
DO CALL marcar_tickets_vencidos();

-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================
ALTER TABLE tickets ADD FULLTEXT INDEX idx_fulltext_busqueda (asunto, mensaje);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================
-- Estados de tickets:
-- - activo: Ticket recién creado, esperando atención
-- - en_proceso: Ticket siendo trabajado por un técnico
-- - resuelto: Ticket resuelto satisfactoriamente
-- - cancelado: Ticket cancelado (duplicado, error, etc)
-- - vencido: Ticket que superó su fecha de vencimiento sin resolverse

-- Prioridades:
-- - baja: 72 horas SLA
-- - media: 24 horas SLA
-- - alta: 4 horas SLA
-- - critica: 1 hora SLA

SELECT '✅ Sistema de tickets creado exitosamente' as resultado;
