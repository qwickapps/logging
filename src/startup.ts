/**
 * Startup Logger
 *
 * File-based startup logging that works independently of Pino/database.
 * Use this during application bootstrap before main logging is configured.
 *
 * Features:
 * - Always writes to file (./logs/startup.log by default)
 * - Independent of Pino/Logfire - works even if they fail
 * - Structured phase markers (CONFIG, DATABASE, PAYLOAD, READY)
 * - AI-friendly JSON output for diagnostics
 *
 * Copyright (c) 2025 QwickApps.com. All rights reserved.
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync, statSync } from 'fs';
import { dirname, resolve } from 'path';

export type StartupPhase =
  | 'INIT'
  | 'CONFIG'
  | 'DATABASE'
  | 'PAYLOAD'
  | 'PLUGINS'
  | 'SERVER'
  | 'READY'
  | 'ERROR'
  | 'SHUTDOWN';

export type StartupLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StartupLogEntry {
  timestamp: string;
  level: StartupLogLevel;
  phase: StartupPhase;
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface StartupLoggerConfig {
  logPath?: string;
  maxFileSize?: number; // bytes, default 5MB
  maxBackups?: number; // number of backup files to keep
  includeEnv?: boolean; // include env vars in startup log
  envWhitelist?: string[]; // only include these env vars
  envBlacklist?: string[]; // never include these env vars
}

const DEFAULT_CONFIG: Required<StartupLoggerConfig> = {
  logPath: './logs/startup.log',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxBackups: 3,
  includeEnv: true,
  envWhitelist: [],
  envBlacklist: [
    'PAYLOAD_SECRET',
    'DATABASE_PASSWORD',
    'API_KEY',
    'SECRET',
    'TOKEN',
    'PASSWORD',
    'PRIVATE_KEY',
  ],
};

export class StartupLogger {
  private config: Required<StartupLoggerConfig>;
  private startTime: number;
  private currentPhase: StartupPhase = 'INIT';
  private phaseStartTime: number;
  private phases: Map<StartupPhase, { start: number; end?: number }> = new Map();

  constructor(config: StartupLoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.phaseStartTime = this.startTime;

    // Ensure log directory exists
    this.ensureLogDir();

    // Rotate if needed
    this.rotateIfNeeded();

    // Write startup header
    this.writeHeader();
  }

  private ensureLogDir(): void {
    const logDir = dirname(resolve(this.config.logPath));
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  private rotateIfNeeded(): void {
    const logPath = resolve(this.config.logPath);

    if (!existsSync(logPath)) {
      return;
    }

    try {
      const stats = statSync(logPath);
      if (stats.size < this.config.maxFileSize) {
        return;
      }

      // Rotate files
      for (let i = this.config.maxBackups - 1; i >= 0; i--) {
        const current = i === 0 ? logPath : `${logPath}.${i}`;
        const next = `${logPath}.${i + 1}`;

        if (existsSync(current)) {
          if (i === this.config.maxBackups - 1) {
            // Delete oldest
            try {
              require('fs').unlinkSync(current);
            } catch {
              // Ignore
            }
          } else {
            // Rename
            try {
              require('fs').renameSync(current, next);
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch {
      // If rotation fails, continue anyway
    }
  }

  private writeHeader(): void {
    const header = {
      type: 'STARTUP_BEGIN',
      timestamp: new Date(this.startTime).toISOString(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      cwd: process.cwd(),
      env: this.config.includeEnv ? this.getSafeEnv() : undefined,
    };

    const separator = '\n' + '='.repeat(80) + '\n';
    const content = separator + JSON.stringify(header, null, 2) + '\n';

    appendFileSync(resolve(this.config.logPath), content);
  }

  private getSafeEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    const blacklistPatterns = this.config.envBlacklist.map((p) => p.toLowerCase());

    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;

      // Check whitelist (if provided)
      if (this.config.envWhitelist.length > 0) {
        if (!this.config.envWhitelist.includes(key)) {
          continue;
        }
      }

      // Check blacklist
      const keyLower = key.toLowerCase();
      const isBlacklisted = blacklistPatterns.some(
        (pattern) => keyLower.includes(pattern)
      );

      if (isBlacklisted) {
        env[key] = '[REDACTED]';
      } else {
        env[key] = value;
      }
    }

    return env;
  }

  /**
   * Log a startup event
   */
  log(level: StartupLogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: StartupLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      phase: this.currentPhase,
      message,
      duration: Date.now() - this.startTime,
      metadata,
    };

    this.writeEntry(entry);
  }

  /**
   * Log an error with stack trace
   */
  logError(message: string, error: Error, metadata?: Record<string, unknown>): void {
    const entry: StartupLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      phase: this.currentPhase,
      message,
      duration: Date.now() - this.startTime,
      metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    this.writeEntry(entry);
  }

  /**
   * Start a new phase
   */
  startPhase(phase: StartupPhase, message?: string): void {
    // Close previous phase
    if (this.phases.has(this.currentPhase)) {
      const prev = this.phases.get(this.currentPhase)!;
      prev.end = Date.now();
    }

    this.currentPhase = phase;
    this.phaseStartTime = Date.now();
    this.phases.set(phase, { start: this.phaseStartTime });

    this.log('info', message || `Starting phase: ${phase}`);
  }

  /**
   * Complete current phase
   */
  completePhase(message?: string): void {
    const phaseDuration = Date.now() - this.phaseStartTime;

    if (this.phases.has(this.currentPhase)) {
      const current = this.phases.get(this.currentPhase)!;
      current.end = Date.now();
    }

    this.log('info', message || `Phase ${this.currentPhase} completed`, {
      phaseDuration,
    });
  }

  /**
   * Mark startup as complete
   */
  complete(message?: string): void {
    const totalDuration = Date.now() - this.startTime;

    this.startPhase('READY');

    const summary = {
      type: 'STARTUP_COMPLETE',
      timestamp: new Date().toISOString(),
      totalDuration,
      phases: Object.fromEntries(
        Array.from(this.phases.entries()).map(([phase, timing]) => [
          phase,
          timing.end ? timing.end - timing.start : 'incomplete',
        ])
      ),
    };

    this.log('info', message || 'Application startup complete', summary);

    const separator = '\n' + '='.repeat(80) + '\n';
    appendFileSync(resolve(this.config.logPath), separator);
  }

  /**
   * Mark startup as failed
   */
  fail(error: Error, message?: string): void {
    this.startPhase('ERROR');
    this.logError(message || 'Startup failed', error);

    const summary = {
      type: 'STARTUP_FAILED',
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      error: {
        name: error.name,
        message: error.message,
      },
    };

    appendFileSync(
      resolve(this.config.logPath),
      '\n' + JSON.stringify(summary, null, 2) + '\n'
    );
  }

  private writeEntry(entry: StartupLogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(resolve(this.config.logPath), line);

    // Also write to console for visibility
    const prefix = `[${entry.phase}]`;
    const levelPrefix = entry.level.toUpperCase().padEnd(5);
    console.log(`${levelPrefix} ${prefix} ${entry.message}`);

    if (entry.error) {
      console.error(entry.error.stack || entry.error.message);
    }
  }

  /**
   * Read the startup log file
   */
  readLog(): string {
    const logPath = resolve(this.config.logPath);
    if (!existsSync(logPath)) {
      return '';
    }
    return readFileSync(logPath, 'utf-8');
  }

  /**
   * Parse the startup log file into entries
   */
  parseLog(): StartupLogEntry[] {
    const content = this.readLog();
    const entries: StartupLogEntry[] = [];

    for (const line of content.split('\n')) {
      if (line.startsWith('{')) {
        try {
          const entry = JSON.parse(line);
          if (entry.level && entry.phase && entry.message) {
            entries.push(entry);
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    return entries;
  }

  /**
   * Get diagnostic info for AI agents
   */
  getDiagnostics(): {
    entries: StartupLogEntry[];
    errors: StartupLogEntry[];
    phases: Record<string, number | string>;
    status: 'success' | 'failed' | 'in_progress';
  } {
    const entries = this.parseLog();
    const errors = entries.filter((e) => e.level === 'error');

    const hasReady = entries.some((e) => e.phase === 'READY');
    const hasFailed = entries.some((e) => e.phase === 'ERROR');

    return {
      entries: entries.slice(-100), // Last 100 entries
      errors,
      phases: Object.fromEntries(
        Array.from(this.phases.entries()).map(([phase, timing]) => [
          phase,
          timing.end ? timing.end - timing.start : 'incomplete',
        ])
      ),
      status: hasFailed ? 'failed' : hasReady ? 'success' : 'in_progress',
    };
  }
}

// Global instance
let globalStartupLogger: StartupLogger | null = null;

/**
 * Get or create the global startup logger
 */
export function getStartupLogger(config?: StartupLoggerConfig): StartupLogger {
  if (!globalStartupLogger) {
    globalStartupLogger = new StartupLogger(config);
  }
  return globalStartupLogger;
}

/**
 * Create a fresh startup logger (resets the global instance)
 */
export function createStartupLogger(config?: StartupLoggerConfig): StartupLogger {
  globalStartupLogger = new StartupLogger(config);
  return globalStartupLogger;
}
