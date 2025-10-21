module.exports = {
  env: {
    node: true,
    es2021: true,
    browser: true,
  },
  extends: ['eslint:recommended', 'plugin:security/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['security'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]' },
    ],
    'no-implicit-globals': 'off',
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
  },
  overrides: [
    {
      files: ['src/**/*.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-implicit-globals': 'error',
      },
    },
  ],
};
