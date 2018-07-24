module.exports = {
  verbose: true,
  collectCoverage: true,
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
