# Changelog

All notable changes to @qwickapps/logging will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-02-08

### Fixed

- **Critical**: Moved pino from devDependencies to dependencies to fix production deployment failures
  - Production environments don't install devDependencies, causing Pino initialization errors
  - Error: `TypeError: Cannot read properties of undefined (reading 'Symbol(pino.wildcardFirst)')`
  - This prevented migrations and seed scripts from running in deployed environments

### Changed

- Updated package.json to correctly list pino as a runtime dependency

## [1.0.2] - Previous Release

Initial stable release with production stripping and runtime environment detection.

## [1.0.1] - Previous Release

Bug fixes and improvements.

## [1.0.0] - Initial Release

First public release of @qwickapps/logging.
