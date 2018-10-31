module.exports = {
  extends: [
    "plugin:node/recommended"
  ],
  env: {
    "jest": true
  },
  rules: {
    "indent": ["error", 2, {
      "MemberExpression": "off",
      "SwitchCase": 1
    }]
  },
  overrides: [
    {
      files: [
        "scripts/**/*.js",
        "**/__tests__/**/*.js"
      ],
      rules: {
        "node/no-unpublished-require": "off",
        "node/no-extraneous-require": "off"
      }
    }
  ]
}
