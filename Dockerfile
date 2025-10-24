# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Build stage: build the Vite app
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20.11-alpine3.19 AS builder

# Create app directory
WORKDIR /opt/app-root/src

# Install full deps (incl. dev) so Vite is available to build
COPY package*.json ./
RUN npm ci --no-cache

# Copy source and build
COPY . .
RUN npm run build


# ──────────────────────────────────────────────────────────────────────────────
# Runtime stage: serve static files with OpenShift-friendly NGINX
# ──────────────────────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nginx-120

# NGINX in this image listens on 8080 by default
ENV PORT=8080

# Copy built artifacts from builder stage
COPY --from=builder /opt/app-root/src/dist/ /usr/share/nginx/html/

# Provide SPA routing & config file handling
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Make directories writable by group-0 so arbitrary UID in OpenShift can run NGINX
# OpenShift runs containers with a random UID but always in group 0
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx \
    && chgrp -R 0 /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d \
    && chmod -R g+rwX /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d

# Labels (customize as needed)
LABEL io.openshift.expose-services="8080:http" \
      io.k8s.description="VIAVI Meter Provisioning (NGINX Static)" \
      io.openshift.tags="nginx,react,spa" \
      io.openshift.non-scalable="false" \
      io.k8s.display-name="viavi-meter-provisioning"

EXPOSE 8080

# The UBI9 NGINX image has a built-in CMD that starts nginx in foreground mode
# No explicit CMD needed - it will run: nginx -g "daemon off;"
