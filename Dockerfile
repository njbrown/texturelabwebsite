FROM node:24-alpine AS base

# The web runtime lives in the vendor/texturelab submodule and is linked into
# node_modules with a file: dependency, so its package.json has to be in place
# before npm ci, and its dist/ before the production install.
ARG RUNTIME_DIR=vendor/texturelab/web/packages/runtime

# Install dependencies (including dev, needed for the build)
FROM base AS deps
ARG RUNTIME_DIR
WORKDIR /app
COPY package.json package-lock.json ./
COPY ${RUNTIME_DIR}/package.json ./${RUNTIME_DIR}/
# better-sqlite3 ships no musl prebuild, so it is compiled from source here
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci \
    && apk del .build-deps

# Build the web runtime, the AdonisJS server, the client bundle and the SSR bundle
FROM base AS build
ARG RUNTIME_DIR
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -f ${RUNTIME_DIR}/src/core/index.ts || { \
      echo "error: ${RUNTIME_DIR} is empty. The vendor/texturelab submodule was not checked out" >&2; \
      echo "       (git submodule update --init vendor/texturelab, or enable submodules in Dokploy)." >&2; \
      exit 1; }
RUN npm run build

# Production image: only the build output and production dependencies
FROM base AS production
ARG RUNTIME_DIR
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
WORKDIR /app
# Share cards draw text with the bundled fonts (resources/fonts); fontconfig
# only provides its default config, so libvips doesn't log an error per card.
RUN apk add --no-cache fontconfig
COPY --from=build /app/build ./
COPY --from=build /app/${RUNTIME_DIR}/package.json ./${RUNTIME_DIR}/
COPY --from=build /app/${RUNTIME_DIR}/dist ./${RUNTIME_DIR}/dist
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
