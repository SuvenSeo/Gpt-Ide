FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/widget/package.json apps/widget/package.json
COPY packages/core/package.json packages/core/package.json
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 WORKSPACE_ROOT=/workspace
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/widget/dist ./apps/widget/dist
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
RUN mkdir -p /workspace && chown -R node:node /app /workspace
USER node
EXPOSE 8000
CMD ["node", "apps/server/dist/index.js"]
