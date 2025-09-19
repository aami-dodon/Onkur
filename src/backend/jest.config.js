const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..', '..'),
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/backend'],
  moduleDirectories: ['node_modules', '<rootDir>/src/backend/node_modules', '<rootDir>/src/backend/src'],
  moduleNameMapper: {
    '^config$': '<rootDir>/src/backend/src/config',
  },
  transform: {},
  clearMocks: true,
};
