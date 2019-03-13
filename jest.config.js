module.exports = {
  verbose: true,
  collectCoverage: true,
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.js',
    '!.eslintrc.js',
    '!jest.config.js',
    '!**/tests/**',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**'
  ]
}
