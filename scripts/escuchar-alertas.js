/**
 * Cliente WebSocket de ejemplo: un médico inicia sesión y queda escuchando
 * las alertas de salud en tiempo real.
 *
 * Uso: npm run alertas -- --email laura.gomez@centromedico.test --password Demo1234!
 */
require('dotenv').config({ quiet: true });
const { io } = require('socket.io-client');

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : porDefecto;
}

const API = argumento('api', process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`);
const EMAIL = argumento('email', 'laura.gomez@centromedico.test');
const PASSWORD = argumento('password', 'Demo1234!');

(async () => {
  const respuesta = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!respuesta.ok) {
    console.error('No se pudo iniciar sesión:', (await respuesta.json()).error);
    process.exit(1);
  }
  const { token, usuario } = await respuesta.json();
  console.log(`Sesión iniciada: ${usuario.nombre} (${usuario.rol}). Esperando alertas...`);

  const socket = io(API, { auth: { token } });
  socket.on('connect', () => console.log('[ws] conectado'));
  socket.on('connect_error', (err) => console.error('[ws] error:', err.message));
  socket.on('alerta', (alerta) => {
    const hora = new Date(alerta.metricaTimestamp).toLocaleTimeString('es-AR', {
      hourCycle: 'h23',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    console.log(`🚨 [${alerta.nivel}] paciente ${alerta.pacienteId} - ${alerta.tipo} - ${alerta.mensaje} (${hora})`);
  });
})();
