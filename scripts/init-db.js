/**
 * Inicializa las bases de datos (idempotente, se puede correr varias veces):
 *   1. Crea la base SQL Server si no existe.
 *   2. Corre database/01_esquema.sql y 02_procedimientos.sql.
 *   3. Carga datos de prueba (médicos, pacientes, turnos y métricas) si está vacía.
 *
 * Uso: npm run db:init
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { config } = require('../config/env');
const { crearPoolSql } = require('../config/sql');
const { conectarMongo } = require('../config/mongo');
const { MongoMetricaRepositorio } = require('../repositories/mongo/MongoMetricaRepositorio');
const { MetricaModelo, AlertaModelo } = require('../repositories/mongo/esquemas');

const PASSWORD_DEMO = 'Demo1234!';

const MEDICOS = [
  { nombre: 'Dra. Laura Gómez', email: 'laura.gomez@centromedico.test', especialidad: 'Cardiología', matricula: 'MN-10001' },
  { nombre: 'Dr. Martín Ruiz', email: 'martin.ruiz@centromedico.test', especialidad: 'Clínica Médica', matricula: 'MN-10002' },
  { nombre: 'Dra. Sofía Benítez', email: 'sofia.benitez@centromedico.test', especialidad: 'Pediatría', matricula: 'MN-10003' },
];

const PACIENTES = [
  { nombre: 'Juan Pérez', email: 'juan.perez@correo.test', obraSocial: 'OSDE', historial: 'Hipertensión controlada.' },
  { nombre: 'María López', email: 'maria.lopez@correo.test', obraSocial: 'Swiss Medical', historial: null },
];

function lotesSql(archivo) {
  const contenido = fs.readFileSync(path.join(__dirname, '..', 'database', archivo), 'utf8');
  return contenido
    .split(/^\s*GO\s*$/im)
    .map((lote) => lote.trim())
    .filter(Boolean);
}

async function crearBaseSiNoExiste(cfg) {
  if (!/^[A-Za-z0-9_]+$/.test(cfg.database)) {
    throw new Error(`Nombre de base inválido: ${cfg.database}`);
  }
  const master = await crearPoolSql(cfg, { database: 'master' });
  await master.request().query(`IF DB_ID('${cfg.database}') IS NULL CREATE DATABASE [${cfg.database}];`);
  await master.close();
  console.log(`[sql] base ${cfg.database} lista`);
}

async function correrScripts(pool) {
  for (const archivo of ['01_esquema.sql', '02_procedimientos.sql']) {
    for (const lote of lotesSql(archivo)) {
      await pool.request().batch(lote);
    }
    console.log(`[sql] ${archivo} ejecutado`);
  }
}

/** Fecha UTC dentro de N días a una hora dada (hora UTC; 13 UTC = 10 hs de Argentina). */
function enDias(dias, horaUtc, minutos = 0) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  fecha.setUTCHours(horaUtc, minutos, 0, 0);
  return fecha;
}

