# ─── Build ───────────────────────────────────────────────────────────────────
# Mirrors admin/Dockerfile, with two differences: this image runs on 3002, and
# it drops to a non-root user — the website is the only one of the three
# services exposed to the open internet.

FROM node:20-alpine AS builder
WORKDIR /app

# web/ has no committed lockfile yet, so `npm ci` cannot be assumed. Prefer it
# when the lockfile is there (reproducible), fall back when it is not.
# TODO(web): commit package-lock.json and reduce this to `npm ci`.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

COPY . .

# NEXT_PUBLIC_* is inlined into the browser bundle at build time, so these are
# build args rather than runtime env. Both must be reachable from a BROWSER —
# the server-side API_URL (which may be an internal Docker host) is injected at
# runtime instead, in docker-compose.yml.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
# Search Console ownership token — rendered as a <meta> tag by the root layout.
# Empty means the tag is simply omitted; it is public information once set, so
# it travels as a plain build arg, not a secret.
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_TELEMETRY_DISABLED=1

# Pages that read the catalogue are prerendered here. The API is usually not
# reachable during a build, which is why every build-time fetch degrades
# instead of throwing (see src/app/sitemap.ts).
RUN npm run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
# Without this the standalone server binds 127.0.0.1 and nothing outside the
# container can reach it.
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# node:alpine already ships an unprivileged `node` user (uid 1000) — reuse it
# rather than creating another. Nothing in the image is written at runtime.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3002

CMD ["node", "server.js"]
