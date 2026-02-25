# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Accept VITE_ build args so Vite inlines them into the JS bundle
ARG VITE_HA_BASE_URL
ARG VITE_HA_TOKEN
ARG VITE_HA_WEBHOOK_OPEN
ARG VITE_HA_WEBHOOK_OPEN_AND_LATCH
ARG VITE_HA_WEBHOOK_UNLATCH
ARG VITE_GO2RTC_URL
ARG VITE_GO2RTC_STREAM
ARG VITE_MOCK

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:alpine

# Remove default site
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config template (NOT in /etc/nginx/templates/ — we handle envsubst ourselves)
COPY nginx.conf /etc/nginx/default.conf.template

# Copy custom entrypoint that only substitutes HA_BASE_URL and GO2RTC_URL
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
