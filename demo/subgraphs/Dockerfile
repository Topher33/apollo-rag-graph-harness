# Build from the repo root:  docker build -f demo/subgraphs/Dockerfile -t harness/demo-subgraphs:dev .
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Workspace manifests first for layer caching (package-lock.json is created by `npm install`; deploy/scripts/up.sh runs it).
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY demo/subgraphs/package.json demo/subgraphs/
RUN npm ci --omit=dev -w @harness/demo-subgraphs
COPY demo/subgraphs demo/subgraphs
USER node
EXPOSE 4001 4002 4003 4004
# Selects the subgraph with SUBGRAPH=customers|orders|catalog|inventory (see deploy/k8s/subgraphs.yaml)
CMD ["node", "demo/subgraphs/src/main.js"]
