const js = require('@eslint/js');
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  security.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-implicit-globals': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-implicit-globals': 'error',
    },
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ClockMath: 'writable',
        ClockView: 'writable',
        ClockDrag: 'writable',
        TaskManager: 'writable',
        UI: 'writable',
        Settings: 'writable',
        AppointmentReminder: 'writable',
        Gamification: 'writable',
        TaskTimer: 'writable',
      },
    },
    rules: {
      'no-redeclare': 'off',
    },
  },
];
