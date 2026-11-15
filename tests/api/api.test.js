/**
 * Tests de la API completa (HTTP -> middleware -> controlador -> servicio -> repositorio).
 * Se usa la app real, pero los repositorios se reemplazan por implementaciones en memoria:
 * la inyección de dependencias permite probar todo el flujo sin SQL Server ni MongoDB.
 */
const request = require('supertest');
const { crearApp } = require('../../app');
const { AuthServicio } = require('../../services/AuthServicio');
const { TurnoServicio } = require('../../services/TurnoServicio');
const { MedicoServicio } = require('../../services/MedicoServicio');
const { MonitoreoServicio } = require('../../services/MonitoreoServicio');
const { ReglaFrecuenciaCardiaca } = require('../../models/reglas/ReglaFrecuenciaCardiaca');
const { ReglaPresionArterial } = require('../../models/reglas/ReglaPresionArterial');
const {
  UsuarioRepositorioEnMemoria,
  TurnoRepositorioEnMemoria,
  MetricaRepositorioEnMemoria,
  NotificadorEspia,
} = require('../dobles/repositoriosEnMemoria');

const API_KEY = 'clave-dispositivo-test';
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000);
MANANA.setUTCHours(13, 0, 0, 0);

function armarEntorno() {
  const usuarios = new UsuarioRepositorioEnMemoria();
  const medico = usuarios.agregar({
    nombre: 'Dra. Laura Gómez',
    email: 'laura.gomez@centromedico.test',
    rol: 'MEDICO',
    especialidad: 'Cardiología',
    matricula: 'MN-10001',
  });
  usuarios.agregar({
    nombre: 'Dr. Martín Ruiz',
    email: 'martin.ruiz@centromedico.test',
    rol: 'MEDICO',
    especialidad: 'Clínica Médica',
    matricula: 'MN-10002',
  });
  const turnos = new TurnoRepositorioEnMemoria();
  const metricas = new MetricaRepositorioEnMemoria();
  const notificador = new NotificadorEspia();

  const authServicio = new AuthServicio(usuarios, { secreto: 'secreto-test' });
  const app = crearApp({
    servicios: {
      authServicio,
      turnoServicio: new TurnoServicio(turnos, usuarios),
      medicoServicio: new MedicoServicio(usuarios),
      monitoreoServicio: new MonitoreoServicio(metricas, notificador, [
        new ReglaFrecuenciaCardiaca(),
        new ReglaPresionArterial(),
      ]),
    },
    dispositivoApiKey: API_KEY,
    registrarPeticiones: false,
  });
  return { app, medico, notificador };
}

async function login(app, email, password = 'Demo1234!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('Endpoints anónimos vs privados', () => {
  const { app } = armarEntorno();

  test('GET / responde que la API funciona', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('funcionando');
  });

  test('GET /api/medicos es público y paginado', async () => {
    const res = await request(app).get('/api/medicos?pagina=1&limite=1');
    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.paginacion).toEqual({ pagina: 1, limite: 1, total: 2, totalPaginas: 2 });
    expect(res.body.datos[0]).not.toHaveProperty('passwordHash');
  });

  test('GET /api/turnos sin token -> 401', async () => {
    const res = await request(app).get('/api/turnos');
    expect(res.status).toBe(401);
  });

  test('token inválido -> 401', async () => {
    const res = await request(app).get('/api/turnos').set('Authorization', 'Bearer cualquier-cosa');
    expect(res.status).toBe(401);
  });

  test('endpoint inexistente -> 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No existe el endpoint/);
  });

  test('JSON mal formado -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
  });
});

