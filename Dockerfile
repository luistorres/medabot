# Official Playwright image: Chromium + all system deps pre-installed at /ms-playwright.
# The tag MUST equal the playwright version in package-lock.json (see CI guard in
# .github/workflows/fly-deploy.yml) so the pre-baked browser is the exact revision
# the playwright package expects. This image runs Node 24 (ARG NODE_VERSION=24).
FROM mcr.microsoft.com/playwright:v1.60.0-noble

# Browsers are pre-installed here by the base image. Make the lookup path explicit
# so chromium.launch() still resolves it if the base image ever changes.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Copy package files and scripts folder (needed for postinstall: copy-pdf-worker)
COPY package*.json ./
COPY scripts ./scripts

# Install all dependencies (including dev dependencies for build).
# Browsers are already present at /ms-playwright; the playwright npm package has no
# install script, so this does not download browsers.
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
