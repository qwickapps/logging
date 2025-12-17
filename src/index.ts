/**
 * QwickApps Logger Wrapper
 *
 * Dual-Output Logging:
 * - log.debug()      → Pino/Logfire ONLY (never console)
 * - log.info()       → Clean console + Pino/Logfire with full metadata
 * - log.warn()       → Clean console + Pino/Logfire with full metadata
 * - log.error()      → Clean console + Pino/Logfire with full metadata
 *
 * Console Format: "HH:MM:SS [Namespace] Message" (no metadata)
 * Pino/Logfire: Full JSON with all context
 *
 * Env vars:
 *   LOG_LEVEL=<level>          -> minimum log level (default: debug in dev, info in prod)
 *   LOG_REDACT=field1,field2   -> pino redact list
 *   LOGFIRE_TOKEN=<token>      -> enable Logfire HTTP transport
 *   LOGFIRE_PROJECT=<project>  -> Logfire project name
 *   LOG_FILE=true              -> enable file logging
 *   LOG_FILE_PATH=<path>       -> file log path
 *
 * Copyright (c) QwickApps. All rights reserved.
 */

// Browser detection
const isBrowser = typeof window !== 'undefined';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Custom log transport interface for forwarding logs to external services
 */
export interface LogTransport {
  /**
   * Handle a log entry
   * @param level Log level
   * @param namespace Logger namespace
   * @param message Log message
   * @param context Additional context/metadata
   */
  handle(level: LogLevel, namespace: string, message: string, context?: Record<string, any>): void;
}

export interface LoggerOptions {
  namespace?: string;
  enabled?: boolean;  // force enable/disable (non-error levels)
  level?: LogLevel;   // minimum level for all logging (default: debug in dev, info in prod)
  bindings?: Record<string, any>;
  logDir?: string;         // log directory (default: './logs')
  logFileName?: string;    // log file name (default: 'app.log')
  disableConsole?: boolean; // disable console output (file/pino only)
  // Rotation options (when using pino)
  maxSize?: string;        // max file size before rotation (e.g., '10MB')
  maxFiles?: number;       // max number of rotated files to keep
  frequency?: 'daily' | 'hourly'; // rotation frequency
  // Custom log transports (e.g., for forwarding to remote log service)
  transports?: LogTransport[];
}

interface Backend {
  debug(obj: any, ...args: any[]): void;
  info(obj: any, ...args: any[]): void;
  warn(obj: any, ...args: any[]): void;
  error(obj: any, ...args: any[]): void;
  child(bindings: Record<string, any>): Backend;
}

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
const stripLogs = typeof process !== 'undefined' && process.env?.STRIP_LOGS === 'true';

// ----- Attempt to load pino (optional) -----
let pinoAvailable = false;
let pinoModule: any = null;

// Try to load pino synchronously first with require (for Node.js environments)
try {
  if (typeof require !== 'undefined') {
    pinoModule = require('pino');
    pinoAvailable = !!pinoModule;
  }
} catch {
  // Pino not available, fall back to console logging
  pinoAvailable = false;
}

// ----- Log file transport with rotation -----
const logFileEnabled = pinoAvailable &&
  process.env.LOG_FILE === 'true' &&
  !!process.env.LOG_FILE_PATH;

const isPlainObject = (v: any) =>
  v !== null && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null);

// ----- Logfire integration -----
const logfireEnabled = !isBrowser && !!process.env.LOGFIRE_TOKEN;

// ----- Create base pino logger if available -----
let basePino: any = null;
if (pinoAvailable) {
  const redact =
    (process.env.LOG_REDACT && process.env.LOG_REDACT.split(',').map(s => s.trim()).filter(Boolean)) || [];

  // Build pino configuration with transports
  const pinoConfig: any = {
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    redact,
    browser: { asObject: true },
    // Add service metadata for structured logging
    base: {
      pid: process.pid,
      hostname: process.env.HOSTNAME || require('os').hostname(),
      service: process.env.LOGFIRE_PROJECT || process.env.npm_package_name || 'qwickapps',
    }
  };

  // Use Pino transports for Logfire + File logging
  if (logfireEnabled || logFileEnabled) {
    const targets = [];

    // Logfire HTTP transport
    if (logfireEnabled) {
      targets.push({
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: 1, // stdout - structured JSON for Logfire agent
        }
      });
    }

    // File transport
    if (logFileEnabled) {
      targets.push({
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: process.env.LOG_FILE_PATH,
          mkdir: true
        }
      });
    }

    // Create transport
    if (typeof pinoModule.transport === 'function') {
      pinoConfig.transport = {
        targets
      };
    }
  }

  basePino = pinoModule(pinoConfig);

  // If Logfire is enabled, add custom transport for HTTP shipping
  if (logfireEnabled && typeof pinoModule.transport === 'function') {
    // Pino will output JSON to stdout - this can be:
    // 1. Captured by Logfire agent
    // 2. Or we can add HTTP transport (requires pino-http-send or similar)
    // For now, relying on stdout JSON capture by Logfire infrastructure
  }
}

