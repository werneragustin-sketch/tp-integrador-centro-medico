const express = require('express');
const cors = require('cors');

const { AuthControlador } = require('./controllers/AuthControlador');
const { MedicoControlador } = require('./controllers/MedicoControlador');
const { TurnoControlador } = require('./controllers/TurnoControlador');
const { MonitoreoControlador } = require('./controllers/MonitoreoControlador');
const { crearAutenticacion } = require('./middleware/autenticacion');
const { crearValidacionDispositivo } = require('./middleware/dispositivoIoT');
const { registroPeticiones } = require('./middleware/registroPeticiones');
const { rutaNoEncontrada, manejarErrores } = require('./middleware/manejoErrores');
const { crearRutas } = require('./routes');

/**
 * Arma la aplicación Express a partir de los servicios que recibe.
 * No crea conexiones ni repositorios: eso lo hace index.js (o los tests, con dobles).
 */
function crearApp({ servicios, dispositivoApiKey, registrarPeticiones = true }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  if (registrarPeticiones) {
    app.use(registroPeticiones);
  }

  app.get('/', (_req, res) => {
    res.status(200).json({ api: 'Centro Médico - TP Integrador', estado: 'funcionando' });
  });

  const controladores = {
    auth: new AuthControlador(servicios.authServicio),
    medicos: new MedicoControlador(servicios.medicoServicio),
    turnos: new TurnoControlador(servicios.turnoServicio),
    monitoreo: new MonitoreoControlador(servicios.monitoreoServicio),
  };

  app.use(
    '/api',
    crearRutas({
      controladores,
      autenticar: crearAutenticacion(servicios.authServicio),
      validarDispositivo: crearValidacionDispositivo(dispositivoApiKey),
    })
  );

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}

module.exports = { crearApp };
