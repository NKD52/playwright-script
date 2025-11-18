# Use a recommended Node.js base image
FROM node:20-slim

# Install ALL system dependencies required by Playwright (Chromium/Webkit/Firefox)
# This comprehensive list includes the base dependencies plus all the specific missing
# libraries reported (libgtk, libgraphene, libsecret, libasound2, etc.).
RUN apt-get update && apt-get install -y \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libsecret-1-0 \
    libmanette-0.2-0 \
    libenchant-2-2 \
    libgles2 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    libnss3 \
    libxcomposite1 \
    libxtst6 \
    libxss1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libatspi2.0-0 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Install Playwright browsers (now that OS dependencies are met)
RUN npx playwright install chromium

# Copy the rest of your application code
COPY . .

# Expose the port used by Express
EXPOSE 3000

# Command to run the application
CMD [ "npm", "run", "start" ]