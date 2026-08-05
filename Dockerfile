# TechPhone — all-in-one FE (Vite build) + Express API + Socket.io
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY server ./server

# Same-origin production: empty = relative /api URLs
ARG VITE_API_BASE_URL=
ARG VITE_SOCKET_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV SERVE_STATIC=true

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "server/src/index.js"]
