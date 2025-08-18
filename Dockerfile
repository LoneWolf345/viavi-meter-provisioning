# Multi-stage build for Viavi Meter Provisioning

# Builder stage
FROM registry.access.redhat.com/ubi9/nodejs-20 as builder
WORKDIR /opt/app-root/src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM registry.access.redhat.com/ubi9/nodejs-20 as runtime
WORKDIR /opt/app-root/src
ENV NODE_ENV=production \
    PORT=8080 \
    HOME=/opt/app-root/home
COPY --from=builder /opt/app-root/src/dist ./dist
COPY --from=builder /opt/app-root/src/package*.json ./
COPY --from=builder /opt/app-root/src/node_modules ./node_modules
EXPOSE 8080
CMD ["npm", "run", "preview", "--", "--port", "8080"]
