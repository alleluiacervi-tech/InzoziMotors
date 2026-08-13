FROM node:20-alpine
LABEL com.sawacars.managed="true" com.sawacars.service="api"
WORKDIR /app

# Manifests before source, deliberately: this layer is keyed on the dependency
# set, so editing a route reuses the cached install. --omit=dev keeps test and
# tooling packages out of the image that faces the internet.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
