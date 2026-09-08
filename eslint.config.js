const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/', '.expo/', 'android/', 'ios/', 'UI/', '.cursor/', 'components/', 'jest.setup.js', 'scripts/', 'modules/'],
  },
];
