# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Lint and build
RUN npm run lint && npm run build

# Stage 2: Backend
FROM node:18-alpine AS backend

# Install FFmpeg for transcoding
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source
COPY server.js ./

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Create cache directory for converted files
RUN mkdir -p /app/converted-cache

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]