/**
 * Punto de entrada y "raíz de composición": acá se crean las conexiones, los
 * repositorios y los servicios, y se conectan entre sí por constructor.
 * Es el ÚNICO lugar que conoce las implementaciones concretas (SQL Server, MongoDB, Socket.IO).
 */
const http = require('http');
const mongoose = require('mongoose');

const { config } = require('./config/env');
const { crearPoolSql } = require('./config/sql');
const { conectarMongo } = require('./config/mongo');
const { crearServidorSocket } = require('./config/socket');
const { crearApp } = require('./app');

const { SqlUsuarioRepositorio } = require('./repositories/sql/SqlUsuarioRepositorio');
const { SqlTurnoRepositorio } = require('./repositories/sql/SqlTurnoRepositorio');
const { MongoMetricaRepositorio } = require('./repositories/mongo/MongoMetricaRepositorio');
const { SocketNotificador } = require('./notificadores/SocketNotificador');

const { AuthServicio } = require('./services/AuthServicio');
const { TurnoServicio } = require('./services/TurnoServicio');
const { MedicoServicio } = require('./services/MedicoServicio');
const { MonitoreoServicio } = require('./services/MonitoreoServicio');
const { ReglaFrecuenciaCardiaca } = require('./models/reglas/ReglaFrecuenciaCardiaca');
const { ReglaPresionArterial } = require('./models/reglas/ReglaPresionArterial');

async function iniciar() {
  // ---- Capa de datos: conexiones y repositorios concretos ----
  const poolSql = await crearPoolSql(config.sql);
  console.log('[sql] conectado a SQL Server');
  await conectarMongo(config.mongoUri);
  console.log('[mongo] conectado a MongoDB');

  const usuarioRepositorio = new SqlUsuarioRepositorio(poolSql);
  const turnoRepositorio = new SqlTurnoRepositorio(poolSql);
  const metricaRepositorio = MongoMetricaRepositorio.getInstancia(); // Singleton
  await metricaRepositorio.inicializar();

  // ---- Servidor HTTP + WebSockets ----
  let app;
  const servidorHttp = http.createServer((req, res) => app(req, res));
  const authServicio = new AuthServicio(usuarioRepositorio, config.jwt);
  const io = crearServidorSocket(servidorHttp, authServicio);

  // ---- Capa de negocio: inyección de dependencias por constructor ----
  const servicios = {
    authServicio,
    turnoServicio: new TurnoServicio(turnoRepositorio, usuarioRepositorio),
    medicoServicio: new MedicoServicio(usuarioRepositorio),
    monitoreoServicio: new MonitoreoServicio(metricaRepositorio, new SocketNotificador(io), [
      new ReglaFrecuenciaCardiaca(),
      new ReglaPresionArterial(),
    ]),
  };

  // ---- Capa de presentación (API REST) ----
  app = crearApp({ servicios, dispositivoApiKey: config.iotApiKey });

  servidorHttp.listen(config.puerto, () => {
    console.log(`[api] escuchando en http://localhost:${config.puerto}`);
  });

  const apagar = async (senal) => {
    console.log(`[api] ${senal} recibido, cerrando conexiones...`);
    io.close();
    servidorHttp.close();
    await Promise.allSettled([poolSql.close(), mongoose.disconnect()]);
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

iniciar().catch((err) => {
  console.error('[api] no se pudo iniciar:', err.message);
  process.exit(1);
});
