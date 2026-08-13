FROM node:20-alpine AS builder
WORKDIR /app

# Manifests first: this layer is keyed on the dependency set, so a code-only
# change reuses the cached install instead of resolving the tree again. devDeps
# are needed here — `next build` runs in this stage — but they never reach the
# runtime stage below, which copies only the standalone output.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
LABEL com.sawacars.managed="true" com.sawacars.service="admin"
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001
CMD ["node", "server.js"]
