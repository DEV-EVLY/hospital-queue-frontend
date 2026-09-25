# ==============================================================================
# FRONTEND MULTI-STAGE DOCKERFILE (NODE 22 BUILDER + NGINX ALPINE)
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ ./src/

RUN npm run build

# Stage Servidor Nginx Web
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
