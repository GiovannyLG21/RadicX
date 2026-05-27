FROM node:22-alpine3.23

WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm@latest-11
RUN pnpm build

COPY . .