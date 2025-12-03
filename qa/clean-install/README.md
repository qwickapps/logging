# Clean Environment Validation Test

This directory contains tests that validate `@qwickapps/logging` can be installed and used correctly in a completely clean environment.

## Purpose

Before publishing to npm, we need to ensure:

1. **All exports work** - Logger class, factory functions, types are properly exported
2. **TypeScript types resolve** - No missing type definitions
3. **Runtime functionality** - Logger actually logs messages
4. **Child loggers work** - Hierarchical logging functions correctly
5. **No hidden dependencies** - Package doesn't rely on monorepo internals

## Running the Validation

```bash
# From the package root
npm run validate:clean-install

# Or directly
./qa/clean-install/validate.sh
```

## What It Does

1. **Builds the package** - Creates npm tarball
2. **Runs Docker container** - Fresh Node.js environment
3. **Creates TypeScript project** - Standard TS setup
4. **Installs package** - From local tarball (like npm would)
5. **Compiles TypeScript** - Verifies types resolve
6. **Runs the code** - Verifies runtime functionality

If any step fails, the validation fails and publishing should be blocked.

## Test Application

The `test-app.ts` file tests major functionality:

- `Logger` class instantiation
- `getLogger()` factory function
- `createComponentLogger()` helper
- Default `logger` instance
- `commonLoggers` predefined loggers
- Child logger creation
- Custom `LogTransport` interface
- `LoggerOptions` type definitions

## Requirements

- Docker must be installed and running
- Package must be buildable (`npm run build` must pass)

## Troubleshooting

### "Cannot find module '@qwickapps/logging'"
The package wasn't installed correctly. Check the npm pack output.

### "Property 'info' does not exist"
The Logger class exports may be incorrect. Check src/index.ts.

### Runtime errors with pino
Pino is optional - the package should work without it in development mode.
