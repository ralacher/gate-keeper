# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Read secrets at build time via --mount=type=secret (never stored in image layers).
# The .env file is assembled from individual secrets and sourced before the build.
# NOTE: HA_TOKEN is intentionally NOT a build secret — it is injected at runtime
# by the nginx reverse proxy so it never appears in the client-side JS bundle.
RUN --mount=type=secret,id=VITE_HA_BASE_URL \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN_AND_LATCH \
    --mount=type=secret,id=VITE_HA_WEBHOOK_UNLATCH \
    --mount=type=secret,id=VITE_GO2RTC_URL \
    --mount=type=secret,id=VITE_GO2RTC_STREAM \
    export VITE_HA_BASE_URL=$(cat /run/secrets/VITE_HA_BASE_URL 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN_AND_LATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN_AND_LATCH 2>/dev/null) && \
    export VITE_HA_WEBHOOK_UNLATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_UNLATCH 2>/dev/null) && \
    export VITE_GO2RTC_URL=$(cat /run/secrets/VITE_GO2RTC_URL 2>/dev/null) && \
    export VITE_GO2RTC_STREAM=$(cat /run/secrets/VITE_GO2RTC_STREAM 2>/dev/null) && \
    export VITE_MOCK=false && \
    npm run build

# ── Stage 2: Install push-server dependencies ────────────────
FROM node:22-alpine AS push-deps

WORKDIR /push-server
COPY push-server/package.json push-server/package-lock.json* ./
RUN npm install --omit=dev

# ── Stage 3: Serve (nginx + push-server) ─────────────────────
FROM node:22-alpine

# Install nginx
RUN apk add --no-cache nginx gettext

# Remove default nginx config
RUN rm -f /etc/nginx/http.d/default.conf

# Copy nginx config template
COPY nginx.conf /etc/nginx/default.conf.template

# Copy custom entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built SPA
COPY --from=build /app/dist /usr/share/nginx/html

# Copy push server
COPY push-server/server.js /push-server/server.js
COPY --from=push-deps /push-server/node_modules /push-server/node_modules
COPY push-server/package.json /push-server/package.json

# Create data directory for push subscriptions
RUN mkdir -p /data

EXPOSE 80

# VAPID keys and HA/go2rtc URLs are provided as runtime env vars
ENTRYPOINT ["/docker-entrypoint.sh"]
