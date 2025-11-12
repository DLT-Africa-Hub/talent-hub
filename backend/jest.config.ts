import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: false,
  collectCoverageFrom: [
    'controllers/**/*.ts',
    'middleware/**/*.ts',
    'models/**/*.ts',
    'services/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  resetMocks: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  testTimeout: 30000,
  maxWorkers: 1,
};

export default config;


