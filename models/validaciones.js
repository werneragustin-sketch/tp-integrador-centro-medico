const { ErrorValidacion } = require('./errores');

function aEnteroPositivo(valor, campo) {
  const numero = Number(valor);
  if (valor === null || valor === '' || !Number.isInteger(numero) || numero <= 0) {
    throw new ErrorValidacion(`${campo} debe ser un entero positivo`);
  }
  return numero;
}

function aFecha(valor, campo) {
  const fecha = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  if (valor === undefined || valor === null || valor === '' || Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion(`${campo} debe ser una fecha válida (ISO 8601)`);
  }
  return fecha;
}

module.exports = { aEnteroPositivo, aFecha };
