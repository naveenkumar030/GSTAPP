# ==========================================
# Stage 1: Build the React frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install


# Copy full application source code to build frontend
COPY vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
COPY index.html ./

# Build the production files into /app/dist
RUN npm run build

# ==========================================
# Stage 2: Build the FastAPI backend
# ==========================================
FROM python:3.11-slim AS backend-runner
WORKDIR /app

# Install system dependencies if any are needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy the built frontend static files from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose the port
EXPOSE 8000

# Set working directory to backend so Python imports work properly
WORKDIR /app/backend

# Command to run uvicorn (Render automatically injects PORT)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips="*"
