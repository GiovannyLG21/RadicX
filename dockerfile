FROM node:22-alpine3.23

WORKDIR /app

RUN npm install -g pnpm@latest-11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build