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
      files: ["**/__tests__/**/*.js", "**/cli-test-utils/**/*.js"],
      rules: {
        "node/no-extraneous-require": "off"
      }
    }
  ]
}
