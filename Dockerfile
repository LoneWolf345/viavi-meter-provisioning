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
ENV NODE_ENV=production PORT=8080 HOME=/opt/app-root/home
EXPOSE 8080
CMD ["npx", "vite", "preview", "--port", "8080", "--strictPort"]
