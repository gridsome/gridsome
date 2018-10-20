# @gridsome/plugin-critical

> Extracts & inlines critical-path (above-the-fold) CSS

## Install
- `yarn add @gridsome/plugin-critical`
- `npm install @gridsome/plugin-critical`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-critical',
      options: {
        paths: ['/'],
        width: 1300,
        height: 900
      }
    }
  ]
}
```
