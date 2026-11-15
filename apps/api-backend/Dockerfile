FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
# Carpeta de videos con dueño "node": en producción el contenedor corre sin privilegios de root
# (docker-compose.prod.yml usa user: node) y el volumen nuevo hereda estos permisos.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads /app/data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
