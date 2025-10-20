# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Builder stage: compile the Vite app
# ──────────────────────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder

# Build-time env for Vite (adjust if needed)
ENV NODE_ENV=production \
    VITE_API_BASE_URL="https://ldap-api.apps.prod-ocp4.corp.cableone.net/" \
    VITE_USE_STUB_API="false"

WORKDIR /opt/app-root/src

# Install only what's needed to build
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build


# ──────────────────────────────────────────────────────────────────────────────
# Runtime stage: serve static files with OpenShift-friendly NGINX
# ──────────────────────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nginx-120

# NGINX in this image listens on 8080; keep it explicit for clarity
ENV PORT=8080

# Copy built artifacts
COPY --from=builder /opt/app-root/src/dist/ /usr/share/nginx/html/

# Provide SPA routing & basic tuning
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Make directories writable by "root" group so arbitrary UID in OpenShift (group 0)
# can run NGINX and write its cache/run/logs if needed.
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx \
    && chgrp -R 0 /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d \
    && chmod -R g+rwX /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d

EXPOSE 8080
