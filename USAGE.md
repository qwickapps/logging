# QwickApps Logging - Correct Usage

## Architecture

**Dual-Output System:**
- **Console**: Clean, operator-friendly messages (no metadata)
- **Pino/Logfire**: Full structured logs with all metadata

## How It Works

```typescript
import { getLogger } from '@qwickapps/logging';

const log = getLogger('MyService');

// ✅ log.debug() - ONLY goes to Pino/Logfire (never console)
log.debug('Connection initialized', { host: 'localhost', port: 5432 });
// Console: (nothing)
// Logfire: {"level":20,"msg":"Connection initialized","host":"localhost","port":5432}

// ✅ log.info() - Clean console + full Pino/Logfire
log.info('✓ Service ready', { port: 3000, env: 'production' });
// Console: 14:23:05 [MyService] ✓ Service ready
// Logfire: {"level":30,"msg":"✓ Service ready","port":3000,"env":"production"}

// ✅ log.warn() - Clean console + full Pino/Logfire
log.warn('High memory usage', { usage: '85%', threshold: '80%' });
// Console: 14:23:10 [MyService] High memory usage
// Logfire: {"level":40,"msg":"High memory usage","usage":"85%","threshold":"80%"}

// ✅ log.error() - Clean console + full Pino/Logfire
log.error('Database connection failed', { error: err, retries: 3 });
// Console: 14:23:15 [MyService] Database connection failed
// Logfire: {"level":50,"msg":"Database connection failed","err":{...},"retries":3}
```

## User Personas

### Tech Support / Operators
**What they see (console):**
```
14:23:05 [QwickForge.Service] ✓ Realtime service ready
14:23:06 [QwickForge.MCP] ✓ MCP server ready on port 8765
14:25:10 [QwickForge.Service] ⟳ Reconnecting to database in 4s
14:30:00 [QwickForge.Service] ✓ Database connected
```

**Characteristics:**
- Clean, single-line messages
- No metadata or variables
- Actionable information only
- Easy to read and understand

### Developers
**What they see (Logfire/Files):**
```json
{"level":30,"time":1696234985123,"ns":"QwickForge.Service","msg":"Realtime service ready","channels":3,"clients":0}
{"level":30,"time":1696234986456,"ns":"QwickForge.MCP","msg":"MCP server ready","port":8765,"transport":"http"}
{"level":40,"time":1696235110789,"ns":"QwickForge.Service","msg":"Reconnecting to database","attempt":2,"delay":4000}
{"level":30,"time":1696235400123,"ns":"QwickForge.Service","msg":"Database connected","latency":45}
```

**Characteristics:**
- Full JSON with all context
- Searchable and analyzable
- Complete error stack traces
- Metrics and performance data

## Configuration

### Environment Variables

```bash
# Minimum log level (default: debug in dev, info in prod)
LOG_LEVEL=debug

# Enable Logfire (outputs JSON to stdout for Logfire agent)
LOGFIRE_TOKEN=your-token
LOGFIRE_PROJECT=qwickapps

# Enable file logging
LOG_FILE=true
LOG_FILE_PATH=./logs/app.log

# Redact sensitive fields in structured logs
LOG_REDACT=password,apiKey,token
```

## Best Practices

### ✅ DO

```typescript
// Use debug for developer information (never shows on console)
log.debug('Request details', { method: 'POST', path: '/api/users', body: {...} });

// Use info for operator status + developer context
log.info('✓ Service started', { port: 3000, env: 'production', version: '1.0.0' });

// Keep console messages short and actionable
log.warn('High CPU usage - 90%');
log.error('Database connection lost');

// Include full context in metadata
log.error('Query failed', { query: sql, error: err, duration: 1250 });
```

### ❌ DON'T

```typescript
// Don't put debug info in info/warn/error messages
log.info('Service started with config: { port: 3000, db: "postgres://..." }'); // ❌

// Don't use info/warn for verbose operations
log.info(`Processing record ${i} of ${total}`); // ❌ Use debug

// Don't skip metadata - it goes to Logfire for analysis
log.error('Query failed'); // ❌ Missing context
log.error('Query failed', { query: sql, error: err }); // ✅
```

## Logfire Integration

### Setup

1. **Get Logfire Token**
   - Sign up at https://logfire.pydantic.dev
   - Create a project
   - Get your API token

2. **Configure Environment**
   ```bash
   export LOGFIRE_TOKEN=your-token-here
   export LOGFIRE_PROJECT=qwickapps
   export LOG_LEVEL=debug
   ```

3. **Run Your Service**
   - Structured logs (JSON) will go to stdout
   - Logfire agent/infrastructure captures and ships them
   - Clean messages still go to console for operators

### Verify

```bash
# Start your service
npm run dev

# You should see:
# - Clean console output for operators
# - JSON logs in Logfire dashboard
```

## Migration from Old Code

### No Changes Needed!

Your existing code continues to work:

```typescript
// This works as-is
log.info('Service ready');           // Clean console + structured log
log.debug('Details', { config });    // Structured log only (no console)
log.error('Failed', { error: err }); // Clean console + structured log
```

The difference is:
- **Before**: Everything went to console with metadata
- **Now**: Console is clean, metadata goes to Pino/Logfire

## Troubleshooting

### Console is noisy with metadata
This shouldn't happen anymore! If you see metadata on console, the package wasn't rebuilt. Run:
```bash
cd packages/qwickapps-logging && npm run build
```

### Not seeing logs in Logfire
1. Check `LOGFIRE_TOKEN` is set
2. Verify pino is installed: `npm install pino`
3. Check LOG_LEVEL includes the levels you want
4. Verify stdout JSON is being captured by Logfire infrastructure

### Too many console messages
Use `log.debug()` instead of `log.info()` for detailed information that operators don't need.

## Summary

| Method | Console Output | Pino/Logfire |
|--------|----------------|--------------|
| `log.debug()` | ❌ None | ✅ Full JSON with metadata |
| `log.info()` | ✅ Clean message only | ✅ Full JSON with metadata |
| `log.warn()` | ✅ Clean message only | ✅ Full JSON with metadata |
| `log.error()` | ✅ Clean message only | ✅ Full JSON with metadata |

**Perfect for:**
- ✅ Tech support monitoring console
- ✅ Developers analyzing in Logfire
- ✅ Production deployments
- ✅ Clean operational visibility
