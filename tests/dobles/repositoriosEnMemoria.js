/**
 * Implementaciones EN MEMORIA de las interfaces de repositorio.
 * Gracias a la inyección de dependencias, los servicios reales funcionan con
 * estas clases igual que con SQL Server / MongoDB, pero sin levantar ninguna base.
 */
const bcrypt = require('bcryptjs');
const { ITurnoRepositorio } = require('../../repositories/interfaces/ITurnoRepositorio');
const { IUsuarioRepositorio } = require('../../repositories/interfaces/IUsuarioRepositorio');
const { IMetricaRepositorio } = require('../../repositories/interfaces/IMetricaRepositorio');
const { INotificador } = require('../../notificadores/INotificador');
const { Turno } = require('../../models/Turno');
const { UsuarioFactory } = require('../../models/UsuarioFactory');

function paginar(lista, pagina = 1, limite = 10) {
  return { items: lista.slice((pagina - 1) * limite, pagina * limite), total: lista.length };
}

class UsuarioRepositorioEnMemoria extends IUsuarioRepositorio {
  constructor() {
    super();
    this.filas = [];
  }

  /** Agrega un usuario con la contraseña hasheada (para preparar escenarios). */
  agregar({ password = 'Demo1234!', ...datos }) {
    const fila = { id: this.filas.length + 1, activo: true, passwordHash: bcrypt.hashSync(password, 4), ...datos };
    this.filas.push(fila);
    return UsuarioFactory.crear(fila);
  }

  async buscarPorEmail(email) {
    const fila = this.filas.find((f) => f.email === email);
    return fila ? UsuarioFactory.crear(fila) : null;
  }

  async buscarPorId(id) {
    const fila = this.filas.find((f) => f.id === id);
    return fila ? UsuarioFactory.crear(fila) : null;
  }

  async crearPaciente(datos) {
    const fila = { id: this.filas.length + 1, activo: true, rol: 'PACIENTE', ...datos };
    this.filas.push(fila);
    return UsuarioFactory.crear(fila);
  }

  async buscarMedicoPorId(id) {
    const fila = this.filas.find((f) => f.id === id && f.rol === 'MEDICO' && f.activo);
    return fila ? UsuarioFactory.crear(fila) : null;
  }

  async listarMedicos({ especialidad = null, pagina, limite }) {
    const medicos = this.filas
      .filter((f) => f.rol === 'MEDICO' && f.activo && (!especialidad || f.especialidad === especialidad))
      .map((f) => UsuarioFactory.crear(f));
    return paginar(medicos, pagina, limite);
  }
}

class TurnoRepositorioEnMemoria extends ITurnoRepositorio {
  constructor() {
    super();
    this.turnos = new Map();
    this.siguienteId = 1;
  }

  #copiar(turno) {
    return new Turno({ ...turno.toJSON(), fechaHora: turno.fechaHora });
  }

  async guardarTurno(turno) {
    const guardado = new Turno({ ...turno.toJSON(), id: this.siguienteId++ });
    this.turnos.set(guardado.id, guardado);
    return this.#copiar(guardado);
  }

  async buscarPorId(id) {
    const turno = this.turnos.get(id);
    return turno ? this.#copiar(turno) : null;
  }

  async buscarPorMedico(medicoId, { desde, hasta }) {
    return [...this.turnos.values()]
      .filter((t) => t.medicoId === medicoId && t.estaActivo() && t.fechaHora < hasta && t.fechaFin > desde)
      .map((t) => this.#copiar(t));
  }

  async listar({ pacienteId = null, medicoId = null, estado = null, pagina, limite }) {
    const lista = [...this.turnos.values()]
      .filter(
        (t) =>
          (!pacienteId || t.pacienteId === pacienteId) &&
          (!medicoId || t.medicoId === medicoId) &&
          (!estado || t.estado === estado)
      )
      .sort((a, b) => b.fechaHora - a.fechaHora)
      .map((t) => this.#copiar(t));
    return paginar(lista, pagina, limite);
  }

  async actualizarEstado(turno, estadoAnterior) {
    const actual = this.turnos.get(turno.id);
    if (!actual || actual.estado !== estadoAnterior) return false;
    this.turnos.set(turno.id, this.#copiar(turno));
    return true;
  }

  async reprogramar(turno) {
    this.turnos.set(turno.id, this.#copiar(turno));
    return this.#copiar(turno);
  }
}

class MetricaRepositorioEnMemoria extends IMetricaRepositorio {
  constructor() {
    super();
    this.metricas = [];
    this.alertas = [];
  }

  async registrarMetrica(metrica) {
    this.metricas.push(metrica.toJSON());
  }

  async listarPorPaciente(pacienteId, { pagina, limite }) {
    const lista = this.metricas.filter((m) => m.pacienteId === pacienteId).reverse();
    return paginar(lista, pagina, limite);
  }

  async registrarAlerta(alerta) {
    this.alertas.push(alerta.toJSON());
  }

  async listarAlertas({ pacienteId = null, pagina, limite }) {
    const lista = this.alertas.filter((a) => !pacienteId || a.pacienteId === pacienteId).reverse();
    return paginar(lista, pagina, limite);
  }
}

/** "Espía": guarda lo que se le notificó para poder verificarlo en el test. */
class NotificadorEspia extends INotificador {
  constructor() {
    super();
    this.alertas = [];
  }

  notificarAlerta(alerta) {
    this.alertas.push(alerta);
  }
}

module.exports = {
  UsuarioRepositorioEnMemoria,
  TurnoRepositorioEnMemoria,
  MetricaRepositorioEnMemoria,
  NotificadorEspia,
};
