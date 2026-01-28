const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

const flatconf = [
  ...nextCoreWebVitals,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
];

module.exports = flatconf;
