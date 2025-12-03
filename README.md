# @qwickapps/logging

## Overview

The QwickApps React Framework includes a sophisticated logging system designed for development debugging while ensuring zero performance impact and complete removal in production builds. The system provides namespaced loggers, multiple log levels, and flexible build configurations.

## Features

- **Runtime Environment Detection**: Checks `NODE_ENV` at runtime, allowing consumers to control logging behavior
- **Namespaced Loggers**: Pre-configured loggers for different components
- **Multiple Log Levels**: debug, info, warn, error with appropriate console methods
- **Complete Production Stripping**: Optional build flag to completely remove all logging code
- **Zero Performance Impact**: Early returns and build-time stripping prevent any overhead
- **TypeScript Support**: Full type definitions included

## Basic Usage

### Import and Use Pre-configured Loggers

```typescript
import { commonLoggers, createLogger } from '@qwickapps/logging';

// Use common pre-configured loggers
const logger = commonLoggers.app;

// Log at different levels
logger.debug('Navigation changed to:', path);
logger.info('Component initialized');
logger.warn('Deprecated prop used:', propName);
logger.error('Failed to load:', error);
```

### Available Pre-configured Loggers

- `commonLoggers.app` - For general application logging
- `commonLoggers.api` - For API-related logging
- `commonLoggers.auth` - For authentication logging
- `commonLoggers.data` - For data management logging
- `commonLoggers.ui` - For UI component logging
- `commonLoggers.perf` - For performance logging
- `commonLoggers.error` - For error logging
- `commonLoggers.debug` - For debug-specific logging

### Creating Custom Loggers

```typescript
import { createLogger } from '@qwickapps/logging';

// Create a logger with custom namespace
const myLogger = createLogger('MyComponent');

myLogger.debug('Component mounted');
myLogger.info('Data loaded:', data);
```

### Child Loggers

Create sub-namespaced loggers for better organization:

```typescript
const logger = createLogger('MyApp');
const authLogger = logger.child('Auth');
const apiLogger = logger.child('API');

authLogger.debug('Login attempt'); // [MyApp:Auth] Login attempt
apiLogger.info('Request sent');    // [MyApp:API] Request sent
```

## Advanced Features

### Timing Operations

```typescript
logger.time('DataFetch');
// ... perform operation
logger.timeEnd('DataFetch'); // [Namespace] DataFetch: 123.45ms
```

### Grouping Related Logs

```typescript
logger.group('User Actions');
logger.debug('Click event:', event);
logger.debug('State updated:', newState);
logger.groupEnd();
```

### Development-Only Functions

For simple logging without creating logger instances:

```typescript
import { devLog, devWarn, devError } from '@qwickapps/logging';

devLog('MyComponent', 'Render triggered', props);
devWarn('MyComponent', 'Using deprecated API');
devError('MyComponent', 'Validation failed', errors);
```

## Build Configuration

### Development Builds

For development builds with full logging:

```bash
# In your application's package.json
"scripts": {
  "build:dev": "NODE_ENV=development webpack build",
  "deploy:dev": "npm run build:dev && npm run deploy"
}
```

### Production Builds

For production builds with runtime logging control (logs disabled but code present):

```bash
# Standard production build
"scripts": {
  "build": "NODE_ENV=production webpack build",
  "deploy": "npm run build && npm run deploy"
}
```

### Production Builds with Complete Log Stripping

For maximum optimization, completely remove all logging code:

```bash
# In your application's webpack.config.js or vite.config.js
import replace from '@rollup/plugin-replace';

export default {
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
      // Add these to completely strip logging
      delimiters: ['', ''],
      values: {
        'logger.': 'null && ',
        'devLog(': '(() => {})(',
        'devWarn(': '(() => {})(',
        'devError(': '(() => {})(',
      }
    })
  ]
}
```

## Browser/PWA Usage

The main entry point (`@qwickapps/logging`) is browser-compatible and automatically falls back to console-based logging when pino is not available.

```typescript
// Works in both browser and Node.js
import { getLogger, Logger } from '@qwickapps/logging';

const logger = getLogger('MyComponent');
logger.info('Hello from browser or Node.js!');
```

### StartupLogger (Node.js Only)

The `StartupLogger` class is available via a **separate entry point** since it uses Node.js-specific modules (`fs`, `path`):

```typescript
// Node.js only - DO NOT import in browser code
import { StartupLogger, getStartupLogger } from '@qwickapps/logging/startup';

const startup = getStartupLogger();
startup.startPhase('INIT');
startup.log('info', 'Application starting...');
```

**Important:** Never import from `@qwickapps/logging/startup` in browser/PWA code - it will cause build failures.

### Entry Points Summary

| Entry Point | Environment | Description |
|-------------|-------------|-------------|
| `@qwickapps/logging` | Browser + Node.js | Main logger (getLogger, Logger, commonLoggers) |
| `@qwickapps/logging/startup` | Node.js only | StartupLogger for file-based startup logging |

## Integration Examples

