# Use a recommended Node.js base image
FROM node:20-slim

# Install system dependencies required by Playwright (Chromium/Webkit/Firefox)
# This includes the general dependencies plus the specific missing libraries from your error log:
# libgtk-4-1, libgraphene-1.0-0, libsecret-1-0, libmanette-0.2-0, libenchant-2-2, libgles2, and gstreamer component
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install Node dependencies
# This is done first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Install Playwright browsers. This command now succeeds because the OS dependencies are present.
RUN npx playwright install chromium

# Copy the rest of your application code
COPY . .

# Expose the port used by Express (defaulting to 3000 if PORT env var is not set)
EXPOSE 3000

# Command to run the application
CMD [ "npm", "run", "start" ]