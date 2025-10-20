# Multi-stage build for VIAVI Meter Provisioning

# Builder stage
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder
ENV NODE_ENV=production
WORKDIR /opt/app-root/src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage - NGINX static server
FROM registry.access.redhat.com/ubi9/nginx-120
ENV PORT=8080

# Copy built assets
COPY --from=builder /opt/app-root/src/dist /usr/share/nginx/html/

# Copy NGINX configuration for SPA routing
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
