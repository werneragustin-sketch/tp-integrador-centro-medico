FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Primero solo las dependencias (se cachean si package.json no cambia)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

USER node
EXPOSE 3000

# Inicializa la base (idempotente) y levanta la API
CMD ["sh", "-c", "node scripts/init-db.js && node index.js"]
