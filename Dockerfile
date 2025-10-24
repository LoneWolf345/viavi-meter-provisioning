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
# Production stage: run Vite preview (serves /dist)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20.11-alpine3.19 AS production

# Create OpenShift-friendly dirs and npm cache dir
RUN mkdir -p /opt/app-root/src \
    /opt/app-root/home \
    /opt/app-root/home/.npm \
    /tmp

WORKDIR /opt/app-root/src

# Environment for OpenShift + Vite preview
ENV HOME=/opt/app-root/home \
    NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_CACHE=/opt/app-root/home/.npm \
    NODE_OPTIONS="--max-old-space-size=384"

# Copy package files and install deps (keep dev deps so "vite preview" works)
COPY package*.json ./
RUN npm ci --no-cache

# Bring in the built assets
COPY --from=builder /opt/app-root/src/dist ./dist

# (Optional) Vite config is sometimes referenced at preview time
COPY vite.config.ts ./

# Install curl for healthcheck
RUN apk --no-cache add curl

# OpenShift arbitrary UID support: give group-0 write access and set a non-root UID
# NOTE: This mirrors your example even if it's not the ideal pattern.
RUN chown -R 1001580000:0 /opt/app-root /tmp \
 && chmod -R g=u /opt/app-root /tmp

# Switch to unprivileged user
USER 1001580000

# Labels (customize as needed)
LABEL io.openshift.expose-services="8080:http" \
      io.k8s.description="VIAVI Meter Provisioning (Vite React)" \
      io.openshift.tags="nodejs,vite,react" \
      io.openshift.non-scalable="false" \
      io.k8s.display-name="viavi-meter-provisioning"

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the preview server; bind to all interfaces for containers
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8080"]
