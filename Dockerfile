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
RUN --mount=type=secret,id=VITE_FEATURE_GATE_DETECTION_ENABLED \
    --mount=type=secret,id=VITE_FEATURE_LATCH_ENABLED \
    --mount=type=secret,id=VITE_GATE_DETECT_MODE \
    --mount=type=secret,id=VITE_GATE_DETECT_SAMPLE_X \
    --mount=type=secret,id=VITE_GATE_DETECT_SAMPLE_Y \
    --mount=type=secret,id=VITE_GATE_DETECT_SAMPLE_SIZE \
    --mount=type=secret,id=VITE_GATE_DETECT_INTERVAL \
    --mount=type=secret,id=VITE_GATE_DETECT_THRESHOLD \
    --mount=type=secret,id=VITE_GATE_DETECT_OPEN_ABOVE \
    --mount=type=secret,id=VITE_GO2RTC_STREAM \
    --mount=type=secret,id=VITE_GO2RTC_URL \
    --mount=type=secret,id=VITE_HA_BASE_URL \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN \
    --mount=type=secret,id=VITE_HA_WEBHOOK_OPEN_AND_LATCH \
    --mount=type=secret,id=VITE_HA_WEBHOOK_UNLATCH \
    --mount=type=secret,id=VITE_MOCK \
    --mount=type=secret,id=VITE_VIDEO_CROP_ORIGIN_X \
    --mount=type=secret,id=VITE_VIDEO_CROP_ORIGIN_Y \
    --mount=type=secret,id=VITE_VIDEO_CROP_SCALE \
    --mount=type=secret,id=VITE_VIDEO_POI_LEFT \
    --mount=type=secret,id=VITE_VIDEO_POI_TOP \
    --mount=type=secret,id=VITE_VIDEO_POI_WIDTH \
    --mount=type=secret,id=VITE_VIDEO_POI_HEIGHT \
    --mount=type=secret,id=VITE_VIDEO_POI_LABEL \
    --mount=type=secret,id=VITE_VIDEO_POI_COLOR \
    export VITE_FEATURE_GATE_DETECTION_ENABLED=$(cat /run/secrets/VITE_FEATURE_GATE_DETECTION_ENABLED 2>/dev/null) && \
    export VITE_FEATURE_LATCH_ENABLED=$(cat /run/secrets/VITE_FEATURE_LATCH_ENABLED 2>/dev/null) && \
    export VITE_GATE_DETECT_MODE=$(cat /run/secrets/VITE_GATE_DETECT_MODE 2>/dev/null) && \
    export VITE_GATE_DETECT_SAMPLE_X=$(cat /run/secrets/VITE_GATE_DETECT_SAMPLE_X 2>/dev/null) && \
    export VITE_GATE_DETECT_SAMPLE_Y=$(cat /run/secrets/VITE_GATE_DETECT_SAMPLE_Y 2>/dev/null) && \
    export VITE_GATE_DETECT_SAMPLE_SIZE=$(cat /run/secrets/VITE_GATE_DETECT_SAMPLE_SIZE 2>/dev/null) && \
    export VITE_GATE_DETECT_INTERVAL=$(cat /run/secrets/VITE_GATE_DETECT_INTERVAL 2>/dev/null) && \
    export VITE_GATE_DETECT_THRESHOLD=$(cat /run/secrets/VITE_GATE_DETECT_THRESHOLD 2>/dev/null) && \
    export VITE_GATE_DETECT_OPEN_ABOVE=$(cat /run/secrets/VITE_GATE_DETECT_OPEN_ABOVE 2>/dev/null) && \
    export VITE_GO2RTC_STREAM=$(cat /run/secrets/VITE_GO2RTC_STREAM 2>/dev/null) && \
    export VITE_GO2RTC_URL=$(cat /run/secrets/VITE_GO2RTC_URL 2>/dev/null) && \
    export VITE_HA_BASE_URL=$(cat /run/secrets/VITE_HA_BASE_URL 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN 2>/dev/null) && \
    export VITE_HA_WEBHOOK_OPEN_AND_LATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_OPEN_AND_LATCH 2>/dev/null) && \
    export VITE_HA_WEBHOOK_UNLATCH=$(cat /run/secrets/VITE_HA_WEBHOOK_UNLATCH 2>/dev/null) && \
    export VITE_MOCK=$(cat /run/secrets/VITE_MOCK 2>/dev/null) && \
    export VITE_VIDEO_CROP_ORIGIN_X=$(cat /run/secrets/VITE_VIDEO_CROP_ORIGIN_X 2>/dev/null) && \
    export VITE_VIDEO_CROP_ORIGIN_Y=$(cat /run/secrets/VITE_VIDEO_CROP_ORIGIN_Y 2>/dev/null) && \
    export VITE_VIDEO_CROP_SCALE=$(cat /run/secrets/VITE_VIDEO_CROP_SCALE 2>/dev/null) && \
    export VITE_VIDEO_POI_LEFT=$(cat /run/secrets/VITE_VIDEO_POI_LEFT 2>/dev/null) && \
    export VITE_VIDEO_POI_TOP=$(cat /run/secrets/VITE_VIDEO_POI_TOP 2>/dev/null) && \
    export VITE_VIDEO_POI_WIDTH=$(cat /run/secrets/VITE_VIDEO_POI_WIDTH 2>/dev/null) && \
    export VITE_VIDEO_POI_HEIGHT=$(cat /run/secrets/VITE_VIDEO_POI_HEIGHT 2>/dev/null) && \
    export VITE_VIDEO_POI_LABEL=$(cat /run/secrets/VITE_VIDEO_POI_LABEL 2>/dev/null) && \
    export VITE_VIDEO_POI_COLOR=$(cat /run/secrets/VITE_VIDEO_POI_COLOR 2>/dev/null) && \
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