### With Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    // For production builds, minification will help remove dead code
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
}));
```

### With Create React App

```javascript
// In your app code, the logger will automatically detect CRA's NODE_ENV
import { loggers } from '@qwickapps/react-framework';

const logger = loggers.navigation;
// Logs appear in development, silent in production
logger.debug('Route changed');
```

### With Next.js

```javascript
// next.config.js
module.exports = {
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      // Production optimizations
      config.optimization.minimize = true;
    }
    return config;
  },
};
```

## Performance Considerations

1. **Development Mode**: Full logging with minimal overhead
2. **Production Mode (Runtime Check)**: Logger checks disabled state and returns immediately
3. **Production Mode (Stripped)**: No logging code present in bundle at all

### Bundle Size Impact

- **With Logging Code**: ~2KB gzipped (but inactive in production)
- **With Complete Stripping**: 0KB - all logging code removed

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug('Detailed state:', state);        // Development details
logger.info('User logged in');                 // Important events
logger.warn('API deprecated');                 // Warnings
logger.error('Failed to save:', error);        // Errors

// ❌ Avoid
console.log('Debug:', data);                   // Use logger instead
if (process.env.NODE_ENV === 'development') {  // Logger handles this
  console.log(data);
}
```

### 2. Use Namespaced Loggers

```typescript
// ✅ Good - Clear component identification
const logger = loggers.auth;
logger.debug('Login attempt');

// ❌ Avoid - No context
console.log('Login attempt');
```

### 3. Structure Complex Data

```typescript
// ✅ Good - Structured logging
logger.debug('Navigation event', {
  from: currentPath,
  to: newPath,
  timestamp: Date.now(),
  user: userId
});

// ❌ Avoid - Unstructured
logger.debug(`Nav: ${currentPath} -> ${newPath} at ${Date.now()}`);
```

### 4. Remove Sensitive Data

```typescript
// ✅ Good - Sanitized data
logger.debug('User data', {
  id: user.id,
  email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
});

// ❌ Never log sensitive data
logger.debug('User data', {
  password: user.password,  // Never!
  creditCard: user.cc        // Never!
});
```

## Migration Guide

### From Conditional Console.log

```typescript
// Before
if (process.env.NODE_ENV === 'development') {
  console.log('Scaffold: Current path changed to:', currentPath);
}

// After
import { loggers } from '@qwickapps/react-framework';
const logger = loggers.scaffold;
logger.debug('Current path changed to:', currentPath);
```

### From Custom Debug Flags

```typescript
// Before
const DEBUG = process.env.REACT_APP_DEBUG === 'true';
if (DEBUG) {
  console.log('Debug info:', data);
}

// After
import { createLogger } from '@qwickapps/react-framework';
const logger = createLogger('MyApp');
logger.debug('Debug info:', data);
```

## Troubleshooting

### Logs Not Appearing in Development

1. Check `NODE_ENV` is set to 'development'
2. Verify logger is imported correctly
3. Check browser console filters

### Logs Appearing in Production

1. Ensure `NODE_ENV` is set to 'production' during build
2. Consider using complete log stripping for production builds
3. Check for any console.log statements not using the logger

### TypeScript Issues

```typescript
// Ensure proper imports
import { loggers, createLogger, Logger } from '@qwickapps/react-framework';

// Type logger instances
const logger: Logger = createLogger('MyComponent');
```

## API Reference

### createLogger(namespace?: string): Logger

Creates a new logger instance with optional namespace.

### Logger Methods

- `debug(message: string, ...args: any[]): void` - Debug level logging
- `info(message: string, ...args: any[]): void` - Info level logging
- `warn(message: string, ...args: any[]): void` - Warning level logging
- `error(message: string, ...args: any[]): void` - Error level logging
- `group(label: string): void` - Start a console group
- `groupEnd(): void` - End a console group
- `time(label: string): void` - Start a timer
- `timeEnd(label: string): void` - End a timer and log duration
- `child(subNamespace: string): Logger` - Create a child logger

### Standalone Functions

- `devLog(namespace: string, message: string, ...args: any[]): void`
- `devWarn(namespace: string, message: string, ...args: any[]): void`
- `devError(namespace: string, message: string, ...args: any[]): void`

## Contributing

When adding new components or features to QwickApps React Framework:

1. Create or use appropriate namespaced logger
2. Use consistent log levels
3. Include relevant context in log messages
4. Test with both development and production builds
5. Document any new logger namespaces

## License

This software is licensed under the **PolyForm Shield License 1.0.0**.

### What This Means

**✅ Permitted Uses:**
- Internal business applications
- Learning and educational projects
- Non-competitive commercial applications
- Academic research and teaching
- Building applications that use this logging library

**❌ Prohibited Uses:**
- Creating competing logging frameworks
- Building competing developer tools
- Reselling or redistributing as a competing product
- Reverse engineering to create competitive products

For full license terms, see [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/).

For commercial licensing options, contact **legal@qwickapps.com**.

---

Copyright (c) 2025 QwickApps. All rights reserved.