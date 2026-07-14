FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Node dependencies
# --legacy-peer-deps: eslint-plugin-jsx-a11y's peer range (^3..^9) hasn't
# caught up to eslint 10 yet; this is a devDependency-only conflict that
# doesn't affect the production bundle.
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build frontend
COPY . .
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN npm run build

# Start FastAPI (serves both API and built React app)
WORKDIR /app/backend
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
