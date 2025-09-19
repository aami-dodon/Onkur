module.exports = {
  root: true,
  env: {
    node: true,
    commonjs: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:jest/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  plugins: ['jest'],
  rules: {
    'jest/expect-expect': 'warn',
  },
};
