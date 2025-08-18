# Multi-stage build for Viavi Meter Provisioning

# Builder stage
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder
WORKDIR /opt/app-root/src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM registry.access.redhat.com/ubi9/nodejs-20
WORKDIR /opt/app-root/src
COPY --from=builder /opt/app-root/src/dist ./dist
ENV NODE_ENV=production PORT=8080 HOME=/opt/app-root/home NPM_CONFIG_PREFIX=/opt/app-root/home/.npm-global
RUN mkdir -p $NPM_CONFIG_PREFIX
EXPOSE 8080
CMD ["npx", "vite", "preview", "--port", "8080", "--strictPort"]
