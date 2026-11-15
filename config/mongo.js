const mongoose = require('mongoose');

async function conectarMongo(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

module.exports = { conectarMongo };
