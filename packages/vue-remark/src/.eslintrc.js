module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:vue/recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
    allowImportExportEverywhere: true
  },
  globals: {
    global: true,
    process: true,
    require: true
  },
  rules: {
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'comma-dangle': ['error', 'never'],
    'semi': ['error', 'never']
  }
}
