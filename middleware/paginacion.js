const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

/**
 * Todos los GET de listados son paginados: ?pagina=1&limite=10.
 * Deja el resultado en req.paginacion y ofrece res.paginado() para responder.
 */
function paginacion(req, res, next) {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(
    LIMITE_MAXIMO,
    Math.max(1, Number.parseInt(req.query.limite, 10) || LIMITE_POR_DEFECTO)
  );
  req.paginacion = { pagina, limite };

  res.paginado = ({ items, total }) =>
    res.status(200).json({
      datos: items,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    });
  next();
}

module.exports = { paginacion, LIMITE_MAXIMO };
