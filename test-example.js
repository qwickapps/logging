#!/usr/bin/env node
/**
 * Test example showing dual-output logging
 *
 * Run with: node test-example.js
 *
 * Expected output:
 * - Console: Clean messages only (no metadata)
 * - If pino installed: Structured JSON to stdout/logfire
 */

import { getLogger } from './dist/index.js';

const log = getLogger('TestService');

console.log('=== Starting Logging Test ===\n');
console.log('Console should show clean messages only');
console.log('Pino/Logfire gets full JSON with metadata\n');

// Test debug (should NOT appear on console)
console.log('--- Testing log.debug() ---');
log.debug('This is debug info', { config: { port: 3000 }, env: 'test' });
console.log('(debug should not appear above)\n');

// Test info (clean console + structured log)
console.log('--- Testing log.info() ---');
log.info('✓ Service initialized', { port: 3000, version: '1.0.0' });
console.log();

// Test warn (clean console + structured log)
console.log('--- Testing log.warn() ---');
log.warn('High memory usage', { usage: '85%', threshold: '80%' });
console.log();

// Test error (clean console + structured log)
console.log('--- Testing log.error() ---');
const fakeError = new Error('Connection timeout');
log.error('Database connection failed', { error: fakeError, retries: 3 });
console.log();

console.log('=== Test Complete ===');
console.log('\nExpected console output:');
console.log('  HH:MM:SS [TestService] ✓ Service initialized');
console.log('  HH:MM:SS [TestService] High memory usage');
console.log('  HH:MM:SS [TestService] Database connection failed');
console.log('\n(No debug message should appear)\n');

if (log.isUsingPino()) {
  console.log('✓ Pino is available - structured logs will be sent to Logfire/files');
} else {
  console.log('⚠ Pino not available - falling back to console-only mode');
  console.log('  Install pino: npm install pino');
}