// ----- Console formatter - clean output for operators -----
const formatConsoleMessage = (ns: string, msg: string): string => {
  const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
  return `${timestamp} [${ns}] ${msg}`;
};

const writeToConsole = (level: LogLevel, ns: string, msg: string): void => {
  const formatted = formatConsoleMessage(ns, msg);
  const method = level === 'debug' ? 'log' : level;
  // eslint-disable-next-line no-console
  (console as any)[method](formatted);
};

// ----- Fallback console backend (dev only - no pino) -----
// Note: This backend does NOT write to console - emit() handles that
const consoleBackendFactory = (ns: string): Backend => {
  const cb: Backend = {
    debug() {},
    info() {},
    warn() {},
    error() {},

    child(bindings: Record<string, any>) {
      const childNs = bindings?.ns ? `${ns}.${bindings.ns}` : ns;
      return consoleBackendFactory(childNs);
    },
  };
  return cb;
};

// ----- No-op backend (used when production w/o pino) -----
const noopBackend: Backend = {
  debug() { },
  info() { },
  warn() { },
  error() { },
  child() { return noopBackend; }
};

// ----- Build backend for a namespace -----
function buildBackend(namespace: string, extraBindings?: Record<string, any>): Backend {
  if (pinoAvailable && basePino) {
    return basePino.child({ ns: namespace, ...(extraBindings || {}) });
  }
  if (!isProd) {
    return consoleBackendFactory(namespace);
  }
  return noopBackend;
}

// Map desired level to numeric ordering (for manual gating in fallback)
const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Determine if a level should emit (only relevant for fallback & gating)
function levelEnabled(target: LogLevel, current: LogLevel) {
  return levelOrder[target] >= levelOrder[current];
}

export class Logger {
  private namespace: string;
  private enabled: boolean;
  private backend: Backend;
  private minLevel: LogLevel;
  private logDir: string;
  private logFileName: string;
  private disableConsole: boolean;
  private maxSize?: string;
  private maxFiles?: number;
  private frequency?: 'daily' | 'hourly';
  private children: Map<string, Logger> = new Map();
  private transports: LogTransport[];

  constructor(options: LoggerOptions = {}) {
    this.namespace = options.namespace || 'Anonymous';
    this.minLevel = options.level || (isProd ? 'info' : 'debug');
    this.logDir = options.logDir || './logs';
    this.logFileName = options.logFileName || 'app.log';
    this.disableConsole = options.disableConsole || false;
    this.maxSize = options.maxSize;
    this.maxFiles = options.maxFiles;
    this.frequency = options.frequency;
    this.transports = options.transports || [];
    this.backend = buildBackend(this.namespace, options.bindings);

    // Enabled rules:
    // - Strip logs disables all non-error
    // - In prod: require pino OR transports; if both missing -> disabled (non-error)
    // - options.enabled can force false
    const hasTransports = this.transports.length > 0;
    this.enabled = !stripLogs &&
      (options.enabled !== false) &&
      (!isProd || pinoAvailable || hasTransports);
  }

  private emit(level: LogLevel, message: string, args: any[], writeConsole: boolean = true) {
    if (level !== 'error') {
      if (!this.enabled) return;
      if (!pinoAvailable && !levelEnabled(level, this.minLevel)) return;
    }

    let context: Record<string, any> | undefined;
    // Support signature: logger.info("msg", { ...context }, extra1, extra2)
    if (args.length && isPlainObject(args[0]) && !(args[0] instanceof Error)) {
      context = args.shift();
    }

    let errObj: any;
    if (context?.error instanceof Error) {
      const e = context.error;
      errObj = {
        name: e.name,
        message: e.message,
        stack: e.stack,
      };
      delete context.error;
    }

    const entry: Record<string, any> = { msg: message };
    if (context) Object.assign(entry, context);
    if (errObj) entry.err = errObj;

    // 1. Structured logging to Pino/Logfire (always, with full context)
    (this.backend as any)[level](entry, ...args);

    // 2. Custom transports (e.g., remote log service)
    if (this.transports.length > 0) {
      try {
        for (const transport of this.transports) {
          transport.handle(level, this.namespace, message, { ...entry });
        }
      } catch (error) {
        // Silently fail - don't let transport errors break application
        console.error('[LogTransport] Error in custom transport:', error);
      }
    }

    // 3. Clean console output (info/warn/error only, no debug)
    // Respect disableConsole option
    if (writeConsole && level !== 'debug' && !this.disableConsole) {
      writeToConsole(level, this.namespace, message);
    }
  }

  /**
   * Debug: Structured logging ONLY (Pino/Logfire) - NO console output
   */
  debug(message: string, ...args: any[]) {
    this.emit('debug', message, args, false); // false = no console
  }

  /**
   * Info/Warn/Error: Clean console + structured logging with full metadata
   */
  info(message: string, ...args: any[]) {
    this.emit('info', message, args, true); // true = write to console
  }

