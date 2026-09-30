FROM node:20-bookworm-slim

# Install Python 3, pip, and required system tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-setuptools \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Install Server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Install Client dependencies and build production frontend bundle
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Copy all application code
COPY . .

# Environment setup
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Start the unified web application
CMD ["node", "server/src/index.js"]
