import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';

// Check if we should strip logs completely
const stripLogs = process.env.STRIP_LOGS === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Shared plugins configuration
const createPlugins = () => [
  // Replace environment variables for browser-safe build
  replace({
    preventAssignment: true,
    delimiters: ['', ''],
    values: {
      'process.env?.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env?.STRIP_LOGS': JSON.stringify(stripLogs ? 'true' : 'false'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.STRIP_LOGS': JSON.stringify(stripLogs ? 'true' : 'false'),
      'process.env.LOG_FILE': JSON.stringify('false'),
      'process.env.LOG_FILE_PATH': JSON.stringify(''),
      'process.env.LOGFIRE_TOKEN': JSON.stringify(''),
      'process.env.LOG_REDACT': JSON.stringify(''),
      'process.env.LOG_LEVEL': JSON.stringify('debug'),
      'process.env.HOSTNAME': JSON.stringify('browser'),
      'process.env.LOGFIRE_PROJECT': JSON.stringify(''),
      'process.env.npm_package_name': JSON.stringify('qwickapps'),
      'process.pid': '0',
      "require('os').hostname()": JSON.stringify('browser')
    }
  }),
  babel({
    babelHelpers: 'bundled',
    include: ['src/**/*'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    exclude: 'node_modules/**'
  }),
  resolve({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: 'dist'
  })
];

export default [
  // Main entry point (browser-compatible - no fs/path imports)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        exports: 'named'
      },
      {
        file: 'dist/index.js',
        format: 'esm',
        exports: 'named'
      }
    ],
    external: (id) => {
      // No external dependencies for the main logging package
      return false;
    },
    plugins: createPlugins()
  },
  // Startup entry point (Node.js only - has fs/path imports)
  {
    input: 'src/startup.ts',
    output: [
      {
        file: 'dist/startup.cjs',
        format: 'cjs',
        exports: 'named'
      },
      {
        file: 'dist/startup.js',
        format: 'esm',
        exports: 'named'
      }
    ],
    external: ['fs', 'path'], // Keep fs/path as external for Node.js
    plugins: [
    // Replace environment variables for browser-safe build
    replace({
      preventAssignment: true,
      delimiters: ['', ''],
      values: {
        'process.env?.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env?.STRIP_LOGS': JSON.stringify(stripLogs ? 'true' : 'false'),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.STRIP_LOGS': JSON.stringify(stripLogs ? 'true' : 'false'),
        'process.env.LOG_FILE': JSON.stringify('false'),
        'process.env.LOG_FILE_PATH': JSON.stringify(''),
        'process.env.LOGFIRE_TOKEN': JSON.stringify(''),
        'process.env.LOG_REDACT': JSON.stringify(''),
        'process.env.LOG_LEVEL': JSON.stringify('debug'),
        'process.env.HOSTNAME': JSON.stringify('browser'),
        'process.env.LOGFIRE_PROJECT': JSON.stringify(''),
        'process.env.npm_package_name': JSON.stringify('qwickapps'),
        'process.pid': '0',
        "require('os').hostname()": JSON.stringify('browser')
      }
    }),
    babel({
      babelHelpers: 'bundled',
      include: ['src/**/*'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      exclude: 'node_modules/**'
    }),
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist'
    })
    ]
  }
];