describe('Flujo completo de un turno', () => {
  const { app, medico } = armarEntorno();
  let tokenPaciente;
  let tokenMedico;
  let turnoId;

  test('1. el paciente se registra (POST /api/auth/registro -> 201)', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Juan Pérez',
      email: 'juan.perez@correo.test',
      password: 'Demo1234!',
      obraSocial: 'OSDE',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rol: 'PACIENTE', email: 'juan.perez@correo.test' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('2. registrarse de nuevo con el mismo email -> 409', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Otro', email: 'juan.perez@correo.test', password: 'Demo1234!' });
    expect(res.status).toBe(409);
  });

  test('3. login de paciente y médico', async () => {
    tokenPaciente = await login(app, 'juan.perez@correo.test');
    tokenMedico = await login(app, 'laura.gomez@centromedico.test');
    expect(tokenPaciente).toBeTruthy();
    expect(tokenMedico).toBeTruthy();
  });

  test('4. el paciente pide un turno (POST /api/turnos -> 201 PENDIENTE)', async () => {
    const res = await request(app)
      .post('/api/turnos')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ medicoId: medico.id, fechaHora: MANANA.toISOString(), motivo: 'Control' });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('PENDIENTE');
    turnoId = res.body.id;
  });

  test('5. el mismo horario ya no está disponible -> 409', async () => {
    const res = await request(app)
      .post('/api/turnos')
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ medicoId: medico.id, fechaHora: new Date(MANANA.getTime() + 15 * 60000).toISOString() });
    expect(res.status).toBe(409);
  });

  test('6. el médico no puede pedir turnos -> 403', async () => {
    const res = await request(app)
      .post('/api/turnos')
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({ medicoId: medico.id, fechaHora: MANANA.toISOString() });
    expect(res.status).toBe(403);
  });

  test('7. el paciente reprograma (PUT /api/turnos/:id)', async () => {
    const nueva = new Date(MANANA.getTime() + 60 * 60000).toISOString();
    const res = await request(app)
      .put(`/api/turnos/${turnoId}`)
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ fechaHora: nueva });
    expect(res.status).toBe(200);
    expect(res.body.fechaHora).toBe(nueva);
  });

  test('8. el médico ve el turno en su agenda (GET /api/turnos)', async () => {
    const res = await request(app).get('/api/turnos?estado=PENDIENTE').set('Authorization', `Bearer ${tokenMedico}`);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((t) => t.id)).toContain(turnoId);
  });

  test('9. el paciente NO puede confirmarse el turno -> 403', async () => {
    const res = await request(app)
      .patch(`/api/turnos/${turnoId}/estado`)
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ estado: 'CONFIRMADO' });
    expect(res.status).toBe(403);
  });

  test('10. el médico lo confirma (PATCH /api/turnos/:id/estado)', async () => {
    const res = await request(app)
      .patch(`/api/turnos/${turnoId}/estado`)
      .set('Authorization', `Bearer ${tokenMedico}`)
      .send({ estado: 'CONFIRMADO' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('CONFIRMADO');
  });

  test('11. un turno confirmado ya no se reprograma -> 409', async () => {
    const res = await request(app)
      .put(`/api/turnos/${turnoId}`)
      .set('Authorization', `Bearer ${tokenPaciente}`)
      .send({ fechaHora: new Date(MANANA.getTime() + 3 * 60 * 60000).toISOString() });
    expect(res.status).toBe(409);
  });

  test('12. el paciente lo cancela (DELETE /api/turnos/:id = baja lógica)', async () => {
    const res = await request(app).delete(`/api/turnos/${turnoId}`).set('Authorization', `Bearer ${tokenPaciente}`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('CANCELADO');

    const consulta = await request(app).get(`/api/turnos/${turnoId}`).set('Authorization', `Bearer ${tokenPaciente}`);
    expect(consulta.body.estado).toBe('CANCELADO'); // sigue existiendo, no se borró la fila
  });
});

describe('Monitoreo IoT', () => {
  const { app, notificador } = armarEntorno();

  test('POST /api/metricas sin API key -> 401', async () => {
    const res = await request(app).post('/api/metricas').send({ pacienteId: 3, frecuenciaCardiaca: 80, presionArterial: '120/80' });
    expect(res.status).toBe(401);
  });

  test('métrica anormal -> 201 con alerta y notificación en tiempo real', async () => {
    const res = await request(app)
      .post('/api/metricas')
      .set('x-api-key', API_KEY)
      .send({ pacienteId: 3, frecuenciaCardiaca: 140, presionArterial: '120/80' });
    expect(res.status).toBe(201);
    expect(res.body.alertasGeneradas).toBe(1);
    expect(notificador.alertas).toHaveLength(1);
  });

  test('métrica inválida -> 400', async () => {
    const res = await request(app)
      .post('/api/metricas')
      .set('x-api-key', API_KEY)
      .send({ pacienteId: 3, frecuenciaCardiaca: 'mucha', presionArterial: '120/80' });
    expect(res.status).toBe(400);
  });

  test('el médico consulta las alertas (paginado); el paciente no puede', async () => {
    await request(app).post('/api/auth/registro').send({ nombre: 'Juan', email: 'j@correo.test', password: 'Demo1234!' });
    const tokenMedico = await login(app, 'laura.gomez@centromedico.test');
    const tokenPaciente = await login(app, 'j@correo.test');

    const alertas = await request(app).get('/api/alertas').set('Authorization', `Bearer ${tokenMedico}`);
    expect(alertas.status).toBe(200);
    expect(alertas.body.paginacion.total).toBe(1);

    const prohibido = await request(app).get('/api/alertas').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(prohibido.status).toBe(403);
  });
});
