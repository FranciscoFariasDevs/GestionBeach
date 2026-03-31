/**
 * backend/config/redis.js
 * Conexión a Redis con degradación graceful:
 * si Redis no está disponible, el sistema funciona igual pero sin caché.
 */

const Redis = require('ioredis');

let redisClient = null;
let redisDisponible = false;

function conectarRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('connect', () => {
    redisDisponible = true;
    console.log('✅ Redis conectado:', url);
  });

  client.on('error', (err) => {
    if (redisDisponible) {
      console.warn('⚠️  Redis desconectado — operando sin caché:', err.message);
    }
    redisDisponible = false;
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconectando...');
  });

  client.connect().catch(() => {
    console.warn('⚠️  Redis no disponible al inicio — el sistema funciona sin caché');
  });

  return client;
}

// Inicializar al cargar el módulo
redisClient = conectarRedis();

/**
 * Wrapper seguro: todas las operaciones devuelven null/false si Redis no está disponible,
 * en vez de lanzar excepción.
 */
const cache = {
  /**
   * Obtiene un valor. Devuelve el objeto parseado o null si no existe / Redis caído.
   */
  async get(key) {
    if (!redisDisponible) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Guarda un valor. ttlSegundos por defecto = 1 hora.
   */
  async set(key, value, ttlSegundos = 3600) {
    if (!redisDisponible) return false;
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSegundos);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Elimina una o varias keys exactas.
   */
  async del(...keys) {
    if (!redisDisponible || keys.length === 0) return 0;
    try {
      return await redisClient.del(...keys);
    } catch {
      return 0;
    }
  },

  /**
   * Elimina todas las keys que coincidan con un patrón glob (ej: "gb:permisos:usuario:5:*").
   * Usa SCAN para no bloquear Redis en producción.
   */
  async delPattern(pattern) {
    if (!redisDisponible) return 0;
    try {
      let cursor = '0';
      let eliminadas = 0;
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redisClient.del(...keys);
          eliminadas += keys.length;
        }
      } while (cursor !== '0');
      return eliminadas;
    } catch {
      return 0;
    }
  },

  /** True si Redis está conectado. */
  isAvailable() {
    return redisDisponible;
  },
};

module.exports = { cache, redisClient: () => redisClient };
