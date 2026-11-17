
FROM node:22-alpine

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source
COPY . .

# API port
EXPOSE 5000

# Default command
CMD ["npm", "start"]
