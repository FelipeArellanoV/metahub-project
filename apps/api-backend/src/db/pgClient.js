/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Adaptador y Conexión de Base de Datos (pgClient.js)
 * Descripción: Inicializa el pool de conexiones a PostgreSQL / TimescaleDB con manejo
 *              de fallbacks resilientes para ejecución local o en contenedores Docker.
 * =========================================================================================
 */

let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (e) {
  Pool = null;
}

let pool = null;

/**
 * Obtiene o inicializa la instancia compartida de conexiones de base de datos (Pool)
 * @returns {Pool|null} Instancia activa de pg.Pool o null en modo de fallback en memoria
 */
function getPool() {
  if (pool) return pool;
  if (!Pool) return null;

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString && !process.env.POSTGRES_HOST) {
    // Si no existen parámetros de entorno para la BD, conmuta transparentemente al modo en memoria
    return null;
  }

  pool = new Pool({
    connectionString: connectionString || undefined,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'metahub_db',
    max: 10,
    idleTimeoutMillis: 30000
  });

  return pool;
}

module.exports = {
  getPool,
  /**
   * Ejecuta una consulta SQL parametrizada sobre el pool activo
   */
  query: async (text, params) => {
    const p = getPool();
    if (!p) throw new Error('El pool de conexiones a la base de datos no está configurado.');
    return p.query(text, params);
  }
};
