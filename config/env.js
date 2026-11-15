require('dotenv').config({ quiet: true });

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Copiá .env.example a .env y completala.`);
  }
  return valor;
}

function booleana(nombre, porDefecto) {
  const valor = process.env[nombre];
  return valor === undefined ? porDefecto : valor.toLowerCase() === 'true';
}

/** Configuración leída del .env. Se valida recién cuando se usa cada parte. */
const config = {
  get puerto() {
    return Number(process.env.PORT) || 3000;
  },
  get jwt() {
    return { secreto: requerida('JWT_SECRET'), expiraEn: process.env.JWT_EXPIRA_EN || '2h' };
  },
  get iotApiKey() {
    return requerida('IOT_API_KEY');
  },
  get mongoUri() {
    return requerida('MONGO_URI');
  },
  get sql() {
    return {
      server: requerida('SQL_SERVER'),
      port: Number(process.env.SQL_PORT) || 1433,
      user: requerida('SQL_USER'),
      password: requerida('SQL_PASSWORD'),
      database: process.env.SQL_DATABASE || 'CentroMedico',
      encrypt: booleana('SQL_ENCRYPT', true),
      trustServerCertificate: booleana('SQL_TRUST_SERVER_CERTIFICATE', true),
    };
  },
};

module.exports = { config };
