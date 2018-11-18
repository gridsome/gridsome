module.exports = {
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
