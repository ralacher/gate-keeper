# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:alpine

# Remove default site
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config (uses envsubst for runtime env vars)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine image auto-runs envsubst on /etc/nginx/templates/*.template
# and outputs to /etc/nginx/conf.d/ before starting nginx
