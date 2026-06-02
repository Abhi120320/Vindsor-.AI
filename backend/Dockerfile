# Use root Dockerfile for Render (repo root). This file is for local backend-only builds.
FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
ENV NPM_CONFIG_LOGLEVEL=error
RUN npm ci --legacy-peer-deps --no-audit --no-fund

FROM base AS build
COPY . .
RUN npx prisma generate
RUN npm run build
RUN test -f dist/prisma/seed.js || (echo "Missing dist/prisma/seed.js — seed was not compiled" && exit 1)

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
