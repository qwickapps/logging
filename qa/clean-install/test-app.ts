/**
 * Clean Environment Validation Test
 *
 * This file tests that @qwickapps/logging can be imported and used
 * correctly in a fresh TypeScript/Node.js project.
 *
 * It validates:
 * - All major exports are available
 * - TypeScript types work correctly
 * - Logger class functions properly
 * - Child loggers work
 */
import {
  // Main Logger class
  Logger,

  // Factory functions
  getLogger,
  createComponentLogger,

  // Default logger instance
  logger,

  // Common loggers
  commonLoggers,

  // Types
  type LogLevel,
  type LoggerOptions,
  type LogTransport,

  // Utility
  flushLogs,
} from '@qwickapps/logging';

/**
 * Test 1: Create a custom logger
 */
function testCustomLogger(): void {
  const customLogger = new Logger({
    namespace: 'TestApp',
    level: 'debug',
  });

  customLogger.info('Custom logger created successfully');
  customLogger.debug('Debug message (may not appear in console)');
  customLogger.warn('Warning message');
}

/**
 * Test 2: Use the default logger
 */
function testDefaultLogger(): void {
  logger.info('Using default QwickApps logger');
}

/**
 * Test 3: Create child loggers
 */
function testChildLoggers(): void {
  const parentLogger = getLogger('MyApp');
  const childLogger = parentLogger.child('Database');

  parentLogger.info('Parent logger message');
  childLogger.info('Child logger message');
}

/**
 * Test 4: Use common loggers
 */
function testCommonLoggers(): void {
  commonLoggers.app.info('App logger message');
  commonLoggers.api.info('API logger message');
  commonLoggers.auth.info('Auth logger message');
}

/**
 * Test 5: Create component logger
 */
function testComponentLogger(): void {
  const componentLogger = createComponentLogger('MyComponent');
  componentLogger.info('Component logger message');
}

/**
 * Test 6: Custom transport (type check only)
 */
function testCustomTransport(): void {
  const customTransport: LogTransport = {
    handle(level: LogLevel, namespace: string, message: string, context?: Record<string, unknown>): void {
      // Custom handling - just log to console for test
      console.log(`[CustomTransport] ${level}: ${namespace} - ${message}`);
    }
  };

  const loggerWithTransport = new Logger({
    namespace: 'TransportTest',
    transports: [customTransport],
  });

  loggerWithTransport.info('Message with custom transport');
}

/**
 * Test 7: Logger options (type check)
 */
function testLoggerOptions(): void {
  const options: LoggerOptions = {
    namespace: 'OptionsTest',
    enabled: true,
    level: 'info',
    logDir: './logs',
    logFileName: 'test.log',
    disableConsole: false,
  };

  const optionsLogger = new Logger(options);
  optionsLogger.info('Logger with full options');
}

// Run tests
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  @qwickapps/logging - Clean Environment Test                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

testCustomLogger();
testDefaultLogger();
testChildLoggers();
testCommonLoggers();
testComponentLogger();
testCustomTransport();
testLoggerOptions();

// Flush any pending logs
flushLogs();

console.log('');
console.log('✅ All tests passed! Package works correctly in clean environment.');
