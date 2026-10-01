FROM node:24-alpine AS build
ARG SITE_URL=http://localhost:3000
ARG API_INTERNAL_URL=http://127.0.0.1:8000
ENV SITE_URL=$SITE_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
