FROM node:26.13.1-bookworm-slim

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY --chown=node:node . .

ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
