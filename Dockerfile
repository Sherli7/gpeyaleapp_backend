FROM node:18-alpine AS builder

WORKDIR /app

# Installer curl (pour healthcheck)
RUN apk add --no-cache curl

# Copier dépendances
COPY package*.json ./

# Installer les dépendances avec dev
RUN npm ci

# Copier le code source
COPY . .

# --------------------
# Image finale
FROM node:18-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copier uniquement prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copier la build
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

# Créer le répertoire de logs
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Changer vers l'utilisateur non-root
USER nodejs

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]