async function cargarDatosSql(pool) {
  const { recordset } = await pool.request().query('SELECT COUNT(*) AS cantidad FROM dbo.Usuarios');
  if (recordset[0].cantidad > 0) {
    console.log('[sql] ya hay datos, no se cargan datos de prueba');
    return;
  }
  const hash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const transaccion = new sql.Transaction(pool);
  await transaccion.begin();
  try {
    const ids = { medicos: [], pacientes: [] };
    for (const m of MEDICOS) {
      const r = await new sql.Request(transaccion)
        .input('Nombre', sql.NVarChar(100), m.nombre)
        .input('Email', sql.VarChar(150), m.email)
        .input('Hash', sql.VarChar(100), hash)
        .input('Especialidad', sql.NVarChar(100), m.especialidad)
        .input('Matricula', sql.VarChar(20), m.matricula)
        .query(`
          INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, Rol) VALUES (@Nombre, @Email, @Hash, 'MEDICO');
          DECLARE @Id INT = SCOPE_IDENTITY();
          INSERT INTO dbo.Medicos (ID_Medico, Especialidad, Matricula) VALUES (@Id, @Especialidad, @Matricula);
          SELECT @Id AS id;`);
      ids.medicos.push(r.recordset[0].id);
    }
    for (const p of PACIENTES) {
      const r = await new sql.Request(transaccion)
        .input('Nombre', sql.NVarChar(100), p.nombre)
        .input('Email', sql.VarChar(150), p.email)
        .input('Hash', sql.VarChar(100), hash)
        .input('ObraSocial', sql.NVarChar(100), p.obraSocial)
        .input('Historial', sql.NVarChar(sql.MAX), p.historial)
        .query(`
          INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, Rol) VALUES (@Nombre, @Email, @Hash, 'PACIENTE');
          DECLARE @Id INT = SCOPE_IDENTITY();
          INSERT INTO dbo.Pacientes (ID_Paciente, ObraSocial, HistorialClinico) VALUES (@Id, @ObraSocial, @Historial);
          SELECT @Id AS id;`);
      ids.pacientes.push(r.recordset[0].id);
    }

    const [gomez, ruiz] = ids.medicos;
    const [juan, maria] = ids.pacientes;
    const turnos = [
      { paciente: juan, medico: gomez, fecha: enDias(2, 13), estado: 'CONFIRMADO', motivo: 'Control cardiológico' },
      { paciente: juan, medico: ruiz, fecha: enDias(3, 14), estado: 'PENDIENTE', motivo: 'Chequeo anual' },
      { paciente: maria, medico: gomez, fecha: enDias(2, 14), estado: 'PENDIENTE', motivo: 'Palpitaciones' },
      { paciente: maria, medico: ruiz, fecha: enDias(-5, 15), estado: 'CANCELADO', motivo: 'Consulta general' },
    ];
    for (const t of turnos) {
      await new sql.Request(transaccion)
        .input('Paciente', sql.Int, t.paciente)
        .input('Medico', sql.Int, t.medico)
        .input('Fecha', sql.DateTime2(0), t.fecha)
        .input('Estado', sql.VarChar(15), t.estado)
        .input('Motivo', sql.NVarChar(250), t.motivo)
        .query(`INSERT INTO dbo.Turnos (ID_Paciente, ID_Medico, FechaHora, Estado, Motivo)
                VALUES (@Paciente, @Medico, @Fecha, @Estado, @Motivo);`);
    }
    await transaccion.commit();
    console.log(`[sql] datos de prueba cargados (médicos ${ids.medicos.join(', ')} | pacientes ${ids.pacientes.join(', ')})`);
  } catch (err) {
    await transaccion.rollback();
    throw err;
  }
}

async function cargarDatosMongo(pool) {
  await MongoMetricaRepositorio.getInstancia().inicializar();
  if ((await MetricaModelo.estimatedDocumentCount()) > 0) {
    console.log('[mongo] ya hay métricas, no se cargan datos de prueba');
    return;
  }
  const { recordset } = await pool
    .request()
    .query(`SELECT TOP 1 ID_Usuario AS id FROM dbo.Usuarios WHERE Email = 'juan.perez@correo.test'`);
  const pacienteId = recordset[0]?.id;
  if (!pacienteId) return;

  const ahora = Date.now();
  const metricas = Array.from({ length: 12 }, (_, i) => ({
    pacienteId,
    timestamp: new Date(ahora - (12 - i) * 5 * 60 * 1000),
    frecuenciaCardiaca: 70 + ((i * 7) % 15),
    presionArterial: i === 9 ? '150/95' : `${118 + (i % 5)}/${76 + (i % 4)}`,
    dispositivoId: 'reloj-demo-001',
  }));
  await MetricaModelo.insertMany(metricas);
  await AlertaModelo.create({
    pacienteId,
    tipo: 'HIPERTENSION',
    nivel: 'ADVERTENCIA',
    mensaje: 'Presión arterial 150/95 por encima de 140/90',
    valor: '150/95',
    metricaTimestamp: metricas[9].timestamp,
    creadaEn: metricas[9].timestamp,
  });
  console.log(`[mongo] ${metricas.length} métricas y 1 alerta de prueba para el paciente ${pacienteId}`);
}

async function main() {
  const cfg = config.sql;
  await crearBaseSiNoExiste(cfg);
  const pool = await crearPoolSql(cfg);
  await correrScripts(pool);
  await cargarDatosSql(pool);

  await conectarMongo(config.mongoUri);
  await cargarDatosMongo(pool);

  await pool.close();
  await mongoose.disconnect();
  console.log(`[init-db] listo. Usuarios de prueba con contraseña: ${PASSWORD_DEMO}`);
}

main().catch(async (err) => {
  console.error('[init-db] error:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
