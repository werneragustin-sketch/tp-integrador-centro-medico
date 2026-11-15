/**
 * Simula un dispositivo IoT (reloj inteligente) que manda métricas a la API.
 * Es un CLIENTE más de la API: muestra el modelo cliente-servidor sin frontend.
 *
 * Uso: npm run simulador -- --paciente 4 --intervalo 2000 --cantidad 20
 *   cada 5 lecturas manda una anormal para disparar alertas.
 */
require('dotenv').config({ quiet: true });

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : porDefecto;
}

const API = argumento('api', process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`);
const PACIENTE = Number(argumento('paciente', 4));
const INTERVALO = Number(argumento('intervalo', 2000));
const CANTIDAD = Number(argumento('cantidad', 15));
const API_KEY = process.env.IOT_API_KEY;

const azar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function lectura(n) {
  const anormal = n % 5 === 0;
  return {
    pacienteId: PACIENTE,
    timestamp: new Date().toISOString(),
    frecuenciaCardiaca: anormal ? azar(125, 160) : azar(62, 95),
    presionArterial: anormal ? `${azar(145, 185)}/${azar(92, 115)}` : `${azar(110, 130)}/${azar(70, 85)}`,
    dispositivoId: `reloj-sim-${PACIENTE}`,
  };
}

async function enviar(n) {
  const cuerpo = lectura(n);
  const respuesta = await fetch(`${API}/api/metricas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json();
  const marca = datos.alertasGeneradas ? `  ⚠ ${datos.alertasGeneradas} alerta(s)` : '';
  console.log(
    `#${n} [${respuesta.status}] FC ${cuerpo.frecuenciaCardiaca} lpm | PA ${cuerpo.presionArterial}${marca}`
  );
}

(async () => {
  if (!API_KEY) {
    console.error('Falta IOT_API_KEY en el .env');
    process.exit(1);
  }
  console.log(`Simulador IoT -> ${API} | paciente ${PACIENTE} | ${CANTIDAD} lecturas cada ${INTERVALO} ms`);
  for (let n = 1; n <= CANTIDAD; n++) {
    try {
      await enviar(n);
    } catch (err) {
      console.error(`#${n} error: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, INTERVALO));
  }
})();
