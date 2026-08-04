# O builder de buildpack do Dokku desta máquina tem um índice de versões antigo:
# não resolve Node 24 e o mais novo que oferece (22.11) é anterior ao mínimo do
# @sveltejs/vite-plugin-svelte. Com Dockerfile a versão é exata, e os módulos
# nativos (better-sqlite3, sharp) compilam num ambiente conhecido.

FROM node:24-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 cai pra compilar do fonte quando não há prebuild pra plataforma.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json

# O banco e as artes moram no volume montado pelo Dokku em /app/storage.
EXPOSE 3000
CMD ["node", "build"]
