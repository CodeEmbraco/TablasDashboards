FROM node:24-alpine as base
WORKDIR /app
COPY package*.json ./

#DEV
FROM base AS dev
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

#PRODUCCIÓN
FROM base AS builder 
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

#FINAL
FROM ngix:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","g","daemon off;"]