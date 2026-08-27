FROM node:20-alpine
LABEL com.sawacars.managed="true" com.sawacars.service="api"
WORKDIR /app

# fontconfig is what makes SVG text render at all. Without it sharp composites
# the plate badge with no wordmark — a black panel that looks almost right and
# is completely wrong. src/lib/contract/fonts.js records the same class of bug
# biting the contract PDF, and lib/plate-badge.js refuses to publish a badge
# whose wordmark did not draw. This is the fix rather than the detector.
#
# The brand face (assets/fonts/Satoshi-*.ttf) is registered after COPY below;
# DejaVu is installed here as the fallback the SVG font stack names.
RUN apk add --no-cache fontconfig font-dejavu

# Manifests before source, deliberately: this layer is keyed on the dependency
# set, so editing a route reuses the cached install. --omit=dev keeps test and
# tooling packages out of the image that faces the internet.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

# Register the brand face so the badge's font stack resolves "Satoshi" rather
# than silently falling back.
RUN mkdir -p /usr/share/fonts/sawa \
 && cp assets/fonts/*.ttf /usr/share/fonts/sawa/ \
 && fc-cache -f

RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
