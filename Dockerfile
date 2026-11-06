# Use official Node.js image
FROM node:20-slim

# Create and set working directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose Cloud Run default port
EXPOSE 8080

# Environment variable for Cloud Run
ENV PORT=8080

# Start application
CMD ["npm", "start"]