  warn(message: string, ...args: any[]) {
    this.emit('warn', message, args, true);
  }

  error(message: string, ...args: any[]) {
    this.emit('error', message, args, true);
  }

  child(subNamespace: string, bindings?: Record<string, any>): Logger {
    const childKey = subNamespace;

    // Check if child already exists
    if (this.children.has(childKey)) {
      return this.children.get(childKey)!;
    }

    // Create new child logger (inherits transports from parent)
    const childLogger = new Logger({
      namespace: `${this.namespace}.${subNamespace}`,
      enabled: this.enabled,
      level: this.minLevel,
      logDir: this.logDir,
      logFileName: this.logFileName,
      disableConsole: this.disableConsole,
      maxSize: this.maxSize,
      maxFiles: this.maxFiles,
      frequency: this.frequency,
      transports: this.transports, // Inherit transports from parent
      bindings
    });

    // Set parent-child relationship (future: add hierarchical logging support)
    this.children.set(childKey, childLogger);

    return childLogger;
  }

  setConfig(config: Partial<LoggerOptions>): void {
    // Update this logger's configuration
    if (config.logDir !== undefined) this.logDir = config.logDir;
    if (config.logFileName !== undefined) this.logFileName = config.logFileName;
    if (config.disableConsole !== undefined) this.disableConsole = config.disableConsole;
    if (config.maxSize !== undefined) this.maxSize = config.maxSize;
    if (config.maxFiles !== undefined) this.maxFiles = config.maxFiles;
    if (config.frequency !== undefined) this.frequency = config.frequency;
    if (config.level !== undefined) this.minLevel = config.level;
    if (config.enabled !== undefined) {
      // Allow enabled=true if transports are provided, even without pino
      const hasTransports = (config.transports && config.transports.length > 0) || this.transports.length > 0;
      this.enabled = !stripLogs && config.enabled && (!isProd || pinoAvailable || hasTransports);
    }
    if (config.transports !== undefined) {
      this.transports = config.transports;
      // Auto-enable in production when transports are provided
      // This ensures FileLogTransport works even without pino
      if (this.transports.length > 0 && !this.enabled && !stripLogs) {
        this.enabled = true;
      }
    }

    // Propagate configuration to all children
    this.children.forEach(child => {
      child.setConfig(config);
    });
  }

  with(bindings: Record<string, any>): Logger {
    return new Logger({
      namespace: this.namespace,
      enabled: this.enabled,
      level: this.minLevel,
      logDir: this.logDir,
      logFileName: this.logFileName,
      disableConsole: this.disableConsole,
      maxSize: this.maxSize,
      maxFiles: this.maxFiles,
      frequency: this.frequency,
      bindings
    });
  }

  isUsingPino(): boolean {
    return pinoAvailable;
  }
}

// ----- Hierarchical Logger Registry -----
const loggerRegistry = new Map<string, Logger>();

/**
 * Get or create a hierarchical logger
 * Examples:
 *   getLogger("QwickForge") → creates root logger
 *   getLogger("QwickForge.Core") → creates QwickForge/Core child
 *   getLogger("QwickForge.ConfigManager") → creates QwickForge/ConfigManager child
 */
export function getLogger(path: string): Logger {
  if (loggerRegistry.has(path)) {
    return loggerRegistry.get(path)!;
  }

  const parts = path.split('.');
  const rootName = parts[0];

  // Create or get root logger
  if (!loggerRegistry.has(rootName)) {
    const rootLogger = new Logger({ namespace: rootName });
    loggerRegistry.set(rootName, rootLogger);
  }

  let currentLogger = loggerRegistry.get(rootName)!;
  let currentPath = rootName;

  // Walk down the hierarchy, creating children as needed
  for (let i = 1; i < parts.length; i++) {
    const childName = parts[i];
    currentPath += `.${childName}`;

    if (!loggerRegistry.has(currentPath)) {
      const childLogger = currentLogger.child(childName);
      loggerRegistry.set(currentPath, childLogger);
    }

    currentLogger = loggerRegistry.get(currentPath)!;
  }

  return currentLogger;
}

/**
 * Default/root logger
 */
export const logger = getLogger('QwickApps');

// Optional: expose a helper to create a child/component logger similar to previous logger.ts
export function createComponentLogger(component: string) {
  return logger.child(component);
}

export function flushLogs() {
  try {
    if (pinoAvailable && basePino && typeof basePino.flush === 'function') {
      basePino.flush();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Common namespaced loggers
 */
export const commonLoggers = {
  app: logger.child('App'),
  api: logger.child('API'),
  auth: logger.child('Auth'),
  data: logger.child('Data'),
  ui: logger.child('UI'),
  perf: logger.child('Performance'),
  error: logger.child('Error'),
  debug: logger.child('Debug'),
};

// NOTE: StartupLogger is NOT re-exported here to keep the main entry browser-compatible.
// For Node.js apps that need StartupLogger, import from '@qwickapps/logging/startup' instead.
// Example: import { StartupLogger, getStartupLogger } from '@qwickapps/logging/startup';