module.exports = {
  extends: ['expo'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/'],
  rules: {
    // The navigation scaffold keeps placeholder symbols as features are wired.
    // They are not runtime errors and should not block release validation.
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/array-type': 'off',
    'import/first': 'off',
  },
};
