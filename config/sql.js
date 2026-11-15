const sql = require('mssql');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crea y conecta un pool de conexiones a SQL Server.
 * Reintenta porque al levantar con Docker el motor puede tardar unos segundos.
 */
async function crearPoolSql(cfg, { database = cfg.database, intentos = 10, esperaMs = 3000 } = {}) {
  for (let intento = 1; ; intento++) {
    const pool = new sql.ConnectionPool({
      server: cfg.server,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database,
      options: {
        encrypt: cfg.encrypt,
        trustServerCertificate: cfg.trustServerCertificate,
        useUTC: true,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    });
    try {
      return await pool.connect();
    } catch (err) {
      if (intento >= intentos) {
        throw err;
      }
      console.log(`[sql] no conecta todavía (${err.message}). Reintento ${intento}/${intentos}...`);
      await esperar(esperaMs);
    }
  }
}

module.exports = { crearPoolSql };
