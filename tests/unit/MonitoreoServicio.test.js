const { MonitoreoServicio } = require('../../services/MonitoreoServicio');
const { ReglaFrecuenciaCardiaca } = require('../../models/reglas/ReglaFrecuenciaCardiaca');
const { ReglaPresionArterial } = require('../../models/reglas/ReglaPresionArterial');
const { Paciente } = require('../../models/Paciente');
const { Medico } = require('../../models/Medico');
const { ErrorValidacion, ErrorProhibido } = require('../../models/errores');

function crearServicio() {
  const repo = {
    registrarMetrica: jest.fn(async () => {}),
    registrarAlerta: jest.fn(async () => {}),
    listarPorPaciente: jest.fn(async () => ({ items: [], total: 0 })),
    listarAlertas: jest.fn(async () => ({ items: [], total: 0 })),
  };
  const notificador = { notificarAlerta: jest.fn() };
  const servicio = new MonitoreoServicio(repo, notificador, [
    new ReglaFrecuenciaCardiaca(),
    new ReglaPresionArterial(),
  ]);
  return { repo, notificador, servicio };
}

const normal = { pacienteId: 4, frecuenciaCardiaca: 75, presionArterial: '120/80' };

describe('MonitoreoServicio.evaluarMetrica', () => {
  test('métrica normal: se guarda y no genera alertas', async () => {
    const { servicio, repo, notificador } = crearServicio();

    const { alertas } = await servicio.evaluarMetrica(normal);

    expect(alertas).toHaveLength(0);
    expect(repo.registrarMetrica).toHaveBeenCalledTimes(1);
    expect(repo.registrarAlerta).not.toHaveBeenCalled();
    expect(notificador.notificarAlerta).not.toHaveBeenCalled();
  });

  test('taquicardia: guarda la alerta y la notifica en tiempo real', async () => {
    const { servicio, repo, notificador } = crearServicio();

    const { alertas } = await servicio.evaluarMetrica({ ...normal, frecuenciaCardiaca: 130 });

    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ tipo: 'TAQUICARDIA', nivel: 'ADVERTENCIA' });
    expect(repo.registrarAlerta).toHaveBeenCalledWith(alertas[0]);
    expect(notificador.notificarAlerta).toHaveBeenCalledWith(alertas[0]);
  });

  test('presión muy alta es CRÍTICA', async () => {
    const { servicio } = crearServicio();
    const { alertas } = await servicio.evaluarMetrica({ ...normal, presionArterial: '190/125' });
    expect(alertas[0]).toMatchObject({ tipo: 'HIPERTENSION', nivel: 'CRITICA' });
  });

  test('puede generar varias alertas a la vez', async () => {
    const { servicio, notificador } = crearServicio();
    await servicio.evaluarMetrica({ pacienteId: 4, frecuenciaCardiaca: 35, presionArterial: '150/95' });
    expect(notificador.notificarAlerta).toHaveBeenCalledTimes(2);
  });

  test('métrica con formato inválido: no se guarda nada', async () => {
    const { servicio, repo } = crearServicio();
    await expect(servicio.evaluarMetrica({ ...normal, presionArterial: '120-80' })).rejects.toThrow(ErrorValidacion);
    expect(repo.registrarMetrica).not.toHaveBeenCalled();
  });
});

describe('MonitoreoServicio - permisos', () => {
  const paciente = new Paciente({ id: 4, nombre: 'Juan', email: 'j@test' });
  const medico = new Medico({ id: 1, nombre: 'Gómez', email: 'g@test' });

  test('el paciente ve sus métricas pero no las de otro', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.listarMetricas(paciente, 4, { pagina: 1, limite: 10 })).resolves.toBeDefined();
    await expect(servicio.listarMetricas(paciente, 5, { pagina: 1, limite: 10 })).rejects.toThrow(ErrorProhibido);
  });

  test('solo el médico ve las alertas', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.listarAlertas(medico)).resolves.toBeDefined();
    await expect(servicio.listarAlertas(paciente)).rejects.toThrow(ErrorProhibido);
  });
});
