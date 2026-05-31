# ─── Estágio 1: dependências de produção ──────────────────────────────────
FROM node:22-alpine AS deps-prod
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

# ─── Estágio 2: build (com devDeps para compilar TypeScript) ──────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter api build

# ─── Estágio 3: runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copia apenas node_modules de produção (sem devDeps)
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
EXPOSE 3333
CMD ["node", "dist/main.js"]
