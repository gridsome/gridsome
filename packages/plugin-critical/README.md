# @gridsome/plugin-critical

> Extracts & inlines critical-path (above-the-fold) CSS

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-critical',
      options: {
        paths: ['index.html'], // ['**/*.html'] for all pages
        width: 1300,
        height: 900
      }
    }
  ]
}
```
