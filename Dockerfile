# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Read secrets at build time via --mount=type=secret (never stored in image layers).
# The .env file is assembled from individual secrets and sourced before the build.
RUN --mount=type=secret,id=VITE_HA_BASE_URL \
    --mount=type=secret,id=VITE_HA_TOKEN \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN_AND_LATCH \
    --mount=type=secret,id=VITE_HA_WEBHOOK_UNLATCH \
    --mount=type=secret,id=VITE_GO2RTC_URL \
    --mount=type=secret,id=VITE_GO2RTC_STREAM \
    export VITE_HA_BASE_URL=$(cat /run/secrets/VITE_HA_BASE_URL 2>/dev/null) && \
    export VITE_HA_TOKEN=$(cat /run/secrets/VITE_HA_TOKEN 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN_AND_LATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN_AND_LATCH 2>/dev/null) && \
    export VITE_HA_WEBHOOK_UNLATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_UNLATCH 2>/dev/null) && \
    export VITE_GO2RTC_URL=$(cat /run/secrets/VITE_GO2RTC_URL 2>/dev/null) && \
    export VITE_GO2RTC_STREAM=$(cat /run/secrets/VITE_GO2RTC_STREAM 2>/dev/null) && \
    export VITE_MOCK=false && \
    npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:alpine

# Remove default site
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config template (NOT in /etc/nginx/templates/ — we handle envsubst ourselves)
COPY nginx.conf /etc/nginx/default.conf.template

# Copy custom entrypoint that only substitutes HA_BASE_URL and GO2RTC_URL
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
