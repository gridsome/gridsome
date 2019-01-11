module.exports = {
  root: true,
  extends: [
    'plugin:node/recommended',
    'plugin:vue-libs/recommended'
  ],
  env: {
    jest: true
  },
  rules: {},
  overrides: [
    {
      files: [
        'gridsome.client.js'
      ],
      rules: {
        'node/no-unsupported-features/es-syntax': 'off'
      }
    },
    {
      files: [
        'scripts/**/*.js',
        '**/__tests__/**/*.js'
      ],
      rules: {
        'node/no-unpublished-require': 'off',
        'node/no-extraneous-require': 'off'
      }
    }
  ]
}
