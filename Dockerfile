# Shop AI: one image with the web app. Build from the repository root:  docker build -t shop-ai .
# Needs Node 22.13+ (built-in SQLite). The database, session secret and uploads live in /data (a volume).
FROM node:22-bookworm-slim AS build
WORKDIR /srv/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
# Next.js loads the route modules while building; keep that throw-away database out of the image
ENV DATA_DIR=/tmp/build-data NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/data PORT=3000
WORKDIR /srv/app
COPY --from=build /srv/app ./
# the sample menu that scripts/seed.mts loads (it looks for ../../eval/menu.json)
COPY eval/menu.json /srv/eval/menu.json
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# first start: seed the sample restaurant (random credentials printed to the log, unless SEED_* are set), then serve
CMD ["sh", "-c", "node --experimental-strip-types --no-warnings scripts/seed.mts && exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT}"]
