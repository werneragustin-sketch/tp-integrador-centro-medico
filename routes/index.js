const { Router } = require('express');
const { autorizar } = require('../middleware/autenticacion');
const { paginacion } = require('../middleware/paginacion');

/**
 * Mapa de endpoints de la API. Separado en tres grupos según cómo se autentican:
 *   1. ANÓNIMOS: cualquiera puede llamarlos.
 *   2. DISPOSITIVOS IoT: API key en el header x-api-key.
 *   3. PRIVADOS: JWT en el header Authorization (y a veces un rol específico).
 */
function crearRutas({ controladores, autenticar, validarDispositivo }) {
  const { auth, medicos, turnos, monitoreo } = controladores;
  const rutas = Router();

  // ---------- 1. Endpoints ANÓNIMOS ----------
  rutas.post('/auth/registro', auth.registrar);
  rutas.post('/auth/login', auth.login);
  rutas.get('/medicos', paginacion, medicos.listar);
  rutas.get('/medicos/:id', medicos.obtener);

  // ---------- 2. Endpoint de DISPOSITIVOS IoT ----------
  rutas.post('/metricas', validarDispositivo, monitoreo.registrarMetrica);

  // ---------- 3. Endpoints PRIVADOS (JWT) ----------
  rutas.get('/auth/perfil', autenticar, auth.perfil);

  rutas.get('/turnos', autenticar, paginacion, turnos.listar);
  rutas.get('/turnos/:id', autenticar, turnos.obtener);
  rutas.post('/turnos', autenticar, autorizar('PACIENTE'), turnos.crearTurnoHTTP);
  rutas.put('/turnos/:id', autenticar, autorizar('PACIENTE'), turnos.reprogramar);
  rutas.patch('/turnos/:id/estado', autenticar, turnos.cambiarEstado);
  rutas.delete('/turnos/:id', autenticar, autorizar('PACIENTE'), turnos.cancelar);

  rutas.get('/pacientes/:pacienteId/metricas', autenticar, paginacion, monitoreo.listarMetricas);
  rutas.get('/alertas', autenticar, autorizar('MEDICO'), paginacion, monitoreo.listarAlertas);

  return rutas;
}

module.exports = { crearRutas };
