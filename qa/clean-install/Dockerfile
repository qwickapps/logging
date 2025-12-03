# Clean environment validation test for @qwickapps/logging
# This Dockerfile simulates a fresh project installing the package from npm/local tarball
FROM node:20-alpine

WORKDIR /app

# Copy local package tarball (built during validation)
COPY packages/*.tgz /tmp/

# Create a new TypeScript project
RUN mkdir test-app && cd test-app && npm init -y

WORKDIR /app/test-app

# Install TypeScript and required dependencies
RUN npm install typescript @types/node --save-dev

# Install local package
RUN npm install /tmp/qwickapps-logging-*.tgz

# Copy test application file
COPY test-app.ts ./src/index.ts

# Create tsconfig.json
RUN echo '{ \
  "compilerOptions": { \
    "target": "ES2020", \
    "module": "commonjs", \
    "strict": true, \
    "esModuleInterop": true, \
    "skipLibCheck": true, \
    "forceConsistentCasingInFileNames": true, \
    "outDir": "./dist", \
    "rootDir": "./src", \
    "declaration": true \
  }, \
  "include": ["src/**/*"] \
}' > tsconfig.json

# Build to verify TypeScript compilation works
RUN npx tsc

# Run the compiled code to verify runtime works
RUN node dist/index.js

# Success indicator
CMD ["echo", "SUCCESS: Package validated in clean environment"]
