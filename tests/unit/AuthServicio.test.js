const jwt = require('jsonwebtoken');
const { AuthServicio } = require('../../services/AuthServicio');
const { UsuarioRepositorioEnMemoria } = require('../dobles/repositoriosEnMemoria');
const { ErrorConflicto, ErrorValidacion, ErrorNoAutenticado } = require('../../models/errores');

const SECRETO = 'secreto-de-test';

function crear() {
  const repo = new UsuarioRepositorioEnMemoria();
  const servicio = new AuthServicio(repo, { secreto: SECRETO, expiraEn: '1h' });
  return { repo, servicio };
}

const datos = { nombre: 'Juan Pérez', email: 'Juan@Correo.test', password: 'clave-segura', obraSocial: 'OSDE' };

describe('AuthServicio.registrarPaciente', () => {
  test('guarda la contraseña hasheada, nunca en texto plano', async () => {
    const { servicio, repo } = crear();

    const paciente = await servicio.registrarPaciente(datos);

    expect(paciente.rol).toBe('PACIENTE');
    expect(paciente.email).toBe('juan@correo.test'); // normalizado
    expect(repo.filas[0].passwordHash).not.toBe(datos.password);
    expect(repo.filas[0].passwordHash).toMatch(/^\$2[aby]\$/); // formato bcrypt
    expect(JSON.stringify(paciente)).not.toContain('passwordHash');
  });

  test('email duplicado -> ErrorConflicto', async () => {
    const { servicio } = crear();
    await servicio.registrarPaciente(datos);
    await expect(servicio.registrarPaciente(datos)).rejects.toThrow(ErrorConflicto);
  });

  test.each([
    [{ ...datos, email: 'no-es-un-email' }],
    [{ ...datos, password: 'corta' }],
    [{ ...datos, nombre: '' }],
  ])('datos inválidos -> ErrorValidacion (%#)', async (entrada) => {
    const { servicio } = crear();
    await expect(servicio.registrarPaciente(entrada)).rejects.toThrow(ErrorValidacion);
  });
});

describe('AuthServicio.login', () => {
  test('devuelve un JWT firmado con id y rol', async () => {
    const { servicio, repo } = crear();
    repo.agregar({ nombre: 'Dra. Gómez', email: 'gomez@test', rol: 'MEDICO', password: 'Demo1234!' });

    const { token, usuario } = await servicio.login('gomez@test', 'Demo1234!');
    const payload = jwt.verify(token, SECRETO);

    expect(usuario.rol).toBe('MEDICO');
    expect(payload).toMatchObject({ sub: '1', rol: 'MEDICO' });
  });

  test('contraseña incorrecta o usuario inexistente -> mismo error', async () => {
    const { servicio, repo } = crear();
    repo.agregar({ nombre: 'Dra. Gómez', email: 'gomez@test', rol: 'MEDICO', password: 'Demo1234!' });

    await expect(servicio.login('gomez@test', 'otra')).rejects.toThrow('Email o contraseña incorrectos');
    await expect(servicio.login('nadie@test', 'Demo1234!')).rejects.toThrow('Email o contraseña incorrectos');
  });

  test('usuario inactivo no puede entrar', async () => {
    const { servicio, repo } = crear();
    repo.agregar({ nombre: 'Baja', email: 'baja@test', rol: 'PACIENTE', activo: false });
    await expect(servicio.login('baja@test', 'Demo1234!')).rejects.toThrow(ErrorNoAutenticado);
  });

  test('verificarToken rechaza un token firmado con otro secreto', () => {
    const { servicio } = crear();
    const trucho = jwt.sign({ sub: '1', rol: 'MEDICO' }, 'otro-secreto');
    expect(() => servicio.verificarToken(trucho)).toThrow(ErrorNoAutenticado);
  });
});

describe('AuthServicio.obtenerPerfil', () => {
  test('trae de la base los datos que no viajan en el token (obra social)', async () => {
    const { servicio, repo } = crear();
    const paciente = repo.agregar({ nombre: 'Juan', email: 'juan@test', rol: 'PACIENTE', obraSocial: 'OSDE' });

    const perfil = await servicio.obtenerPerfil(paciente.id);

    expect(perfil.toJSON()).toMatchObject({ rol: 'PACIENTE', obraSocial: 'OSDE' });
    expect(JSON.stringify(perfil)).not.toContain('passwordHash');
  });

  test('usuario inexistente o dado de baja -> ErrorNoAutenticado', async () => {
    const { servicio, repo } = crear();
    const baja = repo.agregar({ nombre: 'Baja', email: 'baja@test', rol: 'PACIENTE', activo: false });

    await expect(servicio.obtenerPerfil(99)).rejects.toThrow(ErrorNoAutenticado);
    await expect(servicio.obtenerPerfil(baja.id)).rejects.toThrow(ErrorNoAutenticado);
  });
});
