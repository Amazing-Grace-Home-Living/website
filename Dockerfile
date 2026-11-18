# Cloud Run is an OPTIONAL static-site target; Vercel is production.
# Never start the local Grace Remote companion in a public container.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/scripts/serve.mjs ./scripts/serve.mjs
USER node
EXPOSE 8080
CMD ["node", "scripts/serve.mjs", "dist"]
