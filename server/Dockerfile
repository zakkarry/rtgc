FROM node:22
RUN corepack enable
RUN corepack prepare pnpm@9.14.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
VOLUME /config
ENV CONFIG_DIR=/config
ENV DOCKER_ENV=true
ENV PORT=6014
COPY vite.config.js vite.config.js
COPY client client
RUN pnpm build
COPY server server
EXPOSE 6014
ENTRYPOINT ["node", "--experimental-transform-types", "server/server.ts"]
