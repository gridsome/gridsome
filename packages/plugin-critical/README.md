# Extracts & inlines critical-path (above-the-fold) CSS for Gridsome sites

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-critical',
      options: {
        paths: ['index.html'],
        width: 1300,
        height: 900
      }
    }
  ]
}
```
