FROM node:24-alpine AS base

# Install dependencies (including dev, needed for the build)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships no musl prebuild, so it is compiled from source here
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci \
    && apk del .build-deps

# Build the AdonisJS server, the client bundle and the SSR bundle
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build

# Production image: only the build output and production dependencies
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/build ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
