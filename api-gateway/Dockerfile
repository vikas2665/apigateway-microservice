# Step 1: Install production dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Step 2: Production runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root user
USER node

# Copy dependencies and application code
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

EXPOSE 5000

CMD ["node", "src/app.js"]
