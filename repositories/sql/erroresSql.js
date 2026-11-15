const { ErrorConflicto, ErrorNoEncontrado } = require('../../models/errores');

/**
 * Los procedimientos almacenados avisan reglas de negocio con THROW 5000x.
 * Acá se traducen a errores de dominio para que la API responda 404/409.
 */
const ERRORES_DE_NEGOCIO = {
  50001: ErrorConflicto, // superposición de turnos
  50002: ErrorConflicto, // email ya registrado
  50003: ErrorConflicto, // turno no reprogramable
  50004: ErrorNoEncontrado, // médico o turno inexistente
};

function numeroDeError(err) {
  return err?.number ?? err?.originalError?.info?.number ?? err?.originalError?.number;
}

function traducirErrorSql(err) {
  const numero = numeroDeError(err);
  const ClaseError = ERRORES_DE_NEGOCIO[numero];
  if (ClaseError) {
    return new ClaseError(err.originalError?.info?.message || err.message);
  }
  if (numero === 2627 || numero === 2601) {
    return new ErrorConflicto('Registro duplicado');
  }
  return err;
}

module.exports = { traducirErrorSql };
