# Use Node.js 18 as the base image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install gallery-dl for Pinterest functionality
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install --no-cache-dir gallery-dl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Environment variables will be provided via docker-compose or docker run
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "start"]