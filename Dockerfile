FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/postgres-drizzle ./postgres-drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm start"]
